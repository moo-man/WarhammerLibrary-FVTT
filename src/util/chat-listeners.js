import AreaTemplate from "./area-template";
import ZoneHelpers from "./zone-helpers";

export default class WarhammerChatListeners 
{

    static async onApplyTargetEffect(ev) 
    {

        let applyData = {};
        let uuid = ev.target.dataset.uuid;
        let effectPath = ev.target.dataset.path;
        let messageId = $(ev.currentTarget).parents('.message').attr("data-message-id");
        let message = game.messages.get(messageId);
        let test = message.system.test;
        let actor = test.actor;
        let item = test.item;
        let effect;
    
        if (!actor.isOwner)
        {return ui.notifications.error("CHAT.ApplyError");}
    
    
        if (effectPath)
        {
            effect = foundry.utils.getProperty(item, effectPath);
            applyData = {effectData : [effect.toObject()]};
        }
        else if (uuid)
        {
            applyData = {effectUuids : uuid};
            effect = await fromUuid(uuid);
        }
        else 
        {
            return ui.notifications.error("Unable to find effect to apply");
        }
    
        // let effect = actor.populateEffect(effectId, item, test)
        
        let targets = (game.user.targets.size ? Array.from(game.user.targets) : test.targetTokens).map(t => t.actor);
    
        if (!(await effect.runPreApplyScript({test, targets})))
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
        let effectUuid = ev.currentTarget.dataset.uuid;
        let effect = await fromUuid(effectUuid);
        if (!(await effect.runPreApplyScript()))
        {
            return;
        }
        let template = await AreaTemplate.fromEffect(effectUuid);
        await template.drawPreview(ev);
    }
    
    static async onApplyZoneEffect(ev) 
    {
        let el = $(ev.currentTarget);
        let message = game.messages.get(el.parents(".message").attr("data-message-id"));
        let test = message.system.test;
        let effect = await fromUuid(ev.currentTarget.dataset.uuid);
        if (ev.currentTarget.dataset.type == "zone")
        {
            if (!(await effect.runPreApplyScript({test})))
            {
                return;
            }
            ZoneHelpers.promptZoneEffect(ev.currentTarget.dataset.uuid, message.id);
        }            
    };
}