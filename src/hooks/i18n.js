import { systemConfig } from "../util/utility";

export default function() 
{
    Hooks.on("i18nInit", () => 
    {
        localizeConfig(systemConfig());
        localizeConfig(CONFIG.statusEffects);
    });
}

// Recursively localize config object
function localizeConfig(object)
{
    if (typeof object == "string")
    {
        return game.i18n.localize(object);
    }
    else if (typeof object == "object")
    {
        for (let key in object)
        {
            object[key] = localizeConfig(object[key]);
        }
        return object;
    }
    else
    {
        return object;
    }
}