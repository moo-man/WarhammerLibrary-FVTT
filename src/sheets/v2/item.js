import ChoiceConfigV2 from "../../apps/choice-config";
import ChoiceDecision from "../../apps/choice-decision";
import AreaTemplate from "../../util/area-template";
import ZoneHelpers from "../../util/zone-helpers";
import WarhammerSheetMixinV2 from "./mixin";

const { ItemSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export default class WarhammerItemSheetV2 extends WarhammerSheetMixinV2(HandlebarsApplicationMixin(ItemSheetV2))
{

    static DEFAULT_OPTIONS = {
        classes: ["item"],
        window : {
            contentClasses: ["standard-form"]
        },
        actions: {
            configureChoice : this._onConfigureChoice,
            showDecision : this._onShowDecision
        }
    };

    static TABS = {

    };

    get item() 
    {
        return this.document;
    }

    async _prepareContext(options) 
    {
        let context = await super._prepareContext(options);
        context.item = this.item;
        context.actor = this.item.actor;
        return context;
    }

    _prepareEffectsContext(context) 
    {
        let effects = {};
        effects.active = this.item.effects.contents.filter(i => i.active);
        effects.disabled = this.item.effects.contents.filter(i => i.disabled);
        effects.temporary = this.item.actor?.getEffectsApplyingToItem(this.item) || [];
        context.effects = effects;
    }
    

    static _onConfigureChoice(ev, target)
    {
        new ChoiceConfigV2(this.item, {path : target.dataset.path}).render(true);
    }

    static _onShowDecision(ev, target)
    {
        new ChoiceDecision(foundry.utils.getProperty(this.item.system, target.dataset.path)).render(true);
    }


    async _onDropActiveEffect(data, event)
    {
        let document = await ActiveEffect.fromDropData(data);
        if (document?.parent?.uuid != this.document.uuid)
        {
            this.document.createEmbeddedDocuments("ActiveEffect", [document]);
        }
    }


    //#region Effects

    
    //#region Action Handlers


    //#endregion

    
}
