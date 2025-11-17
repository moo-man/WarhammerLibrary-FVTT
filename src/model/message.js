import AreaTemplate from "../util/area-template";
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

        await Promise.all(
            targets.map(target => target.applyEffect(applyData))
        );
    }

    static async onPlaceAreaEffect(ev, target) 
    {
        let effectUuid = target.dataset.uuid;
        let effect = await fromUuid(effectUuid);
        if (!(await effect.runPreApplyScript()))
        {
            return;
        }
        let template = await AreaTemplate.fromEffect(effectUuid, this.parent.id);
        await template.drawPreview(ev);
    }
    
    static async onApplyZoneEffect(ev, target) 
    {
        let test = this.test;
        let effect = await fromUuid(target.dataset.uuid);
        if (!(await effect.runPreApplyScript({test})))
        {
            return;
        }
        ZoneHelpers.promptZoneEffect({effectUuids: target.dataset.uuid}, this.parent.id);
    };
}