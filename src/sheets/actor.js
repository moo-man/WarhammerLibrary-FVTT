import AreaTemplate from "../util/area-template";
import { localize } from "../util/utility";
import ZoneHelpers from "../util/zone-helpers";
import WarhammerSheetMixin from "./mixin";

export class WarhammerActorSheet extends WarhammerSheetMixin(foundry.appv1.sheets.ActorSheet)
{
    async _render(force, options)
    {
        await super._render(force, options);
        this.modifyHTML();
    }

    activateListeners(html)
    {
        super.activateListeners(html);
        html.on("click", ".trigger-script", this._onTriggerScript.bind(this));
        html.on("click", ".apply-target", this._onApplyTargetEffect.bind(this));
        html.on("click", ".place-area", this._onPlaceAreaEffect.bind(this));
        html.on("click", ".apply-zone", this._onApplyZoneEffect.bind(this));
        html.on("click", ".remove-singleton", this._onRemoveSingleton.bind(this));
    }
    _onTriggerScript(ev)
    {
        let uuid = this._getUUID(ev);
        let index = this._getIndex(ev);
  
        let effect =  fromUuidSync(uuid);
        let script = effect.manualScripts[index];
  
        script.execute({actor : this.document});
    }

    async _onApplyTargetEffect(ev) 
    {
        let uuid = ev.target.dataset.uuid;
        let effect = await fromUuid(uuid);
        let effectData;
        if (effect) 
        {
            effectData = effect.convertToApplied();
        }
        else 
        {
            return ui.notifications.error(localize("WH.ErrorUnableToFindEffect"));
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
        game.canvas.tokens.setTargets([]);
    
        for (let target of targets) 
        {
            await target.applyEffect({effectData});
        }
    }
    
    async _onPlaceAreaEffect(ev) 
    {
        let effectData = {};
        let effectUuid = ev.currentTarget.dataset.uuid;
        let effect = await fromUuid(effectUuid);
        if (effect) 
        {
            effectData = effect.convertToApplied();
        }
        else 
        {
            return ui.notifications.error(localize("WH.ErrorUnableToFindEffect"));
        }
        if (!(await effect.runPreApplyScript({effectData})))
        {
            return;
        }
        let template = await AreaTemplate.fromEffect(effectUuid, null, null, foundry.utils.diffObject(effectData, effect.convertToApplied()));
        await template.drawPreview(ev);
    }

    async _onApplyZoneEffect(ev) 
    {
        let effectData = {};
        let effect = await fromUuid(ev.currentTarget.dataset.uuid);
        if (effect) 
        {
            effectData = effect.convertToApplied();
        }
        else 
        {
            return ui.notifications.error(localize("WH.ErrorUnableToFindEffect"));
        }
        if (!(await effect.runPreApplyScript({effectData})))
        {
            return;
        }
        ZoneHelpers.promptZoneEffect({effectData : [effectData]});
    };

    _onRemoveSingleton(ev)
    {
        let path = this._getPath(ev);

        this.actor.update(foundry.utils.getProperty(this.actor, path)?.delete());
    }
}