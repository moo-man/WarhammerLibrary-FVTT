import { localize } from "../util/utility";
import { BaseWarhammerModel } from "./base";

export class BaseWarhammerActorModel extends BaseWarhammerModel 
{

    static preventItemTypes = [];
    static singletonItemPaths = {};

    itemIsAllowed(item)
    {
        if (this.constructor.preventItemTypes.includes(item.type))
        {
            ui.notifications.error(localize("WH.ItemsNotAllowed"), {type : item.type});
            return false;
        }
        else 
        {
            return true;
        }
    }

    updateSingleton(item)
    {
        let singletonPath = this.constructor.singletonItemPaths[item.type];
        if (singletonPath)
        {
            return item.actor.update(foundry.utils.getProperty(this, singletonPath).set(item));
        }
    }
}