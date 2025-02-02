import AreaTemplate from "./area-template";
import ZoneHelpers from "./zone-helpers";
import { localize } from "./utility";

export default class WarhammerChatListeners 
{

    static async onApplyTargetEffect(ev) 
    {

        let applyData = {};
        let uuid = ev.currentTarget.dataset.uuid;
        let effectPath = ev.currentTarget.dataset.path;
        let messageId = $(ev.currentTarget).parents('.message').attr("data-message-id");
        let message = game.messages.get(messageId);
        let test = message.system.test;
        let actor = test?.actor ?? message.system.actor;
        let item = test?.item ?? message.system.item;
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
            return ui.notifications.error(localize("WH.ErrorUnableToFindEffect"));
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
        
        game.user.updateTokenTargets([]);
        game.user.broadcastActivity({ targets: [] });
                  
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