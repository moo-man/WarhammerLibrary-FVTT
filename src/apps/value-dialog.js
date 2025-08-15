/**
 * Generic helper used to conveniently prompt for some basic input
 * Has the ability to provide preset values, turning the input element into a select element
 */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class ValueDialog extends HandlebarsApplicationMixin(ApplicationV2)  
{
    static DEFAULT_OPTIONS = {
        classes: ["value-dialog", "warhammer"],
        tag : "form",
        form : {
            handler : this.submit,
            submitOnChange : false,
            closeOnSubmit : true
        },
        window: {
            resizable : true,
            title : "WH.ValueDialog",
            contentClasses: ["standard-form"]
        },
        position : {
        },
        actions : {
        }
    };

    static PARTS = {
        form: {
            template: "modules/warhammer-lib/templates/apps/dialog/value-dialog.hbs",
        }
    };

    /**
     * 
     * @param {Object} obj 
     * @param {string} obj.text Text display in the dialog
     * @param {string} obj.title Window title for the dialog
     * @param {string} defaultValue Define a default value if desired
     * @param {Object|Array} values Define some preset options
     * @param {Object} options Foundry ApplicationV2 options 
     */
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

    close()
    {
        super.close();
        this.options.resolve();
    }

    /**
     * Submits the dialog, returning the input value
     * 
     * @param {Event} event event triggering submission
     * @param {HTMLElement} form HTML Element for the form
     * @param {Object} formData form data from the dialog
     * @returns 
     */
    static async submit(event, form, formData)
    {
        if (this.options.resolve)
        {
            this.options.resolve(formData.object.value);
        }
        return formData.object.value;
    }

    /** @inheritdoc */
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
                return {key : v, display : typeof this.values[v] == "string" ? this.values[v] : v};
            });
        }

        context.defaultValue = this.defaultValue;
        return context;
    }


    /**
     * Typical entry point for using the dialog, returns a promise that is resolved when the 
     * dialog is submitted
     * 
     * @param {Object} obj 
     * @param {string} obj.text Text display in the dialog
     * @param {string} obj.title Window title for the dialog
     * @param {string} defaultValue Define a default value if desired
     * @param {Object|Array} values Define some preset options
     */
    static async create({text, title}, defaultValue = "", values={}, options={})
    {
        return new Promise(resolve => 
        {
            options.resolve = resolve;
            new this({text, title}, defaultValue, values, options).render({force : true, window : {title : title || game.i18n.localize("WH.ValueDialog")}});
        });
    }
}