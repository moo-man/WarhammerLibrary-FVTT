import { systemConfig } from "../util/utility";

/**
 *
 */
export default function () 
{

    Hooks.on("ready", () => 
    {
        // AOS config needs to be created, so put this in ready
        loadTemplates({            
            avoidTestDetails: systemConfig().avoidTestTemplate,
            dialogModifiers: "modules/warhammer-lib/templates/partials/dialog-modifiers.hbs"
        });
    });
}