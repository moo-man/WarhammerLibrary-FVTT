import AreaHelpers from "../util/area-helpers";

/**
 *
 */
export default function () 
{
    Hooks.on("updateToken", AreaHelpers.checkTokenUpdate.bind(AreaHelpers));
    Hooks.on("createToken", (token, options, user) => AreaHelpers.checkTokenUpdate.bind(AreaHelpers)(token, {}, options, user));
    Hooks.on("createRegion", AreaHelpers.checkRegionCreate.bind(AreaHelpers));
    Hooks.on("updateRegion", AreaHelpers.checkRegionUpdate.bind(AreaHelpers));
    Hooks.on("deleteRegion", AreaHelpers.checkRegionDelete.bind(AreaHelpers));
}