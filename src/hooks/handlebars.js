import { systemConfig } from "../util/utility";

/**
 *
 */
export default function () 
{

    Hooks.on("ready", () => 
    {
        loadTemplates({            
            avoidTestDetails: systemConfig().avoidTestTemplate,
            dialogModifiers: "modules/warhammer-lib/templates/partials/dialog-modifiers.hbs",
            effectButtons: "modules/warhammer-lib/templates/partials/effect-buttons.hbs"
        });
    });
}