import { DocumentReferenceModel } from "../model/components/reference";
import AreaHelpers from "../util/area-helpers";
import { SocketHandlers } from "../util/socket-handlers";
import TokenHelpers from "../util/token-helpers";
import { getActiveDocumentOwner } from "../util/utility";
import WarhammerActiveEffect from "./effect";
import { WarhammerDocumentMixin } from "./mixin";
const {hasProperty} = foundry.utils;

export class WarhammerActor extends WarhammerDocumentMixin(Actor)
{
    _itemTypes = null;

    get itemTypes()
    {
        if (!this._itemTypes) 
        {
            this._itemTypes = super.itemTypes;
            for(let type in this._itemTypes)
            {
                this._itemTypes[type] = this._itemTypes[type].sort((a, b) => a.sort - b.sort);
            }
        }
        return this._itemTypes;
    }

    _onCreateDescendantDocuments(...args)
    {
        super._onCreateDescendantDocuments(...args);
        // Edge case than needs a semaphore to handle properly: a targeted aura that adds a condition (immediate script) will create two auras
        // When the condition is created, the aura template hasn't been created yet, so it gets created too
        TokenHelpers.semaphore.add(TokenHelpers.updateAuras.bind(TokenHelpers), this.getActiveTokens()[0]?.document);
    }

    _onUpdateDescendantDocuments(...args)
    {
        super._onUpdateDescendantDocuments(...args);
        if (args[1] == "effects" && args[3].some(update => (hasProperty(update, "disabled"))))
        {
            TokenHelpers.updateAuras(this.getActiveTokens()[0]?.document);
        }
    }

    _onDeleteDescendantDocuments(...args)
    {
        super._onDeleteDescendantDocuments(...args);
        TokenHelpers.updateAuras(this.getActiveTokens()[0]?.document);
    }

    prepareBaseData()
    {
        super.prepareBaseData();
        this._propagateDataModels(this.system, "runScripts", this.runScripts.bind(this));

        this._itemTypes = null; 
        this.system.computeBase();
        this.runScripts("prepareBaseData", {actor : this});
    }

    prepareDerivedData()
    {
        this.runScripts("prePrepareDerivedData", {actor : this});
        this.system.computeDerived();
        this.items.forEach(i => i.prepareOwnedData());
        this.runScripts("prepareOwnedItems", {actor : this});
        this.runScripts("prepareDerivedData", {actor : this});
    }

    /**
     * Unified method for setting up a test
     * @param {class} dialogClass Class used for the test dialog
     * @param {class} testClass Class used to compute the test result
     * @param {object} data data relevant to the specific test (such as what characteristic/item to use)
     * @param {object} options Optional properties to customize the test
     * @param {boolean} roll Whether to evaluate the test or not
     * @returns {object} test class instance
     */
    async _setupTest(dialogClass, testClass, data, options = {}, roll = true) 
    {
        let dialogData = await dialogClass.setupData(data, this, options);
        let setupData;
        if (options.skipDialog) 
        {
            setupData = await (new dialogClass(dialogData.data, dialogData.fields, dialogData.options, null).bypass());
        }
        else 
        {
            setupData = await dialogClass.awaitSubmit(dialogData);
        }
        if (setupData)
        {
            let test = testClass.fromData(setupData);
            if (roll) 
            {
                await test[testClass.rollFunction || "roll"]();
                test.sendToChat();
            }
            return test;
        }
    }

    /**
     * Some effects applied to an actor are actually intended for items, but to make other things convenient
     * (like duration handling modules, or showing the effect icon on the token), they are given to an actor
     * Also as an unintended benefit it can be used to circumvent items being prepared twice (and thus their effects being applied twice)
     * @param {Item} item  Item testsed
     * @returns {Array<WarhammerActiveEffect>} list of effects applying to item
     */
    getEffectsApplyingToItem(item) 
    {
    // Get effects that should be applied to item argument
        return this.effects.contents.filter(e => 
        {
            if (e.disabled || e.system.transferData.documentType != "Item") 
            {
                return false;
            }
            if(e.system.itemTargetData.allItems)
            {
                return true;
            }

            return e.system.itemTargetData.ids.includes(item.id);

            // Create temporary effects that have the item as the parent, so the script context is correct
        }).map(i => new CONFIG.ActiveEffect.documentClass(i.toObject(), { parent: item }));

    }

    /**
     * Same logic as getEffectsApplyingToItem, but reduce the effects to their scripts
     * @param {WarhammerItem} item Item tested
     * @returns {Array<WarhammerScript>} List of scripts applying to item
     */
    getScriptsApplyingToItem(item) 
    {
        return this.getEffectsApplyingToItem(item).reduce((prev, current) => prev.concat(current.scripts), []);
    }
    

    // Handles applying effects to this actor, ensuring that the owner is the one to do so
    // This allows the owner of the document to roll tests and execute scripts, instead of the applying user
    // e.g. the players can actually test to avoid an effect, instead of the GM doing it
    async applyEffect({effects=[], effectUuids=[], effectData=[], messageId}={})
    {
        let owningUser = getActiveDocumentOwner(this);

        if (!(effectUuids instanceof Array))
        {
            effectUuids = [effectUuids];
        }
    
        if (!(effectData instanceof Array))
        {
            effectData = [effectData];
        }

        if (!(effects instanceof Array))
        {
            effects = [effects];
        }
    

        let message = game.messages.get(messageId);
        effectData = effectData.concat(effects.map(e => e.convertToApplied(message?.system?.test)));

        if (owningUser?.id == game.user.id)
        {
            for (let uuid of effectUuids)
            {
                let effect = await fromUuid(uuid);
                effectData.push(effect.convertToApplied(message?.system?.test));
            }
            await CONFIG.ActiveEffect.documentClass.create(effectData, {parent: this, message : messageId});
        }   
        else 
        {
            for (let uuid of effectUuids)
            {
                let effect = await fromUuid(uuid);
                effectData.push(effect.convertToApplied(message?.system?.test));
            }
            SocketHandlers.executeOnOwner(this, "applyEffect", {effectUuids: [], effectData, actorUuid : this.uuid, messageId});
        }
    }

    /**
     * All effects that should be "applied" to this actor
     * @param {boolean} includeItemEffects Include Effects that are intended to be applied to Items, see getScriptsApplyingToItem, this does NOT mean effects that come from items
     * @yields {WarhammerActiveEffect} applicable active effect
     */
    *allApplicableEffects(includeItemEffects = false) 
    {

        for (const effect of this.effects.contents.concat(this.system.getOtherEffects())) 
        {
            if (effect.system.transferData.documentType == "Item" && includeItemEffects) // Some effects are intended to modify items, but are placed on the actor for ease of tracking
            {
                yield effect;
            }
            else if (effect.system.transferData.documentType == "Actor") // Normal effects (default documentType is actor)
            {
                yield effect;
            }
        }
        for (const item of this.items) 
        {
            for (const effect of item.effects.contents.concat(item.system.getOtherEffects())) 
            {
                // So I was relying on effect.transfer, which is computed in the effect's prepareData
                // However, apparently when you first load the world, that is computed after the actor
                // On subsequent data updates, it's computed before. I don't know if this is intentional
                // Regardless, we need to doublecheck whether this effect should transfer to the actor
                if (effect.determineTransfer()) 
                {
                    yield effect;
                }
            }

        }
    }

    /**
     * Overriden from foundry to pass true to allApplicableEffects
     */
    get temporaryEffects() 
    {
        const effects = [];
        for ( const effect of this.allApplicableEffects(true) ) 
        {
            if ( effect.active && effect.isTemporary ) {effects.push(effect);}
        }
        return effects;
    }

    sameSideAs(actor)
    {
        let self = this.getActiveTokens()[0]?.document?.toObject() || this.prototypeToken;
        let target = actor.getActiveTokens()[0]?.document?.toObject() || actor.prototypeToken;
        if (this.hasPlayerOwner && actor.hasPlayerOwner) // If both are owned by players, probably the same side
        {
            return true;
        }
        else if (this.hasPlayerOwner) // If this actor is owned by a player, and the other is friendly, probably the same side
        {
            return target.disposition == CONST.TOKEN_DISPOSITIONS.FRIENDLY; 
        }
        else if (actor.hasPlayerOwner) // If this actor is friendly, and the other is owned by a player, probably the same side
        {
            return self.disposition == CONST.TOKEN_DISPOSITIONS.FRIENDLY;
        }
        else // If neither are owned by a player, only same side if they have the same disposition
        {
            return self.disposition == target.disposition;
        }
    }

    speakerData(token) 
    {
        if (this.isToken || token) 
        {
            return {
                token: token?.id || this.token.id,
                scene: token?.parent.id || this.token.parent.id
            };
        }
        else 
        {
            return {
                actor: this.id,
                token: token?.id,
                scene: token?.parent.id
            };
        }
    }

    async addEffectItems(uuids=[], effect, merge=[{}])
    {
        if (typeof uuids == "string")
        {
            uuids = [uuids];
        }
        if ((merge instanceof Array))
        {
            merge = [merge];
        }

        let items = (await Promise.all(uuids.map(fromUuid))).map(i => i.toObject());

        for(let i = 0; i < uuids.length; i++)
        {
            items[i] = foundry.utils.mergeObject(items[i], merge[i]);
        }

        return this.createEmbeddedDocuments("Item", items, {fromEffect : effect?.id});
    }
  
    get auraEffects() 
    {
        return this.items.reduce((acc, item) => acc.concat(item.effects.contents), []).concat(this.effects.contents).filter(e => e.system.transferData.type == "aura" && !e.system.transferData.area.aura.transferred).filter(i => i.active);
    }

    get followedZoneEffects()
    {
        return this.items.reduce((acc, item) => acc.concat(item.effects.contents), []).concat(this.effects.contents).filter(e => e.system.transferData.type == "zone" && e.system.transferData.zone.type == "follow" && !e.system.transferData.zone.transferred).filter(i => i.active);
    }
  
}