import AreaTemplate from "../util/area-template";
import ZoneHelpers from "../util/zone-helpers";
import WarhammerSheetMixin from "./mixin";

export class WarhammerActorSheet extends WarhammerSheetMixin(ActorSheet) 
{

    activateListeners(html)
    {
        super.activateListeners(html);
        html.on("click", ".trigger-script", this._onTriggerScript.bind(this));
        html.on("click", ".apply-target", this._onApplyTargetEffect.bind(this));
        html.on("click", ".place-area", this._onPlaceAreaEffect.bind(this));
        html.on("click", ".apply-zone", this._onApplyZoneEffect.bind(this));
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
        let applyData = {};
        let uuid = ev.target.dataset.uuid;
        let effect = await fromUuid(uuid);
        if (effect) 
        {
            applyData = { effectData: [effect.convertToApplied()] };
        }
        else 
        {
            return ui.notifications.error("Unable to find effect to apply");
        }
    
        // let effect = actor.populateEffect(effectId, item, test)
    
        let targets = Array.from(game.user.targets).map(t => t.actor);    
        if (!(await effect.runPreApplyScript({targets, effectData : applyData[0]})))
        {
            return;
        }
        game.user.updateTokenTargets([]);
        game.user.broadcastActivity({ targets: [] });
    
        for (let target of targets) 
        {
            await target.applyEffect(applyData);
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
            return ui.notifications.error("Unable to find effect to apply");
        }
        if (!(await effect.runPreApplyScript({effectData})))
        {
            return;
        }
        let template = await AreaTemplate.fromEffect({effectData});
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
            return ui.notifications.error("Unable to find effect to apply");
        }
        if (!(await effect.runPreApplyScript({effectData})))
        {
            return;
        }
        ZoneHelpers.promptZoneEffect({effectData : [effectData]});
    };
}