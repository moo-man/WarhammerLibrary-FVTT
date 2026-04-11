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
        let messageId = this.parent.id;
        let test = this.test;
        let actor = test?.actor ?? this.actor;
      
        if (!actor.isOwner)
        {return ui.notifications.error("CHAT.ApplyError");}
      
        let effect = await this._getEffect(target.dataset);

        applyData = {effectData : [effect.convertToApplied(test)]};
          
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
        let effect = await this._getEffect(target.dataset);
        if (!(await effect.runPreApplyScript()))
        {
            return;
        }
        let template = await AreaTemplate.fromEffect({effect}, this.parent.id);
        await template.drawPreview(ev);
    }
    
    static async onApplyZoneEffect(ev, target) 
    {
        let effect = await this._getEffect(target.dataset);
        if (!(await effect.runPreApplyScript()))
        {
            return;
        }
        ZoneHelpers.promptZoneEffect({effectData: effect.convertToApplied()}, this.parent.id);
    };

    async _getEffect({uuid, id, path})
    {
        let test = this.test;
        let item = test?.item ?? this.item;
        let effect = await fromUuid(uuid);

        if (!effect && path)
        {
            effect = foundry.utils.getProperty(item, path);
        }
        else if (!effect && id)
        {
            effect = item.effects.get(id);
        }
        
        if (!effect)
        {
            ui.notifications.error("WH.ErrorUnableToFindEffect", {localize: true});
            throw new Error("WH.ErrorUnableToFindEffect");
        }
        
        return effect;
    }
}