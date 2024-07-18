import { localize } from "../util/utility";
import { BaseWarhammerModel } from "./base";

export class BaseWarhammerActorModel extends BaseWarhammerModel 
{

    static preventItemTypes = [];
    static singletonItemTypes = [];

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
}
