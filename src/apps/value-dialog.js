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

        // If values object provided, show a select box, otherwise, just a text input
        let content = foundry.utils.isEmpty(values) ? 
            `<div class="value-dialog"><p>${text || localize("WH.Dialog.EnterValue")}</p><input class="value" type="text" value="${defaultValue}"></div>` 
            : 
            `<div class="value-dialog"><p>${text || localize("WH.Dialog.SelectValue")}</p><select class="value" value="${defaultValue}"><option value=""></option>${Object.keys(values).map(
                v => `<option value=${v}>
                        ${typeof values[v] == "string" ? values[v] : v }
                  </option>`)}
                </select></div>`; 
        


        return Dialog.wait({
            title : title || localize("WH.Dialog.ValueDialog"),
            content : content,
            buttons : {
                submit : {
                    label : localize("Submit"),
                    callback: (html) => 
                    {
                        return html.find(".value")[0]?.value;
                    }
                }                
            },
            default: "submit",
            close : () => 
            {
                return null;
            }
        });
    }
}