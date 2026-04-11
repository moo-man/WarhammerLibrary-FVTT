import ZoneHelpers from "../util/zone-helpers";

/**
 *
 */
export default function () 
{
    Hooks.on("updateToken", ZoneHelpers.checkTokenUpdate.bind(ZoneHelpers));
    Hooks.on("updateRegion", ZoneHelpers.checkZoneUpdate.bind(ZoneHelpers));

    Hooks.on("createToken", ZoneHelpers.updateFollowedEffects.bind(ZoneHelpers));
    Hooks.on("deleteToken", ZoneHelpers.updateFollowedEffects.bind(ZoneHelpers));

    Hooks.on("activateSceneControls", ZoneHelpers.addZoneConversionButtons.bind(ZoneHelpers));
}