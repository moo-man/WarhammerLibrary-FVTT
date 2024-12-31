import ItemDialog from "../apps/item-dialog";
import { format, log, systemConfig } from "../util/utility";
import WarhammerScript from "../system/script";
import { WarhammerTestBase } from "../system/test";
import { SocketHandlers } from "../util/socket-handlers";
import ZoneHelpers from "../util/zone-helpers";

export default class WarhammerActiveEffect extends CONFIG.ActiveEffect.documentClass
{
    // Config object used by systems to hide properties that aren't relevant
    static CONFIGURATION = {
        zones : false,
        exclude : {}
    };

    async _preCreate(data, options, user)
    {
        await super._preCreate(data, options, user);

        // Take a copy of the test result that this effect comes from, if any
        // We can't use simply take a reference to the message id and retrieve the test as
        // creating a Test object before actors are ready (scripts can execute before that) throws errors
        this.updateSource({[`system.sourceData.test`] : game.messages.get(options.message)?.system?.test || this.system.sourceData.test});

        let preventCreation = false;
        preventCreation = await this._handleFilter(data, options, user);
        if (preventCreation)
        {
            log(format("WH.EffectFiltered", {name : this.name}), true, this);
            return false;
        }
        preventCreation = await this._handleEffectPrevention(data, options, user);
        if (preventCreation)
        {
            ui.notifications.notify(format("WH.EffectPrevented", {name : this.name}));
            return false; // If avoided is true, return false to stop creation
        }
        preventCreation = await this._handleConditionCreation(data, options, user);
        if (preventCreation)
        {
            return false;
        }
        await this._handleItemApplication(data, options, user);

        return await this.handleImmediateScripts(data, options, user);
    }

    async _onDelete(options, user)
    {
        await super._onDelete(options, user);

        if (this.actor)
        {
            ZoneHelpers.updateFollowedEffects(this.actor.getActiveTokens()[0]?.document);
        }
        
        if (game.user.id != user)
        {
            return;
        }

        if (!options.skipDeletingItems)
        {
            await this.deleteCreatedItems();
        }
        if (this.parent)
        {
            await Promise.all(this.parent.runScripts("updateDocument", {options, user}));
        }
        for(let script of this.system.scripts.filter(i => i.trigger == "deleteEffect"))
        {
            await script.execute({options, user});
        }

    }

    async _onUpdate(data, options, user)
    {
        await super._onUpdate(data, options, user);
        if (this.actor)
        {
            ZoneHelpers.updateFollowedEffects(this.actor.getActiveTokens()[0]?.document);
        }

        if (game.user.id != user)
        {
            return;
        }

        // If an owned effect is updated, run parent update scripts
        if (this.parent)
        {
            await Promise.all(this.parent.runScripts("updateDocument", {data, options, user}));
        }

        if (foundry.utils.hasProperty(data, "system.transferData.area.aura.render") && this.actor && this.actor.getActiveTokens().length)
        {
            ui.notifications.warn("WH.Warning.RenderAuraChange", {permanent: true, localize : true});
        }
    }

    async _onCreate(data, options, user)
    {
        await super._onCreate(data, options, user);
        if (this.actor)
        {
            ZoneHelpers.updateFollowedEffects(this.actor.getActiveTokens()[0]?.document);
        }

        if (game.user.id != user)
        {
            return;
        }

        // If an owned effect is created, run parent update scripts
        if (this.parent)
        {
            await Promise.all(this.parent.runScripts("updateDocument", {data, options, user}));
        }
        if (this.actor)
        {
            for(let script of this.system.scripts.filter(i => i.trigger == "onCreate"))
            {
                await script.execute({data, options, user});
            }
        }
    }

    //#region Creation Handling

    async handleImmediateScripts(data, options, user)
    {

        // Block immediate scripts (when zone effect is placed it shouldn't run immediate scripts)
        if (this.system.zone.skipImmediateOnPlacement && this.system.transferData.originalType == "zone")
        {
            return;
        }

        let scripts = this.system.scripts.filter(i => i.trigger == "immediate");
        if (scripts.length == 0)
        {
            return true;
        }

        let run = false;
        // Effect is direct parent, it's always applied to an actor, so run scripts
        if (this.parent?.documentName == "Actor")
        {
            run = true;
        }
        // If effect is grandchild, only run scripts if the effect should apply to the actor
        else if (this.parent?.documentName == "Item" && this.parent?.parent?.documentName == "Actor" && this.transfer)
        {
            run = true;
        }
        // If effect is child of Item, and Item is what it's applying to
        else if (this.parent?.documentName == "Item" && this.system.transferData.documentType == "Item")
        {
            run = true;
        }

        if (run)
        {
            if (scripts.length)
            {                                                // args.actor is often used so include it for compatibility 
                let returnValues = await Promise.all(scripts.map(s => s.execute({actor : this.actor, data, options, user})));
                return !this.system.scripts.every(s => s.options?.deleteEffect) && !returnValues.every(v => v == false);
                // If all scripts agree to delete the effect, or all scripts return false, return false (to prevent creation);
            }
        }
    }

    async _handleEffectPrevention()
    {
        if (this.system.transferData.avoidTest.prevention)
        {
            return this.resistEffect();
        }
    }
    
    /** 
     * This function handles creation of new conditions on an actor
     * If an Item adds a Condition, prevent that condition from being added, and instead call `addCondition` 
     * This prevents the Condition from being removed when the item is removed, but more importantly
     * `addCondition` handles Minor conditions turning into Major if a second Minor is added.
     * @param {object} data effect creation data
     * @param {object} options effect creation options
     * @returns {boolean} Whether to prevent normal creation workflow
     */
    async _handleConditionCreation(data, options)
    {
        // options.condition tells us that it has already gone through addCondition, so this avoids a loop
        if (this.isCondition && !options.condition) 
        {
            // If adding a condition, prevent it and go through `addCondition`      // TODO handle these options
            await this.parent?.addCondition(this.key, this.conditionValue, {origin: this.origin, flags : this.flags});
            return true;
        }
    }

    /**
     * There is a need to support applying effects TO items, but I don't like the idea of actually
     * adding the document to the item, as it would not work with duration handling modules and 
     * would need a workaround to show the icon on a Token. Instead, when an Item type Active Effect
     * is applied, keep it on the actor, but keep a reference to the item(s) being modified (if none, modify all)
     * 
     */
    async _handleItemApplication()
    {
        let transferData = this.system.transferData;
        if (transferData.documentType == "Item" && this.parent?.documentName == "Actor")
        {
            let items = this.parent.items.contents;
            let filter = this.system.filterScript;

            if (!filter && !transferData.prompt)
            {
                this.updateSource({"system.itemTargetData.allItems" : true});
                return;
            }

            // If this effect specifies a filter, narrow down the items according to it
            // TODO this filter only happens on creation, so it won't apply to items added later
            if (filter)
            {
                items = items.filter(i => filter.execute(i)); // Ids of items being affected. If empty, affect all
            }

            // If this effect specifies a prompt, create an item dialog prompt to select the items
            if (transferData.prompt)
            {
                items = await ItemDialog.create(items, "unlimited");
            }


            this.updateSource({"system.itemTargetData.ids" : items.map(i => i.id)});
        }
    }

    async _handleFilter()
    {
        let transferData = this.system.transferData;
        let filter = this.system.filterScript;
        if (!filter)
        {
            return;
        }

        if (transferData.documentType == "Item" && this.parent?.documentName == "Actor")
        {
            return; // See above, _handleItemApplication
        }


        if (this.parent)
        {
            return filter.execute(this.parent);
        }
    }


    async resistEffect()
    {
        let actor = this.actor;

        // If no owning actor, no test can be done
        if (!actor)
        {
            return false;
        }

        let transferData = this.system.transferData;

        // If no test, cannot be avoided
        if (transferData.avoidTest.value == "none")
        {
            return false;
        }

        if (transferData.avoidTest.value == "script")
        {
            let script = new WarhammerScript({label : "Resist " + this.effect, script : transferData.avoidTest.script}, WarhammerScript.createContext(this));
            return await script.execute();
        }
    }

    async runPreApplyScript(args)
    {
        if (!this.system.transferData.preApplyScript)
        {
            return true; // If no preApplyScript, do not prevent applying
        }
        else 
        {
            let script = new WarhammerScript({script : this.system.transferData.preApplyScript, label : `Pre-Apply Script for ${this.name}`, async: true}, WarhammerScript.createContext(this));
            return await script.execute(args);
        }
    }

    /**
     * Delete all items created by scripts in this effect
     * @returns {Array<WarhammerItem>} List of deleted items
     */
    deleteCreatedItems()
    {
        if (this.actor)
        {
            let createdItems = this.getCreatedItems();
            if (createdItems.length)
            {
                ui.notifications.notify(format("WH.DeletingEffectItems", {items : createdItems.map(i => i.name).join(", ")}));
                return this.actor.deleteEmbeddedDocuments("Item", createdItems.map(i => i.id));
            }
        }
        return [];
    }

    getCreatedItems()
    {
        return this.actor.items.filter(i => i.getFlag(game.system.id, "fromEffect") == this.id);
    }

    //#endregion

    prepareData() 
    {
        super.prepareData();

        if (this.system.transferData.enableConditionScript && this.actor)
        {
            this.conditionScript = new WarhammerScript({script : this.system.transferData.enableConditionScript, label : `Enable Script for ${this.name}`}, WarhammerScript.createContext(this));
            this.disabled = !this.conditionScript.execute();
        }

        // Refresh scripts
        this._scripts = undefined;

        if (this.parent?.documentName == "Item")
        {
            this.transfer = this.determineTransfer();
        }
    }

    determineTransfer()
    {
        let application = this.system.transferData;

        let allowed = (application.type == "document" && application.documentType == "Actor");

        if (this.parent.documentName == "Item")
        {
            allowed = allowed && this.item.system.shouldTransferEffect(this);
        }
        
        return allowed;
    }

    // To be applied, some data needs to be changed
    // Convert type to document, as applying should always affect the document being applied
    // Set the origin as the actor's uuid
    // convert name to status so it shows up on the token
    convertToApplied()
    {
        let effect = this.toObject();

        effect.system.transferData.originalType = effect.system.transferData.type;

        // An applied transferred aura should stay as an aura type, but it is no longer transferred
        if (effect.system.transferData.type == "aura" && effect.system.transferData.area.aura.transferred)
        {
            effect.system.transferData.area.aura.transferred = false;
        }

        // An applied transferred follow zone effect should stay as a zone type, but it is no longer transferred
        else if (effect.system.transferData.type == "zone" && effect.system.transferData.zone.type == "follow")
        {
            effect.system.transferData.zone.following = this.actor.getActiveTokens()[0]?.document?.uuid;
            effect.system.transferData.zone.transferred = false;
        }

        else 
        {
            if (effect.system.transferData.type == "damage" && effect.system.transferData.documentType == "Item")
            {
                effect.system.transferData.documentType = "Actor"; // There is never really a case when an item goes through normal damage application. 
            }
            
            effect.system.transferData.type = "document";

        }

        if (this.item)
        {
            effect.system.sourceData.item = this.item.uuid;
        }

        // When transferred to another actor, effects lose their reference to the item it was in
        // So if a effect pulls its avoid test from the item data, it can't, so place it manually
        if (this.system.transferData.avoidTest.value == "item")
        {
            effect.system.transferData.avoidTest.value = "custom";
            foundry.utils.mergeObject(effect.system.transferData.avoidTest, this.item?.getTestData() || {});
        }
    
        effect.origin = this.actor?.uuid || effect.origin;
        effect.statuses = effect.statuses.length ? effect.statuses : [effect.name.slugify()];

        return effect;
    }

    get scripts()
    {
        return this.system.scripts;
    }

    get item()
    {
        if (this.parent?.documentName == "Item")
        {
            return this.parent;
        }
        else
        {
            return undefined;
        }
    }

    get actor()
    {
        if (this.parent?.documentName == "Item")
        {
            return this.parent.parent;
        }
        else if (this.parent?.documentName == "Actor")
        {
            return this.parent;
        }
        else 
        {
            return undefined;
        }
    }

    get source()
    {
        if (this.parent?.documentName == "Item")
        {
            return this.parent.name;
        }
        else
        {
            return super.sourceName;
        }
    }

    
    get originDocument() 
    {
        return fromUuidSync(this.origin);
    }

    get radius()
    {
        if (typeof this.system.transferData.area.radius === 'number') 
        {
            return this.system.transferData.area.radius;
        }
        return Roll.safeEval(Roll.getFormula(Roll.parse(this.system.transferData.area.radius, {effect : this, actor : this.actor, item : this.item})));
    }

    get key () 
    {
        return Array.from(this.statuses)[0];
    }

    get specifier() 
    {
        return (/^(?<base>.+?)[[|(<](?<specifier>.+?)[\]|)>]$/gm).exec(this.name)?.groups.specifier.trim();
    }

    get baseName() 
    {
        return (/^(?<base>.+?)[[|(<](?<specifier>.+?)[\]|)>]$/gm).exec(this.name)?.groups.base.trim();
    }

    get isCondition() 
    {
        return !!systemConfig().conditions[this.key];
    }

    get testDisplay() 
    {
        return "";
    }

    get manualScripts()
    {
        if (this.disabled)
        {
            return [];
        }
        return this.scripts.filter(i => i.trigger == "manual").map((script, index) => 
        {
            script.index = index; // When triggering manual scripts, need to know the index (listing all manual scripts on an actor is messy)
            return script;
        });
    }

    get sheetButtons() 
    {
        let manualScripts = this.manualScripts;
        return manualScripts.map(s => 
        {
            return {
                label : s.Label,
                type : "manualScript",
                class : "trigger-script",
                uuid : s.effect.uuid,
                path : s.effect.getFlag(game.system.id, "path"),
                index : s.index
            };
        });
    }

    get sourceTest() 
    {
        let test = this.system.sourceData.test;
        if (test instanceof WarhammerTestBase)
        {
            return test;
        }
        else 
        {
            return test.data;
        }
    }

    get sourceActor() 
    {
        return this.sourceTest ? CONFIG.ChatMessage.documentClass.getSpeakerActor(this.sourceTest.context.speaker) : this.sourceItem?.actor;
    }

    get sourceItem() 
    {
        return fromUuidSync(this.system.sourceData.item);
    }

    get sourceZone()
    {
        return fromUuidSync(this.system.sourceData.zone);
    }

    get sourceArea()
    {
        return fromUuidSync(this.system.sourceData.area);
    }

    static getCreateData(effectData, overlay=false)
    {
        const createData = foundry.utils.deepClone(effectData);
        if ( overlay ) 
        {
            createData.flags = {core : {overlay : true}};
        }
        if (!createData.duration)
        {
            createData.duration = {};
        }
        delete createData.id;
        return createData;
    }
}