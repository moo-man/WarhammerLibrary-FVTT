const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ApplicationV2 } = foundry.applications.api;
export default class ChoiceDecision extends HandlebarsApplicationMixin(ApplicationV2) 
{

    static DEFAULT_OPTIONS = {
        tag : "form",
        classes: ["choice-decision", "warhammer"],
        form : {
            handler : this.submit,
            submitOnChange : false,
            closeOnSubmit : true
        },
        window: {
            resizable : true,
            title : "WH.Choice.Choices",
            contentClasses: ["standard-form"]
        },
        actions : {
            chooseOption : this._onChooseOption
        }
    };

    static PARTS = {
        form: {
            template: "modules/warhammer-lib/templates/apps/choice-decision.hbs"
        },
        footer : {
            template : "templates/generic/form-footer.hbs"
        }
    };


    constructor(choices, options)
    {
        super(options);
        this.choices = choices;
        this.tree = choices.compileTree();
        if (this.tree.options.length == 1)
        {
            this.tree.structure.options[0].chosen = true;
        }
        else 
        {
            this._setInitialDecisions(this.tree.structure);
        }
    }

    async _prepareContext(options) 
    {
        let context = await super._prepareContext(options);
        context.tree = this.tree.structure;
        context.buttons = [{ type: "submit", label: "Submit Choices" }];
        return context;
    }

    static async submit(event, form, fromData)
    {
        let chosen = this.tree.options.filter(o => this.tree.find(o.id)?.chosen);
        if (this.options.resolve)
        {
            this.options.resolve(chosen);
        }
        return chosen;
    }

    static async awaitSubmit(choices, options={})
    {
        if (choices.options.length == 0)
        {
            return [];
        }
        return new Promise(resolve => 
        {
            new this(choices, mergeObject(options, {resolve})).render(true);
        });
    }

    _setInitialDecisions(tree)
    {
        if (tree.type == "and")
        {
            for(let option of tree.options)
            {
                if (option.type == "option")
                {
                    option.chosen = true;
                }
                else
                {
                    this._setInitialDecisions(option);
                }
            }
        }
    }

    static _onChooseOption(ev)
    {
        let id = ev.target.dataset.id;
        let option = this.tree.find(id);
        let orParent = this.tree.findParent(id, "or");
        let andParent = this.tree.findParent(id, "and");
        let current = option.chosen;

        let _unselectSiblingTree = (sibling) => 
        {
            if (sibling.type == "option")
            {
                sibling.chosen = false;
            }
            else 
            {
                sibling.options.forEach(o => 
                {
                    _unselectSiblingTree(o);
                });
            }
        };
        
        if (option.type == "option")
        {
            if (orParent)
            {
                option.chosen = !current;
                orParent.options.filter(o => !this.tree.find(option.id, o)).forEach(sibling => 
                {
                    // Invalidate sibling options
                    sibling.invalid = option.chosen;

                    // Unselect sibling options
                    if (sibling.invalid)
                    {
                        _unselectSiblingTree(sibling);
                    }
                });
            }
            if (andParent)
            {
                // Select all sibling options
                andParent.options.forEach(sibling => 
                {
                    if (sibling.type == "option")
                    {sibling.chosen = !current;};
                });
            }
            this.render(true);
        }
    }

}