import WarhammerSheetMixinV2 from "../sheets/v2/mixin";

const { ApplicationV2 } = foundry.applications.api;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export default class WarhammerScriptEditor extends HandlebarsApplicationMixin(ApplicationV2)
{    
    static DEFAULT_OPTIONS = {
        tag : "form",
        classes: ["script-editor", "warhammer"],
        window: {
            resizable : true,
            title : "WH.ScriptEditor",
        },
        position : {
            height: 600,
            width: 500
        },
        form: {
            handler: this.submit,
            submitOnChange: false,
            closeOnSubmit: true
        },
        actions : {
            contentLink : this._onClickContentLink
        }
    };

    static PARTS = {
        choices : {template : "modules/warhammer-lib/templates/scripts/script-editor.hbs"}
    };

    constructor(document, options)
    {
        super(options);
        
        this.document = document;
    }

    static async wait(script, options={})
    {
        return new Promise(resolve => 
        {
            options.resolve = resolve;
            options.script = script;
            new this(null, options).render(true);
        });
    }

    async _prepareContext() 
    {
        let data = await super._prepareContext();
        data.script = this._getScript();
        return data;
    }

    _getScript()
    {
        return this.document ? foundry.utils.getProperty(this.document, this.options.path) : this.options.script;
    }

    static async submit(ev, form, formData)
    {
        let script = formData.object.script; 
        if (this.options.resolve)
        {
            return this.options.resolve(script);
        }
        else 
        {
            return this.document.update({[this.options.path] : script});
        }
    }


}