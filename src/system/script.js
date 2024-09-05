import { log, systemConfig } from "../util/utility";
const {mergeObject} = foundry.utils;

export default class WarhammerScript
{
    constructor(data, context={})
    {
        this.script = data.script;
        this.label = data.label;
        this.trigger = systemConfig().triggerMapping[data.trigger] || data.trigger;
        this.options = data.options || {};
        this.async = this.trigger ? !systemConfig().syncTriggers.includes(this.trigger) : (data.async || false);
        this.context = context;
        this.context.script = this;
    }

    _handleScriptId(string)
    {
        let script;
        let regex = /\[Script.([a-zA-Z0-9]{16})\]/gm;
        let id = Array.from(string.matchAll(regex))[0]?.[1];
        if (id)
        {
            script = systemConfig().effectScripts[id];
            if (!script)
            {
                console.warn(`Script ID ${id} not found`, this);
            }
        }
        return script || string;
    }

    execute(args)
    {
        try 
        {
            let script = this._handleScriptId(this.script);
            let scriptFunction =this.async ? Object.getPrototypeOf(async function () { }).constructor : Function;
            log("Running Script > " + this.Label);
            return (new scriptFunction("args",`${CONFIG.debug.scripts ? "debugger;" : ""}` + script)).bind(this.context)(args);
        }
        catch(e)
        {
            console.error(`Script ${this.Label} threw error: ${e}.\n Context and Arguments:`, this.context, args);
        }
    }


    // Dialog modifiers only
    hidden(args)
    {
        if (!this.options?.hideScript)
        {
            return false; // Default to not hidden if no script
        }
        else 
        {
            try 
            {
                return this._runSubscript(args, this.options?.hideScript, "Hide");
            }
            catch(e)
            {
                return false; // Default to not hidden if error
            }
        }
    }

    // Dialog modifiers only
    activated(args)
    {
        if (!this.options?.activateScript)
        {
            return false; // Default to not activated if no script
        }
        else 
        {
            try 
            {
                return this._runSubscript(args, this.options?.activateScript, "Activate");
            }
            catch(e)
            {
                return false; // Default to not activated if error
            }
        }
    }

    // Dialog modifiers only
    submission(args)
    {
        if (this.options?.submissionScript)
        {
            return this._runSubscript(args, this.options?.submissionScript, "Submission");
        }
    }

    _runSubscript(args, script, name)
    {
        try 
        {
            script = this._handleScriptId(script);
            log("Running Script > " + this.Label);
            return new Function("args",`${CONFIG.debug.scripts ? "debugger;" : ""}` + script).bind(this.context)(args);
        }
        catch(e)
        {
            console.error(`${name} Subscript ${this.Label} threw error: ${e}.\n Context and Arguments:`, this.context, args);
            throw e;
        }
    }

    notification(content, type="info")
    {
        ui.notifications.notify(`<strong>${this.context.effect.name}</strong>: ${content}`, type);
    }

    message(content, chatData={})
    {
        return CONFIG.ChatMessage.documentClass.create(mergeObject({content}, this.getChatData(chatData)));
    }

    scriptNotification(...args)
    {
        return this.notification(...args);
    }

    scriptMessage(...args)
    {
        return this.message(...args);
    }

    getChatData(merge={})
    {
        return mergeObject({
            speaker : {alias : this.context.actor?.name || this.context?.item.name},
            flavor : this.context.effect.name || this.context.item.name || ""
        }, merge);
    }



    get actor() 
    {
        return this.context.actor;
    }
    
    get item() 
    {
        return this.context.item;
    }

    get effect()
    {
        return this.context.effect;
    }

    get Label() 
    {
        return Roll.replaceFormulaData(this.label, this);
    }

    static createContext(document)
    {
        let context = {};
        if (document.documentName == "ActiveEffect")
        {
            context.actor = document.actor;
            context.item = document.item;
            context.effect = document;
        }

        if (document.documentName == "Item")
        {
            context.actor = document.actor;
            context.item = document;
        }
        
        if (document.documentName == "Actor")
        {
            context.actor = document;
        }

        return context;
    }
}