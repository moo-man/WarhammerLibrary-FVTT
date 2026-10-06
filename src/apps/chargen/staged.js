import { localize, format } from "../../util/utility";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class StagedCharacterCreation extends HandlebarsApplicationMixin(ApplicationV2)
{

    static DEFAULT_OPTIONS = 
        {
            tag: "form",
            classes : ["warhammer", "character-creation", "staged"],
            id: "character-creation",
            window : {
                title : "WH.CharacterCreation.Title",
                contentClasses : ["standard-form"],
                frame: false,
                positioned: false
            },
            position : {

            },
            actions : {
                startStage: this._onStartStage,
                resetStage: this._onResetStage,
                close: this._onClose
            },
            form: {
                handler: this.submit
            },
        };

    stages = {}; // {id: {app, dependsOn, title}}
    stageContext = {}; // {id: {completed: false, instance: null, dependsOn}
    stageOrder = [];
    stageResults = {};

    _activeStage = null;
    
    // static PARTS = {
    //     buttons : {template : ""},
    //     overview: { template: this.configTemplate },
    //     effects : { template : "modules/warhammer-lib/templates/apps/zone-effects.hbs" },
    //     footer : {
    //         template : "templates/generic/form-footer.hbs"
    //     }
    // };

    constructor(options)  
    {
        super(options);
        this.#setupStages();
    }

    /**
     * Call downstream stage setup as well as hook for any modifications done by modules
     */
    #setupStages()
    {
        this._setupStages();
        Hooks.on(game.system.id, "createCharacterCreationStages", {app: this, stages: this.stages, stageContext: this.stageContext, stageOrder: this.stageOrder});
        for(let id in this.stages)
        {
            this.stageContext[id] = {
                completed: false,
                instance: null
            };
        }
    }

    addStage(id, cls, {dependsOn, order, title}={})
    {
        if (id && cls)
        {
            this.stages[id] = {app: cls, dependsOn, title};
            if (typeof order == "number")
            {
                this.stageOrder.splice(order, 0, id);
            }
            else
            {
                this.stageOrder.push(order);
            }
        }
    }

    /**
     * @abstract
     * Setup stage data
     * this.stages: applications and dependencies
     * this.stageContext: status of stage (if completed, app instance)
     * this.stageOrder: array denoting the displayed order of stages
     * this.stageResults: data from completion of the stage
     */
    _setupStages()
    {
    }

    /**
     * Renders a stage's app, provided the dependencies are completed
     * 
     * @param {String} id string key for what stage to start
     */
    startStage(id)
    {
        try 
        {
            let stage = this.stages[id];

            if (!stage)
            {
                throw Error("No stage defined with " + id);
            }
            if (stage.dependsOn.length)
            {
                let uncompletedDependencies = stage.dependsOn.map(id => this.stageContext[id]).filter(dependency => !dependency.completed);
                if (uncompletedDependencies.length)
                {
                    let err = format("WH.CharacterCreation.UncompletedDependencies", {stage: stage.title, dependencies: uncompletedDependencies.map(i => i.title).join(", ")});
                    throw Error(err);
                }
            }

            this._activeStage = id;

            if (stage.instance)
            {
                stage.instance.render({force: true}).then(() => 
                {
                    this.render({force: true});
                });
            }
            else 
            {
                let args = this.getArgsForStage(id);
                stage.instance = stage.app.start({}, args, this.stageContext[id], {id, complete: this.completeStage.bind(this)});
                stage.instance.render({force: true}).then(() => 
                {
                    this.render({force: true});
                });
            }
        }
        catch(e)
        {
            ui.notifications.error(e);
            console.error(e.trace);
        }
    }

    getArgsForStage(stageId)
    {
        return null;
    }

    completeStage(id, result)
    {
        this.stageContext[id].completed = true;
        this.stageResults[id] = result;
        this._activeStage = null;
        this.render({force: true});
        // let nextStageIndex = Object.keys(this.stages).findIndex(i => i == id) + 1;
        // if (nextStageIndex < Object.keys(this.stages).length)
        // {
        //     this.startStage(Object.keys(this.stages)[nextStageIndex]);
        // }
    }

    resetStage(id)
    {
        delete this.stageResults[id];
        // Remove this stage's results as well as any stage that depends on it
        for(let _id in Object.keys(this.stages).filter(_id => _id != id))
        {
            if (this.stages[_id].dependsOn.includes(id))
            {
                delete this.stageResults[_id];
            }
        }
        this.render({force: true});
    }
    
    async _preparePartContext(partId, context) 
    {
        context.partId = `${this.id}-${partId}`;

        let fn = this[`_prepare${partId.capitalize()}Context`]?.bind(this);
        if (typeof fn == "function")
        {
            fn(context);
        }

        return context;
    }

    async _prepareContext(options)
    {
        let context = await super._prepareContext(options);
        return context;
    }

    async _onRender(options)
    {
        await super._onRender(options);
        await this._renderStage();
    }

    async _onFirstRender(options)
    {
        super._onFirstRender(options);
        this.startStage(Object.keys(this.stages)[0]);
    }

    async _renderStage()
    {
        if (this._activeStage)
        {
            let instance = this.stages[this._activeStage]?.instance;
            if (instance?.element)
            {
                this.element.querySelector(".active-stage").appendChild(instance.element);
            }
        }
        else 
        {
            this.element.querySelector(".active-stage").appendChild(await this.getCharacterHTML());
        }
    }

    async getCharacterHTML()
    {
    }

    compileResults()
    {
        let compiled = {};
        let items = [];

        for (let result of Object.values(this.stageResults))
        {
            items = items.concat(result.items || []);
            let flattened = foundry.utils.flattenObject(result);
            for(let key in flattened)
            {
                if (key == "items") 
                {
                    continue;
                }
                if (compiled[key])
                {
                    if (typeof compiled[key] == "number")
                    {
                        compiled[key] += flattened[key];
                    }
                    else 
                    {
                        compiled[key] = flattened[key];
                    }
                }
                else 
                {
                    compiled[key] = flattened[key];
                }
            }
        }

        compiled = foundry.utils.expandObject(compiled);
        if (!compiled.name)
        {
            compiled.name = "New Character";
        }
        compiled.items = items;
        return compiled;
    }

    // Subclasses should define type and other system specific things
    compileCharacter()
    {
        return new Actor.implementation(foundry.utils.mergeObject(this.compileResults(), this.getSystemData()));
    }

    getSystemData()
    {
        return {};
    }

    static _onStartStage(ev, target)
    {
        this.startStage(target.dataset.stage);
    }
    
    static _onResetStage(ev, target)
    {
        this.resetStage(target.dataset.stage);
    }

    static _onClose(ev, target)
    {
        this.close();
    }

    static async submit(ev, target, formData)
    {
        if (this._activeStage)
        {
            this.completeStage(this._activeStage, await this.stages[this._activeStage].instance.getStageResults(new foundry.applications.ux.FormDataExtended(this.stages[this._activeStage].instance.element)));
        }
    }
}