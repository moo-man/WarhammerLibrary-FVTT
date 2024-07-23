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
            effectButtons: "modules/warhammer-lib/templates/partials/effect-buttons.hbs",
            scriptButtons: "modules/warhammer-lib/templates/partials/manual-scripts.hbs",
            independentButtons: "modules/warhammer-lib/templates/partials/independent-effects.hbs"
        });
    });
}