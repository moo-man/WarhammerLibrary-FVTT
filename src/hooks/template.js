import AreaHelpers from "../util/area-helpers";

/**
 *
 */
export default function () 
{
    Hooks.on("preUpdateToken", AreaHelpers.setTokenAreas.bind(AreaHelpers));
    Hooks.on("updateToken", AreaHelpers.checkTokenUpdate.bind(AreaHelpers));
    Hooks.on("createMeasuredTemplate", AreaHelpers.checkAreaCreate.bind(AreaHelpers));
    Hooks.on("refreshMeasuredTemplate", AreaHelpers.refreshArea.bind(AreaHelpers));
    Hooks.on("updateMeasuredTemplate", AreaHelpers.checkAreaUpdate.bind(AreaHelpers));
    Hooks.on("deleteMeasuredTemplate", AreaHelpers.checkAreaDelete.bind(AreaHelpers));
}