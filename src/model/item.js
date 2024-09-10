import { BaseWarhammerModel } from "./base";

export class BaseWarhammerItemModel extends BaseWarhammerModel 
{

    computeOwned() 
    {
        
    }

    async allowCreation(data, options, user)
    {
        if (this.parent.actor)
        {
            return this.parent.actor.system.itemIsAllowed(this.parent);
        }
        else 
        {
            return true;
        }
    }

    effectIsApplicable(effect) 
    {
        return !effect.disabled;
    }

    // If an item effect is disabled it should still transfer to the actor, so that it's visibly disabled
    shouldTransferEffect() 
    {
        return true;
    }
}
