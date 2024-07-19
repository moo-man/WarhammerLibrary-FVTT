import { systemConfig } from "../util/utility";
import ScriptConfig from "./script-config";
const {setProperty, getProperty, deepClone, hasProperty} = foundry.utils;

export default class WarhammerEffectScriptConfig extends ScriptConfig
{
    scriptLock = true; // User lock toggled

    static get defaultOptions() 
    {
        const options = super.defaultOptions;
        options.classes.push("effect-script");
        return options;
    }

    get scriptLocked()
    {
        return this._hasScriptReferences() && this.scriptLock;
    }

    async getData() 
    {
        let data = await super.getData();
        data.hasScriptReferences = this._hasScriptReferences();
        data.scriptLock = data.hasScriptReferences && this.scriptLock;
        // only lock script if it's an actual reference, otherwise, it's not locked and can be edited even if script lock is turned on
        data.lockedScripts = {
            "script" : this._isScriptReference("script") && this.scriptLock,
            "hideScript" : this._isScriptReference("hideScript") && this.scriptLock,
            "activateScript" : this._isScriptReference("activateScript") && this.scriptLock,
            "submissionScript" : this._isScriptReference("submissionScript") && this.scriptLock
        };
        data.dereferencedScripts = this._dereferencedScripts();
        data.script = this._getScript();
        data.extraFieldsHTML = await this._renderExtraFields(data.dereferencedScripts, data.lockedScripts);
        return data;
    }

    _getAceEditorContents()
    {
        // If script is locked and is a reference: dereference, otherwise, show the script ID
        return (this._isScriptReference("script") && this.scriptLock) ? this._dereference("script") : super._getAceEditorContents();
    }


    _dereferencedScripts()
    {
        let data = {};
        data.script = this._dereference("script");
        setProperty(data, "options.hideScript", this._dereference("options.hideScript"));
        setProperty(data, "options.activateScript", this._dereference("options.activateScript"));
        setProperty(data, "options.submissionScript", this._dereference("options.submissionScript"));
        return data;
    }

    _dereference(scriptProperty)
    {
        let object = this._getScriptObject();
        let regex = /\[Script.([a-zA-Z0-9]{16})\]/gm;
        let matches = Array.from((getProperty(object, scriptProperty) || "").matchAll(regex));
        let id = matches[0]?.[1];

        return systemConfig().effectScripts[id] || getProperty(object, scriptProperty);
    }

    _renderExtraFields(dereferencedScripts, lockedScripts)
    {
        return renderTemplate("modules/warhammer-lib/templates/scripts/script-fields.hbs", {script: this._getScriptObject(), dereferencedScripts, lockedScripts});
    }

    _getScript()
    {
        return this._getScriptObject()?.script;
    }

    _getScriptObject()
    {
        let data = deepClone(this.object.system.scriptData[this.options.index]);
        return data;
    }

    _isScriptReference(type)
    {
        let regex = /\[Script.([a-zA-Z0-9]{16})\]/gm;
        let object = this._getScriptObject();
        if (type == "script")
        {
            return !!object.script.match(regex);
        }
        else 
        {
            return !!(getProperty(object, "options." + type) || "").match(regex);
        }
    }

    _hasScriptReferences()
    {
        return this._isScriptReference("script") || this._isScriptReference("hideScript") || this._isScriptReference("activateScript") || this._isScriptReference("submissionScript");
    }

    async _updateObject(ev, formData)
    {
        let script = (this.aceActive && !this.editor.getReadOnly()) ? this.editor.getValue() : formData.script; 

        let array = deepClone(this.object.system.scriptData);
        let scriptObject = array[this.options.index];
        scriptObject.label = formData.label;
        scriptObject.trigger = formData.trigger;
        if (hasProperty(formData, "hideScript"))
        {
            setProperty(scriptObject, "options.hideScript", formData.hideScript);
        }
        if (hasProperty(formData, "activateScript"))
        {
            setProperty(scriptObject, "options.activateScript", formData.activateScript);
        }
        if (hasProperty(formData, "submissionScript"))
        {
            setProperty(scriptObject, "options.submissionScript", formData.submissionScript);
        }
        
        setProperty(scriptObject, "options.targeter", formData.targeter);
        setProperty(scriptObject, "options.deleteEffect", formData.deleteEffect);
        if(script)
        {
            scriptObject.script = script;
        }

        return this.object.update({"system.scriptData" : array});
    }

    activateListeners(html)
    {
        super.activateListeners(html);

        this.hideTriggerOptions(html);

        html.find("[name='trigger']").change(ev => 
        {
            this.showTriggerOptions(ev.currentTarget.value);
        });

        html.find(".script-lock").change(ev => 
        {
            this.scriptLock = ev.currentTarget.checked;
            this.render(true);
        });

        this.showTriggerOptions(this._getScriptObject().trigger);

        if (this.aceActive)
        {
            this.editor.setReadOnly(this._isScriptReference("script") && this.scriptLock);
        }
    }

    showTriggerOptions(trigger)
    {
        this.hideTriggerOptions(this.element);

        if (trigger)
        {
            this.element.find(`[data-option=${trigger}]`).show();
        }

        if (this.aceActive)
        {this.editor.resize();}
    }

    hideTriggerOptions(html)
    {
        html.find("[data-option]").hide();
    }
}