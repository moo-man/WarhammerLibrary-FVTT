/**
 * Easily handle and compute tooltips for dialog fields
 *
 * Call #start to mark the initial values of the dialog
 * Call #finish to compare the initial with the current values
 */
export class BaseDialogTooltips
{

    fields = [];
    TYPES = {NONE : 0, NUMBER : 1};
    constructor(config)
    {
        for(let field in config)
        {
            this[`_${field}`] = this._configureField(config[field]);
            
            this.fields.push(field);
        }
    }

    _configureField(field)
    {
        return {
            type : field.type,
            label : game.i18n.localize(field.label),
            path : field.path,
            noCollect : field.noCollect,
            temp1 : null,
            temp2 : null,
            diff : null,
            hideLabel : field.hideLabel,
            list : []
        };
    }


    clear() 
    {
        this.reset();
        for(let key of this.fields)
        {
            this[`_${key}`].list = [];
        }
    }

    reset()
    {

        for(let key of this.fields)
        {
            let field = this[`_${key}`];
            field.temp1 = null;
            field.temp2 = null;
            field.diff = null;
        }
    }


    start(dialog)
    {
        this.reset();
        for(let key of this.fields)
        {
            let field = this[`_${key}`];
            field.temp1 = foundry.utils.getProperty(dialog, field.path);
        }
    }

    finish(dialog, source)
    {
        for(let key of this.fields)
        {
            let field = this[`_${key}`];
            field.temp2 = foundry.utils.getProperty(dialog, field.path);
        }

        this._computeDiff(source);
    }

    // Record a modification to a field (add/subtract)
    add(type, value, source)
    {
        let field = this[`_${type}`];
        if (field && value && source)
        {
            field.list.push({value, source});
        }
    }

    // Resets a field's values to the provided value
    set(type, value, source)
    {
        let field = this[`_${type}`];
        if (field && value && source)
        {
            field.list = [{value, source, set: true}].concat(field.list);
        }
    }

    _computeDiff(source)
    {

        for(let key of this.fields)
        {
            let field = this[`_${key}`];

            if (field.type == this.TYPES.NUMBER)
            {
                field.diff = field.temp2 - field.temp1;

                if (field.diff)
                {
                    field.list.push({value : field.diff, source});
                }
            }
            else 
            {
                field.diff = field.temp1 != field.temp2;
                if (field.diff)
                {
                    field.list.push({source});
                }
            }
        }
    }

    getTooltips()
    {
        return this.fields.reduce((tooltips, field) => 
        {
            tooltips[field] = this._formatTooltip(field, this[`_${field}`].hideLabel);
            return tooltips;
        }, {});
    }

    _formatTooltip(type, hideLabel=false)
    {
        let field = this[`_${type}`];
        if (!field || field.list?.length == 0 || field.noCollect)
        {
            return "";
        }
        else 
        {
            return `<p>${field.list.map(i => 
            {
                if (i.value)
                {
                    // Add sign to positive numbers (unless the value was "set")
                    return `&#8226; ${i.source} (${foundry.applications.handlebars.numberFormat(i.value, {hash : {sign: !i.set}})}${(!hideLabel && field.label) ? " " + field.label : ""})`;
                }
                else 
                { 
                    return `&#8226; ${i.source}`; 
                }

            }).join("</p><p>")}</p>`;
        }   
    }

    // Collection of all typed tooltips
    // used to display modifiers in the chat card
    getCollectedTooltips()
    {
        let tooltip = "";
        for(let key of this.fields)
        {
            tooltip += this._formatTooltip(key);
        }
        return tooltip;
    }
}