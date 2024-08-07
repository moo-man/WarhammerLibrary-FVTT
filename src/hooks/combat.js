import { CombatHelpers } from "../util/combat-helpers";

export default function() 
{
    Hooks.on("updateCombat", CombatHelpers.updateCombat);
    Hooks.on("combatStart", CombatHelpers.combatStart);
    Hooks.on("deleteCombat", CombatHelpers.deleteCombat);
}