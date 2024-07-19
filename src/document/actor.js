import { SocketHandlers } from "../util/socket-handlers";
import { getActiveDocumentOwner } from "../util/utility";
import WarhammerActiveEffect from "./effect";
import { WarhammerDocumentMixin } from "./mixin";

export class WarhammerActor extends WarhammerDocumentMixin(Actor)
{
    _itemTypes = null;

    get itemTypes()
    {
        if (!this._itemTypes) 
        {
            this._itemTypes = super.itemTypes;
        }
        return this._itemTypes;
    }

    prepareBaseData()
    {
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
        this.runScripts("postPrepareDerivedData", {actor : this});
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
        let dialogData = dialogClass.setupData(data, this, options);
        let setupData;
        if (options.skipDialog) 
        {
            setupData = await (new dialogClass(dialogData.data, dialogData.fields, dialogData.options, null).bypass());
        }
        else 
        {
            setupData = await dialogClass.awaitSubmit(dialogData);
        }
        let test = testClass.fromData(setupData);
        if (roll) 
        {
            await test.roll();
        }
        return test;
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
            if (e.disabled) 
            {
                return false;
            }

            // An actor effects intended to apply to an item must have the itemTargets flag
            // Empty array => all items
            // No flag => Should not apply to items
            // Array with IDs => Apply only to those IDs
            let targeted = e.system.transferData.itemTargetIDs;
            if (targeted) 
            {
                if (targeted.length) 
                {
                    return targeted.includes(item.id);
                }
                // If no items specified, apply to all items
                else 
                {
                    return true;
                }
            }
            else // If no itemTargets flag, it should not apply to items at all
            {
                return false;
            }

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
    async applyEffect({effectUuids=[], effectData=[], messageId}={})
    {
        let owningUser = getActiveDocumentOwner(this);

        if (typeof effectUuids == "string")
        {
            effectUuids = [effectUuids];
        }

        if (owningUser?.id == game.user.id)
        {
            for (let uuid of effectUuids)
            {
                let effect = fromUuidSync(uuid);
                let message = game.messages.get(messageId);
                await CONFIG.ActiveEffect.documentClass.create(effect.convertToApplied(), {parent: this, message : message?.id});
            }
            for(let data of effectData)
            {
                await CONFIG.ActiveEffect.documentClass.create(data, {parent: this, message : messageId});
            }
        }   
        else 
        {
            SocketHandlers.executeOnOwner(this, "applyEffect", {effectUuids, actorUuid : this.uuid, messageId});
        }
    }

    /**
     * All effects that should be "applied" to this actor
     * @param {boolean} includeItemEffects Include Effects that are intended to be applied to Items, see getScriptsApplyingToItem, this does NOT mean effects that come from items
     * @yields {WarhammerActiveEffect} applicable active effect
     */
    *allApplicableEffects(includeItemEffects = false) 
    {

        for (const effect of this.effects) 
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
  
}