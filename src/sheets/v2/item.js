import AreaTemplate from "../../util/area-template";
import ZoneHelpers from "../../util/zone-helpers";
import WarhammerSheetMixinV2 from "./mixin";

const { ItemSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export default class WarhammerItemSheetV2 extends WarhammerSheetMixinV2(HandlebarsApplicationMixin(ItemSheetV2))
{

    static DEFAULT_OPTIONS = {
        classes: ["actor"],
        actions: {

        },
    };

    static TABS = {

    };

    async _prepareContext(options) 
    {
        let context = await super._prepareContext(options);
        return context;
    }

    //#region Effects

    
}
