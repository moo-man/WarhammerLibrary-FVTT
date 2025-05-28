import ChoiceConfigV2 from "../apps/choice-config";
import ChoiceDecision from "../apps/choice-decision";
import WarhammerSheetMixin from "./mixin";

export class WarhammerItemSheet extends WarhammerSheetMixin(foundry.appv1.sheets.ItemSheet)
{
    async _render(force, options)
    {
        await super._render(force, options);
        this.modifyHTML();
    }

    activateListeners(html) 
    {
        super.activateListeners(html);
        if (!this.isEditable)
        {
            return false;
        }
        html.find(".choice-config").click(this._onChoiceConfig.bind(this));
        html.find(".choice-decision").click(this._onChoiceDecision.bind(this));
    }


    _onChoiceConfig(ev) 
    {
        new ChoiceConfigV2(this.item, {path : ev.currentTarget.dataset.path}).render(true);
    }

    _onChoiceDecision(ev) 
    {
        new ChoiceDecision(foundry.utils.getProperty(this.item.system, ev.currentTarget.dataset.path)).render(true);
    }
}