import { systemConfig } from "../util/utility";

/**
 *
 */
export default function () 
{
    Hooks.on("ready", () => 
    {
        foundry.applications.handlebars.loadTemplates({
            avoidTestDetails: systemConfig().avoidTestTemplate,
            dialogModifiers: "modules/warhammer-lib/templates/partials/dialog-modifiers.hbs",
            effectButtons: "modules/warhammer-lib/templates/partials/effect-buttons.hbs",
            scriptButtons: "modules/warhammer-lib/templates/partials/manual-scripts.hbs",
            independentButtons: "modules/warhammer-lib/templates/partials/independent-effects.hbs",
            sheetTabs: "modules/warhammer-lib/templates/partials/sheet-tabs.hbs",
            sheetButtons: "modules/warhammer-lib/templates/partials/sheet-effect-buttons.hbs",
            sheetButtonsV1: "modules/warhammer-lib/templates/partials/sheet-effect-buttonsV1.hbs",
            choiceDisplay : "modules/warhammer-lib/templates/partials/choice-display.hbs",
            choiceDecision : "modules/warhammer-lib/templates/partials/choice-decision.hbs"
        });
    });
}