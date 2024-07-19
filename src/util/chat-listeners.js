import AreaTemplate from "./area-template";

export default class WarhammerChatListeners 
{

    static async onApplyTargetEffect(event) 
    {

        let applyData = {};
        let uuid = event.target.dataset.uuid;
        let effectPath = event.target.dataset.path;
        let messageId = $(event.currentTarget).parents('.message').attr("data-message-id");
        let message = game.messages.get(messageId);
        let test = message.getTest();
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
    
    static async _onPlaceAreaEffect(event) 
    {
        let messageId = $(event.currentTarget).parents('.message').attr("data-message-id");
        let effectUuid = event.currentTarget.dataset.uuid;
    
        let test = game.messages.get(messageId).getTest();
        let radius;
        if (test?.result.overcast?.usage.target)
        {
            radius = test.result.overcast.usage.target.current;
    
            if (test.spell)
            {
                radius /= 2; // Spells define their diameter, not radius
            }
        }
    
        let effect = await fromUuid(effectUuid);
        if (!(await effect.runPreApplyScript({test})))
        {
            return;
        }
        let template = await AOETemplate.fromEffect(effectUuid, messageId, radius);
        await template.drawPreview(event);
    }

    // static async _onApplyTargetEffect(event) 
    // {

    //     let applyData = {};
    //     let uuid = event.target.dataset.uuid;
    //     let effect = await fromUuid(uuid);
    //     if (effect) 
    //     {
    //         applyData = { effectData: [effect.convertToApplied()] };
    //     }
    //     else 
    //     {
    //         return ui.notifications.error("Unable to find effect to apply");
    //     }
    
    //     // let effect = actor.populateEffect(effectId, item, test)
    
    //     let targets = Array.from(game.user.targets).map(t => t.actor);    
    //     if (!(await effect.runPreApplyScript({targets})))
    //     {
    //         return;
    //     }
    //     game.user.updateTokenTargets([]);
    //     game.user.broadcastActivity({ targets: [] });
    
    //     for (let target of targets) 
    //     {
    //         await target.applyEffect(applyData);
    //     }
    // }
    
    // static async _onPlaceAreaEffect(event) 
    // {
    //     let effectUuid = event.currentTarget.dataset.uuid;
    //     let effect = await fromUuid(effectUuid);
    //     if (!(await effect.runPreApplyScript()))
    //     {
    //         return;
    //     }
    //     let template = await AreaTemplate.fromEffect(effectUuid);
    //     await template.drawPreview(event);
    // }
}