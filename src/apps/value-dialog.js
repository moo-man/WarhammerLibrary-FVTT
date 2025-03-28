import { localize } from "../util/utility";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class ValueDialog extends HandlebarsApplicationMixin(ApplicationV2)  
{
    static DEFAULT_OPTIONS = {
        classes: ["value-dialog", "warhammer", "standard-form"],
        tag : "form",
        form : {
            handler : this.submit,
            submitOnChange : false,
            closeOnSubmit : true
        },
        window: {
            resizable : true,
            title : "WH.ValueDialog",
        },
        position : {
        },
        actions : {
        }
    };

    static PARTS = {
        form: {
            template: "modules/warhammer-lib/templates/apps/value-dialog.hbs",
        }
    };

    constructor({text, title}, defaultValue = "", values={}, options)
    {
        super(options);
        this.text = text;
        this.defaultValue = defaultValue;

        // If values is an array, convert to an Object that has keys and values
        if (Array.isArray(values))
        {
            let valuesObject = {};
            values.forEach(v => 
            {
                valuesObject[v] = v;
            });
            this.values = valuesObject;
        }
        else 
        {
            this.values = values;
        }
    }

    static async submit(event, form, formData)
    {
        if (this.options.resolve)
        {
            this.options.resolve(formData.object.value);
        }
        return formData.object.value;
    }

    async _prepareContext(options)
    {
        let context = await super._prepareContext(options);
        if (foundry.utils.isEmpty(this.values))
        {
            context.label = this.text || "Enter Value";
        }
        else 
        {
            context.label = this.text || "Select Value";

            context.values = Object.keys(this.values).map(v => 
            {
                return {key : v, display : this.values[v] == "string" ? this.values[v] : v};
            });
        }

        context.defaultValue = this.defaultValue;
        return context;
    }


    static async create({text, title}, defaultValue = "", values={})
    {
        return new Promise(resolve => 
        {
            new this({text, title}, defaultValue, values, {resolve}).render({force : true, window : {title : title || game.i18n.localize("WH.ValueDialog")}});
        });
    }
}