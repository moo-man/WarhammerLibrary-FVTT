const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
import DraggableApp from "../draggable";

export class BaseCharacterCreationStage extends DraggableApp(HandlebarsApplicationMixin(ApplicationV2))
{

    static DEFAULT_OPTIONS = 
        {
            tag: "form",
            classes : ["warhammer", "character-creation-stage"],
            window : {
                title : "WH.CharacterCreation.Stage",
                contentClasses : ["standard-form"]
            },
            position : {

            },
            actions : {
            },
            form: {
                handler: this.submit,
                submitOnChange: false,
                closeOnSubmit: true
            },
            dragDrop: []
        };

    static PARTS = {
        stage : { template : "" },
        footer : {
            template : "templates/generic/form-footer.hbs"
        }
    };

    constructor(actor, args, context, options)  
    {
        super(options);
        this.actor = actor;
        this.context = context;
        this.data = context.data || {};
        this.handleStageArgs(args);
    }
    
    static start(actor, species, context, options)
    {
        return new this(actor, species, context, options);
    }

    async _prepareContext(options)
    {
        let context = await super._prepareContext(options);
        context.rootId = this.id;
        context.data = this.data;
        context.buttons = [{ type: "submit", label: "Submit" }];
        return context;
    }

    async _onRender(options)
    {
        await super._onRender(options);
        this._addEventListeners();
    }

    _addEventListeners()
    {
        
    }

    updateMessage()
    {

    }

    showError()
    {
        
    }

    /**
     * @abstract
     */
    async validateStart() {}

    /**
     * @abstract
     */
    async validateSubmit() {}

    /**
     * @abstract
     */
    handleStageArgs(args)
    {

    }

    /**
     * @abstract
     */
    async getStageResults()
    {
        await this.validateSubmit();
    }
    
    static async submit(event, form, formData)
    {
        this.options.complete(this.options.id, await this.getStageResults(formData));
    }
}





