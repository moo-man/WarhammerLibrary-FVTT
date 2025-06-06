import AreaTemplate from "../util/area-template";
import { systemConfig } from "../util/utility";
import ZoneHelpers from "../util/zone-helpers";


export class WarhammerMessageModel extends foundry.abstract.DataModel 
{


    async _onCreate(data, options, user)
    { }

    async _onUpdate(data, options, user)
    { }


    static get actions() 
    { 
        return {
            applyTargetEffect : this.onApplyTargetEffect,
            placeAreaEffect : this.onPlaceAreaEffect,
            applyZoneEffect : this.onApplyZoneEffect
        };
    }
  
    static async onApplyTargetEffect(ev, target) 
    {
  
        let applyData = {};
        let uuid = target.dataset.uuid;
        let effectPath = target.dataset.path;
        let messageId = this.parent.id;
        let test = this.test;
        let actor = test?.actor ?? this.actor;
        let item = test?.item ?? this.item;
        let effect;
      
        if (!actor.isOwner)
        {return ui.notifications.error("CHAT.ApplyError");}
      
      
        if (effectPath)
        {
            effect = foundry.utils.getProperty(item, effectPath);
            applyData = {effectData : [effect.convertToApplied(test)]};
        }
        else if (uuid)
        {
            effect = await fromUuid(uuid);
            applyData = {effectData : [effect.convertToApplied(test)]};
        }
        else 
        {
            return ui.notifications.error("WH.ErrorUnableToFindEffect", {localize: true});
        }
          
        let targets = [];
        if (effect.system.transferData.selfOnly)
        {
            targets = [effect.actor ?? test.actor];
        }
        else
        {
            targets = (game.user.targets.size ? Array.from(game.user.targets) : test.targetTokens).map(t => t.actor);
        }
  
        if (!(await effect.runPreApplyScript({test, targets, effectData : applyData.effectData[0]})))
        {
            return;
        }
          
        game.canvas.tokens.setTargets([]);
                    
        applyData.messageId = messageId;
        for(let target of targets)
        {
            await target.applyEffect(applyData);
        }
    }

    static async onPlaceAreaEffect(ev) 
    {
        let messageId = $(ev.currentTarget).parents('.message').attr("data-message-id");
        let effectUuid = ev.currentTarget.dataset.uuid;
        let effect = await fromUuid(effectUuid);
        if (!(await effect.runPreApplyScript()))
        {
            return;
        }
        let template = await AreaTemplate.fromEffect(effectUuid, messageId);
        await template.drawPreview(ev);
    }
    
    static async onApplyZoneEffect(ev) 
    {
        let el = $(ev.currentTarget);
        let message = game.messages.get(el.parents(".message").attr("data-message-id"));
        let test = message.system.test;
        let effect = await fromUuid(ev.currentTarget.dataset.uuid);
        if (!(await effect.runPreApplyScript({test})))
        {
            return;
        }
        ZoneHelpers.promptZoneEffect({effectUuids: ev.currentTarget.dataset.uuid}, message.id);
    };
}