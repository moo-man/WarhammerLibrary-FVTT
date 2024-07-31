import ZoneHelpers from "../util/zone-helpers";

/**
 *
 */
export default function () 
{
    Hooks.on("updateToken", ZoneHelpers.checkTokenUpdate.bind(ZoneHelpers));
}