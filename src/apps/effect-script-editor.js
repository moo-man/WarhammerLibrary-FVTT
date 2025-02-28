import { systemConfig } from "../util/utility";
import WarhammerScriptEditor from "./script-editor";

export default class WarhammerEffectScriptEditor extends WarhammerScriptEditor
{
    unlocked = false; // User lock toggled

    static DEFAULT_OPTIONS = {
        tag : "form",
        classes : ["effect-script"],
        actions : {
            toggleLock : this._onToggleLock
        },
        form: {
            handler: this.submit,
            submitOnChange: true,
            closeOnSubmit: false
        },
    };

    static PARTS = {
        choices : {scrollable : [""], template : "modules/warhammer-lib/templates/scripts/effect-script-editor.hbs"}
    };

    constructor(document, options={})
    {
        super(options);
        this.index = options.index;
        this.document = document;
    }

    get scriptLocked()
    {
        return this._hasScriptReferences() && !this.unlocked;
    }

    async _prepareContext()
    {
        let data = await super._prepareContext();
        data.effect = this.document;
        data.hasScriptReferences = this._hasScriptReferences();
        data.scriptLock = data.hasScriptReferences && !this.unlocked;
        // only lock script if it's an actual reference, otherwise, it's not locked and can be edited even if script lock is turned on
        data.lockedScripts = {
            "script" : this._isScriptReference("script") && !this.unlocked,
            "hideScript" : this._isScriptReference("hideScript") && !this.unlocked,
            "activateScript" : this._isScriptReference("activateScript") && !this.unlocked,
            "submissionScript" : this._isScriptReference("submissionScript") && !this.unlocked
        };
        data.dereferencedScripts = this._dereferencedScripts();
        data.script = this._getScript();
        data.scriptData = this._getScriptData();
        return data;
    }

    _dereferencedScripts()
    {
        let data = {};
        data.script = this._dereference("script");
        foundry.utils.setProperty(data, "options.hideScript", this._dereference("options.hideScript"));
        foundry.utils.setProperty(data, "options.activateScript", this._dereference("options.activateScript"));
        foundry.utils.setProperty(data, "options.submissionScript", this._dereference("options.submissionScript"));
        return data;
    }

    _dereference(scriptProperty)
    {
        let object = this._getScriptData();
        let regex = /\[Script.([a-zA-Z0-9]{16})\]/gm;
        let matches = Array.from((foundry.utils.getProperty(object, scriptProperty) || "").matchAll(regex));
        let id = matches[0]?.[1];

        return systemConfig().effectScripts[id] || foundry.utils.getProperty(object, scriptProperty);
    }


    _getScript()
    {
        return this._getScriptData()?.script;
    }

    _getScriptData()
    {
        let data = foundry.utils.deepClone(this.document.system.scriptData[this.index]);
        return data;
    }

    _isScriptReference(type)
    {
        let regex = /\[Script.([a-zA-Z0-9]{16})\]/gm;
        let object = this._getScriptData();
        if (type == "script")
        {
            return !!object.script.match(regex);
        }
        else
        {
            return !!(foundry.utils.getProperty(object, "options." + type) || "").match(regex);
        }
    }

    _hasScriptReferences()
    {
        return this._isScriptReference("script") || this._isScriptReference("hideScript") || this._isScriptReference("activateScript") || this._isScriptReference("submissionScript");
    }


    static async submit(ev, form, formData)
    {
        let script = formData.object.script;
        let array = foundry.utils.deepClone(this.document.system.scriptData);
        let scriptObject = array[this.index];
        scriptObject.label = formData.object.label;
        scriptObject.trigger = formData.object.trigger;

        if (foundry.utils.hasProperty(formData.object, "hideScript"))
        {
            foundry.utils.setProperty(scriptObject, "options.hideScript", formData.object.hideScript);
        }
        if (foundry.utils.hasProperty(formData.object, "activateScript"))
        {
            foundry.utils.setProperty(scriptObject, "options.activateScript", formData.object.activateScript);
        }
        if (foundry.utils.hasProperty(formData.object, "submissionScript"))
        {
            foundry.utils.setProperty(scriptObject, "options.submissionScript", formData.object.submissionScript);
        }

        foundry.utils.setProperty(scriptObject, "options.targeter", formData.object.targeter);
        foundry.utils.setProperty(scriptObject, "options.defending", formData.object.defending);
        foundry.utils.setProperty(scriptObject, "options.deleteEffect", formData.object.deleteEffect);
        if(!foundry.utils.isEmpty(script))
        {
            scriptObject.script = script;
        }

        return this.document.update({"system.scriptData" : array}).then(_ => this.render(true));
    }

    static async _onToggleLock(ev)
    {
        this.unlocked = !ev.target.checked;
        this.render(true);
    }
}