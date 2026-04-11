import { WHFormApplication } from "./form-application";

export class ChoiceOptionFormV2 extends WHFormApplication
{
    static DEFAULT_OPTIONS = {
        tag : "form",
        form: {
            handler: this.submit,
            submitOnChange: false,
            closeOnSubmit: true
        },
        classes: ["choice-option", "warhammer"],
        window: {
            resizable : true,
            title : "WH.Choice.Option",
        },
        position : {
        },
        actions : {
            addFilter : this._onAddFilter
        }
    };

    static PARTS = {
        details : {template : "modules/warhammer-lib/templates/apps/choice-option.hbs"},
        footer : {
            template : "templates/generic/form-footer.hbs"
        }
    };
    

    constructor(data, options)
    {
        super({}, options);
        this.data = data;
        this.data.option = foundry.utils.deepClone(this.data.choices.options[this.data.index]);
    }

    async _prepareContext(options) 
    {
        let data = await super._prepareContext(options);
        foundry.utils.mergeObject(data, this.data);
        return data;
    }

    static submit(ev, formData)
    {
        let choices = this.data.choices.toJSON();
        if (this.data.option.type == "filter")
        {
            this.data.option.filters = this.data.option.filters.filter(i => i.operation || i.path || i.value);
        }
        choices.options[this.data.index] = this.data.option;
        this.data.updateChoices(choices);
    }

    _onRender(_context, _options) 
    {
        super._onRender(_context, _options);

        this.element.querySelectorAll("input").forEach((input) => input.addEventListener("change", ev => 
        {
            if (ev.currentTarget.name)
            {
                this.data.option[ev.currentTarget.name] = ev.currentTarget.value;
            }
            else 
            {
                let index = $(ev.currentTarget).parents("[data-index]").attr("data-index");
                let property = ev.currentTarget.dataset.property;
                let filter = this.data.option.filters[index];
                filter[property] = ev.target.value;
                this.render(true);
            }
        }));
    }

    static _onAddFilter(ev)
    {
        this.data.option.filters.push({});
        this.render(true);
    }

}