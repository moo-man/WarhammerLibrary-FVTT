import { WHFormApplication } from "./form-application";

export default class WarhammerScriptEditor extends WHFormApplication
{    
    static DEFAULT_OPTIONS = {
        tag : "form",
        classes: ["script-editor"],
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
        editor : {template : "modules/warhammer-lib/templates/scripts/script-editor.hbs"},
        footer : {
            template : "templates/generic/form-footer.hbs"
        }
    };

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
        let context = await super._prepareContext();
        context.script = this._getScript();
        context.buttons = [{ type: "submit", label: "Submit", icon: "fa-solid fa-save" }];
        return context;
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