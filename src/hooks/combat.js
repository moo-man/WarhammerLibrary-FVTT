import { CombatHelpers } from "../util/combat-helpers";

export default function() 
{
    Hooks.on("updateCombat", CombatHelpers.updateCombat.bind(CombatHelpers));
    Hooks.on("combatStart", CombatHelpers.combatStart.bind(CombatHelpers));
    Hooks.on("deleteCombat", CombatHelpers.deleteCombat.bind(CombatHelpers));

    Hooks.on("renderCombatTracker", (app, html) => 
    {
        warhammer.utility.replacePopoutTokens(html);
    });
}