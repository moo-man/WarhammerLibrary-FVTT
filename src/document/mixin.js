import WarhammerScript from "../system/script";
import { getActiveDocumentOwner, keepID } from "../util/utility";

export const WarhammerDocumentMixin = (cls) => class extends cls 
{

    async _preCreate(data, options, user) 
    {
        if (data._id && !this.isOwned)
        {
            options.keepId = keepID(this);
        }

        await super._preCreate(data, options, user);
        await this.system._preCreate(data, options, user);
    }

    async _preUpdate(data, options, user) 
    {
        options.changed = foundry.utils.diffObject(this.toObject(), data);
        await super._preUpdate(data, options, user);
        await this.system._preUpdate(data, options, user);
        await Promise.all(this.runScripts("preUpdateDocument", {data, options, user, type: "data"}));
    }

    async _preDelete(options, user)
    {
        await super._preDelete(options, user);
        await this.system._preDelete(options, user);
    }

    async _onUpdate(data, options, user)
    {
        await super._onUpdate(data, options, user);
        await this.system._onUpdate(data, options, user);
        await Promise.all(this.runScripts("updateDocument", {data, options, user, type: "data"}));
    }

    async _onCreate(data, options, user)
    {
        await super._onCreate(data, options, user);
        await this.system._onCreate(data, options, user);
    }

    async _onDelete(options, user)
    {
        await super._onDelete(options, user);
        await this.system._onDelete(options, user);
    }

    // Helper method to easily check and decrement some property
    async spend(path, value=1)
    {
        let current = foundry.utils.getProperty(this, path);
        if (current >= value)
        {
            await this.update({[path] : current - value});
            return true;
        }
        else 
        {
            return false;
        }
    }

    // Assigns a property to all datamodels and their embedded models
    _propagateDataModels(model, name, value, modelSelector)
    {
        if (model instanceof foundry.abstract.Document)
        {
            return;
        }
        if (model instanceof foundry.abstract.DataModel)
        {
            if (!model[name] && (!modelSelector || model instanceof modelSelector))
            {
                Object.defineProperty(model, name, {
                    value, 
                    enumerable : false
                });
            }

            for(let property in model)
            {
                if (model[property] instanceof Array)
                {
                    for(let arrayProperty of model[property])
                    {
                        this._propagateDataModels(arrayProperty, name, value, modelSelector);
                    }
                }
                else if (model[property] instanceof foundry.abstract.DataModel)
                {
                    this._propagateDataModels(model[property], name, value, modelSelector);
                }
            }
        }
    }

    hasCondition(conditionKey) 
    {
        let existing = this.effects.find(i => i.key == conditionKey);
        return existing;
    }

    /**
     * 
     * @param {string} trigger Script trigger to run
     * @param {object} args Arguments for the script
     * @param {boolean} ownerOnly Whether to only execute this on the document's owner
     * @returns {Array<Promise>} Array of any scripts that were async and their promises of execution
     */
    runScripts(trigger, args, ownerOnly = false) 
    {

        if (ownerOnly && getActiveDocumentOwner(this).id != game.user.id) 
        {
            return [];
        }

        let scripts = this.getScripts(trigger);

        let promises = [];

        for (let script of scripts) 
        {
            if (script.async) 
            {
                promises.push(script.execute(args));
            }
            else 
            {
                script.execute(args);
            }
        }

        return promises;
    }

    /**
     * Collect effect scripts being applied to the actor
     * @param {string} trigger Specify stript triggers to retrieve
     * @param {Function} scriptFilter Optional function to filter out more scripts
     * @returns {Array<WarhammerScript>} List of scripts found with provided trigger
     */
    getScripts(trigger, scriptFilter) 
    {
        let effects = Array.from(this.allApplicableEffects());
        let scripts = [];

        // Get scripts from active effects or disabled effects if runIfDisabled is true
        effects.forEach(e => 
        {
            let effectScripts = e.scripts.filter(i => i.trigger == trigger);
            if (e.disabled)
            {
                scripts = scripts.concat(effectScripts.filter(s => s.options.runIfDisabled));
            }
            else 
            {
                scripts = scripts.concat(effectScripts);
            }
        });
        if (scriptFilter) 
        {
            scripts = scripts.filter(scriptFilter);
        }
        return scripts;
    }

    /**
     * 
     * @inheritdoc
     * @param {object} config Configuration for embedding behavior, changes for each system/type
     */
    async toEmbed(config, options={})
    {
        if (this.system.toEmbed)
        {
            let embed = await this.system.toEmbed(config, options);
            embed.classList.add(`${game.system.id}-embed`, this.type);
            return embed;
        }
        else 
        {
            return super.toEmbed(config, options);
        }
    }
};