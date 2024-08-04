import ZoneHelpers from "../util/zone-helpers";

/**
 *
 */
export default function () 
{
    Hooks.on("updateToken", ZoneHelpers.checkTokenUpdate.bind(ZoneHelpers));
    Hooks.on("updateRegion", ZoneHelpers.checkZoneUpdate.bind(ZoneHelpers));
}