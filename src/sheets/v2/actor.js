import WarhammerSheetMixinV2 from "./mixin";

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export default class WarhammerActorSheetV2 extends WarhammerSheetMixinV2(HandlebarsApplicationMixin(ActorSheetV2))
{

    static DEFAULT_OPTIONS = {
        classes: ["actor"],
        actions: {
            createItem : this._onCreateItem
        }
    };

    static TABS = {

    };

    async _onDropItem(data)
    {
        let document = await fromUuid(data.uuid);
        return await this.document.createEmbeddedDocuments(data.type, [document]);
    }

    async _onDropActiveEffect(data)
    {
        let document = await fromUuid(data.uuid);
        return await this.document.createEmbeddedDocuments(data.type, [document]);
    }

    async _prepareContext(options) 
    {
        let context = await super._prepareContext(options);
        context.actor = this.actor;
        context.items = this.actor.itemTypes;
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
            if (e.isCondition) 
            {
                context.effects.conditions.push(e);
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

    _getConditionData(context) 
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

    async _onCreateItem(ev) 
    {
        let type = ev.currentTarget.dataset.type;
        this.document.createEmbeddedDocuments("Item", [{type, name : `New ${CONFIG.Item.typeLabels[type]}`}]).then(item => item[0].sheet.render(true));
    }

    //#endregion
}
