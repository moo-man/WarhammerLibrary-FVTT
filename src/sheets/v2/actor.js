import AreaTemplate from "../../util/area-template";
import ZoneHelpers from "../../util/zone-helpers";
import WarhammerSheetMixinV2 from "./mixin";

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export default class WarhammerActorSheetV2 extends WarhammerSheetMixinV2(HandlebarsApplicationMixin(ActorSheetV2))
{

    static DEFAULT_OPTIONS = {
        classes: ["actor"],
        actions: {
            createItem : this._onCreateItem,
            triggerScript : this._onTriggerScript,
            editImage : this._onEditImage
        }
    };

    static TABS = {

    };

    async _onDropItem(data, ev)
    {
        let document = data.uuid ? await fromUuid(data.uuid) : data.data;
        if (document.actor?.uuid == this.actor.uuid)
        {
            this._onSortItem(document, ev);
        }
        else 
        {
            return await this.document.createEmbeddedDocuments(data.type, [document]);
        }
    }

    async _onDropActiveEffect(data)
    {
        let document = await fromUuid(data.uuid);
        return await this.document.createEmbeddedDocuments(data.type, [document]);
    }

    async _onSortItem(document, event)
    {
        let target = await this._getDocument(event);
        if (target)
        {
            let siblings = Array.from(this._getParent(event.target, ".list-content").querySelectorAll(".list-row")).map(i => fromUuidSync(i.dataset.uuid)).filter(i => document.uuid != i.uuid);
            let sorted = SortingHelpers.performIntegerSort(document, {target, siblings});
            this.actor.updateEmbeddedDocuments(document.documentName, sorted.map(s => 
            {
                return foundry.utils.mergeObject({
                    _id : s.target.id,
                }, s.update);
            }));
        }
    }

    async _prepareContext(options) 
    {
        let context = await super._prepareContext(options);
        context.actor = this.actor;
        context.items = foundry.utils.deepClone(this.actor.itemTypes);
        Object.keys(context.items).forEach(type => 
        {
            context.items[type] = context.items[type].sort((a, b) => a.sort > b.sort ? 1 : -1);
        });
        return context;
    }

    //#region Effects

    _prepareEffectsContext(context) 
    {
        context.effects = {};
        context.effects.conditions = this._getConditionData();
        context.effects.temporary = [];
        context.effects.passive = [];
        context.effects.disabled = [];

        for (let e of Array.from(this.actor.allApplicableEffects(true))) 
        {
            if (!e.show)
            {
                continue;
            }
            else if (e.disabled) 
            {
                context.effects.disabled.push(e);
            }
            else if (e.isTemporary) 
            {
                context.effects.temporary.push(e);
            }
            else 
            {
                context.effects.passive.push(e);
            }
        }
    }

    _getConditionData() 
    {
        try 
        {
            let conditions = foundry.utils.duplicate(game.wfrp4e.config.statusEffects).map(e => new CONFIG.ActiveEffect.documentClass(e));
            let currentConditions = this.actor.effects.filter(e => e.isCondition);
      
            for (let condition of conditions) 
            {
                let owned = currentConditions.find(e => e.conditionId == condition.conditionId);
                if (owned) 
                {
                    condition.existing = true;
                }
            }
            return conditions;
        }
        catch (e)
        {
            ui.notifications.error("Error Adding Condition Data: " + e);
        }
    }

    static async _onTriggerScript(ev)
    {
        let effect = await this._getDocumentAsync(ev);

        // Non-database effect
        if (!effect && ev.target.dataset.path)
        {
            let item = fromUuidSync(ev.target.dataset.uuid.replace(".ActiveEffect.", ""));
            if (item)
            {
                effect = foundry.utils.getProperty(item, ev.target.dataset.path);
            }
        }
        if (ev.target.dataset.type == "manualScript")
        {
            let script = effect.manualScripts.find(i => i.index == Number(ev.target.dataset.index));
            if (script)
            {
                script.execute({actor : this.actor});
            }
        }
        else 
        {
            switch(ev.target.dataset.type)
            {
            case "target" : 
                return this._onApplyTargetEffect(effect);
            case "area" : 
                return this._onPlaceAreaEffect(effect);
            case "zone" : 
                return this._onApplyZoneEffect(effect);
            }
        }
    }

    static async _onCreateItem(ev) 
    {
        let type = this._getParent(ev.target, "[data-type]").dataset.type;
        this.document.createEmbeddedDocuments("Item", [{type, name : `New ${game.i18n.localize(CONFIG.Item.typeLabels[type])}`}]).then(item => item[0].sheet.render(true));
    }

    async _onApplyTargetEffect(effect) 
    {
        let effectData;
        if (effect) 
        {
            effectData = effect.convertToApplied();
        }
        else 
        {
            return ui.notifications.error("Unable to find effect to apply");
        }
    
        // let effect = actor.populateEffect(effectId, item, test)
    
        let targets = Array.from(game.user.targets).map(t => t.actor);    
        if (effectData.system.transferData.selfOnly)
        {
            targets = [effect.actor];
        }
        if (!(await effect.runPreApplyScript({targets, effectData})))
        {
            return;
        }
        game.user.updateTokenTargets([]);
        game.user.broadcastActivity({ targets: [] });
    
        for (let target of targets) 
        {
            await target.applyEffect({effectData});
        }
    }
    
    async _onPlaceAreaEffect(effect) 
    {
        let effectData = {};
        if (effect) 
        {
            effectData = effect.convertToApplied();
        }
        else 
        {
            return ui.notifications.error("Unable to find effect to apply");
        }
        if (!(await effect.runPreApplyScript({effectData})))
        {
            return;
        }
        let template = await AreaTemplate.fromEffect(effect.uuid, null, null, foundry.utils.diffObject(effectData, effect.convertToApplied()));
        await template.drawPreview();
    }

    async _onApplyZoneEffect(effect) 
    {
        let effectData = {};
        if (effect) 
        {
            effectData = effect.convertToApplied();
        }
        else 
        {
            return ui.notifications.error("Unable to find effect to apply");
        }
        if (!(await effect.runPreApplyScript({effectData})))
        {
            return;
        }
        ZoneHelpers.promptZoneEffect({effectData : [effectData]});
    };

    // TODO: Remove in V13
    static async _onEditImage(event) 
    {
        const attr = event.target.dataset.edit;
        const current = foundry.utils.getProperty(this.document, attr);
        const fp = new FilePicker({
            current,
            type: "image",
            callback: path => 
            {
                this.document.update({img : path});
            },
            top: this.position.top + 40,
            left: this.position.left + 10
        });
        await fp.browse();
    }

    //#endregion
}
