import { DocumentReferenceModel } from "../model/components/reference";
import { WarhammerDocumentMixin } from "./mixin";

export class WarhammerItem extends WarhammerDocumentMixin(Item)
{
    async _preCreate(data, options, user) 
    {
        await super._preCreate(data, options, user);
        if (this.isOwned)
        {
            let allow = await this.system.allowCreation(data, options, user);
            if (!allow)
            {
                return false;
            }
        }
    
        if (options.fromEffect)
        {
            this.updateSource({[`flags.${game.system.id}.fromEffect`] : options.fromEffect});
        }
    
        if (this.isOwned)
        {
            await Promise.all(this.actor.runScripts("createItem", this));
            await this._handleConditions(data, options);
        }
    
        //_preCreate for effects is where immediate scripts run
        // Effects that come with Items aren't called, so handle them here
        await this.handleImmediateScripts(data, options, user);
    }
    
    async _onCreate(data, options, user)
    {
        await super._onCreate(data, options, user);

        if (game.user.id != user)
        {
            return;
        }
    
        if (this.isOwned)
        {
            await Promise.all(this.actor.runScripts("updateDocument", {data, options, user, itemCreated: this}));
    
            // Cannot simply call runScripts here because that would only be for Item effects
            // If an item has a transfered effect, it won't call "onCreate" scripts because the effect's
            // onCreate method isn't called. Same reason handleImmediate scripts doesn't call runScripts
            let effects = Array.from(this.allApplicableEffects()).filter(effect => effect.system.transferData.type == "document" && ["Actor", "Item"].includes(effect.system.transferData.documentType));
            for(let effect of effects)
            {
                for(let script of effect.scripts.filter(s => s.trigger == "onCreate"))
                {
                    await script.execute({data, options, user});
                }
            }
            await this.actor.system.updateSingleton(this);

        }
    }
    
    async _onUpdate(data, options, user)
    {
        await super._onUpdate(data, options, user);
        
        if (game.user.id != user)
        {
            return;
        }
    
        if (this.actor) 
        {
            await Promise.all(this.actor.runScripts("updateDocument", {data, options, user, itemUpdated : this}));
        }
    }
    
    async _onDelete(options, user) 
    {
        await super._onDelete(options, user);

        if (game.user.id != user)
        {
            return;
        }
    
        if (!options.skipDeletingItems)
        {
            for(let effect of this.effects)
            {
                await effect.deleteCreatedItems();
            }
        }
    
        for(let effect of this.effects)
        {
            for(let script of effect.scripts.filter(i => i.trigger == "deleteEffect"))
            {
                await script.execute({options, user});
            }
        }
    
        if (this.actor) 
        {
            await Promise.all(this.actor.runScripts("updateDocument", {options, user, itemDeleted : this}));
        }
    }
    
    // Conditions shouldn't be tied to the item. Add them to the actor independently.
    async _handleConditions(data, options)
    {
        if (options.condition)
        {
            return; // options.condition as true avoids this process
        }
    
        let conditions = this.effects.filter(e => e.isCondition && e.system.transferData.type == "document" && e.system.transferData.documentType == "Actor");
    
        // updateSource doesn't seem to work here for some reason: 
        // this.updateSource({effects : []})
        this._source.effects = this.effects.filter(e => !e.isCondition || e.system.transferData.type != "document" || e.system.transferData.documentType != "Actor").filter(e => e.toObject());
    
        this.actor?.createEmbeddedDocuments("ActiveEffect", conditions);
    }
    
    // This function runs the immediate scripts an Item contains in its effects
    // when the Item is added to an Actor. 
    async handleImmediateScripts(data, options, user)
    {
        let effects = Array.from(this.allApplicableEffects()).filter(effect => 
            effect.system.transferData.type == "document" && 
                effect.system.transferData.documentType == "Actor"); // We're looking for actor because if the immediate script was for the Item, it would've been called when it was created. 
    
        for(let e of effects)
        {
            let keepEffect = await e.handleImmediateScripts(data, options, user);
            if (keepEffect == false) // Can't actually delete the effect because it's owned by an item in _preCreate. Change it to `other` type so it doesn't show in the actor
            {
                e.updateSource({"system.transferData.type" : "other"});
            }
        }
    }
    
    
    
    prepareBaseData()
    {
        this._propagateDataModels(this.system, "runScripts", this.runScripts.bind(this));

        this.system.computeBase();
        this.runScripts("prepareBaseData", { item: this });
        if (this.isOwned)
        {
            this.actor.runScripts("prepareOwnedItemBaseData", {item : this});
        }
    }
    
    prepareDerivedData()
    {
        this.system.computeDerived();
        this.runScripts("prepareData", { item: this });
        if (this.isOwned)
        {
            this.actor.runScripts("prepareOwnedItemDerivedData", {item : this});
        }
    }
    
    prepareOwnedData()
    {
        this.system.computeOwned(this.actor);
        this.runScripts("prepareOwnedData", { item: this });
    }

    get specifier() 
    {
        return (/^(?<base>.+?)[[|(<](?<specifier>.+?)[\]|)>]$/gm).exec(this.name)?.groups.specifier.trim();
    }

    get baseName() 
    {
        return (/^(?<base>.+?)[[|(<](?<specifier>.+?)[\]|)>]$/gm).exec(this.name)?.groups.base.trim();
    }

    // If item.getScripts is called, filter scripts specifying "Item" document type
    // if the item was "Actor" document type, it would be transferred to the actor and 
    // the actor's getScripts would run it instead
    // 
    // This is important as roll dialogs call actor.getScripts() and then item.getScripts()
    // so that when an item is used, it can specifically add its dialog scripts
    // (prevents the need to check in the script code whether or not the item is being used)
    getScripts(trigger)
    {
        let effects = Array.from(this.allApplicableEffects()).
            filter(effect => 
                effect.system.transferData.type == "document" && 
              effect.system.transferData.documentType == "Item");

        let fromActor = this.actor?.getScriptsApplyingToItem(this) || [];

        return effects.reduce((prev, current) => prev.concat(current.scripts), []).concat(fromActor).filter(i => i.trigger == trigger);
    }

    *allApplicableEffects() 
    {
        for(let effect of this.effects.contents.concat(this.system.getOtherEffects()).filter(e => this.system.effectIsApplicable(e)))
        {
            if (!effect.disabled)
            {yield effect;};
        }
    }
 
    get damageEffects() 
    {
        return this._getTypedEffects("damage");
    }
 
    get targetEffects() 
    {
        return this._getTypedEffects("target")
            .concat(this._getTypedEffects("aura").filter(e => e.system.transferData.area.aura.transferred))
            .concat(this._getTypedEffects("zone").filter(e => e.system.transferData.zone.transferred));
    }
 
    get areaEffects() 
    {
        return this._getTypedEffects("area");
    }
    
    get zoneEffects() 
    {
        return this._getTypedEffects("zone").filter(e => e.system.transferData.zone.type != "follow");
    }
    _getTypedEffects(type)
    {
        let effects = Array.from(this.allApplicableEffects()).filter(effect => effect.system.transferData.type == type);

        return effects;
    }

    get sheetButtons() 
    {
        let manualScripts = this.manualScripts;
        let effects = this.testIndependentEffects;
        let buttons = [];
        manualScripts.forEach(s => 
        {
            buttons.push({
                label : s.Label,
                type : "manualScript",
                class : "trigger-script",
                uuid : s.effect.uuid,
                path : s.effect.getFlag(game.system.id, "path"),
                index : s.index
            });
        });
        effects.forEach(e => 
        {
            let icon;
            let type;
            let cls;
            if (e.system.transferData.type == "target" || (e.system.transferData.type == "aura" && e.system.transferData.area.aura.transferred))
            {
                type = "target";
                icon = "fa-solid fa-crosshairs";
                cls = "apply-target";
            }
            if (e.system.transferData.type == "area")
            {
                type = "area";
                icon = "fa-solid fa-ruler-combined";
                cls = "place-area";
            }
            if (e.system.transferData.type == "zone")
            {
                type = "zone";
                icon = "fa-solid fa-game-board-simple";
                cls = "apply-zone";
            }
            buttons.push({
                label : e.name,
                icon,
                type, 
                class : cls,
                uuid : e.uuid,
            });
        });
        return buttons;
    }

    get manualScripts() 
    {
        let effects = Array.from(this.allApplicableEffects()).filter(e => e.system.transferData.type == "document");
        return effects.reduce((scripts, effect) => scripts.concat(effect.manualScripts), []);
    }

    get testIndependentEffects()
    {
        return this.targetEffects.concat(this.areaEffects).concat(this.zoneEffects).filter(e => e.system.transferData.testIndependent);
    }
}