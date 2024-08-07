import WarhammerSheetMixin from "./mixin";

export class WarhammerItemSheet extends WarhammerSheetMixin(ItemSheet) 
{
    async _render(force, options)
    {
        await super._render(force, options);
        this.modifyHTML();
    }
}