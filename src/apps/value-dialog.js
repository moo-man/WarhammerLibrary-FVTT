import { localize } from "../util/utility";

export default class ValueDialog extends Dialog 
{
    static get defaultOptions() 
    {
        const options = super.defaultOptions;
        options.resizable = true;
        options.classes.push("value-dialog");
        return options;
    }


    static create({text, title}, defaultValue = "", values={})
    {
        // If values is an array, convert to an Object that has keys and values
        if (Array.isArray(values))
        {
            let valuesObject = {};
            values.forEach(v => 
            {
                valuesObject[v] = v;
            });
            values = valuesObject;
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