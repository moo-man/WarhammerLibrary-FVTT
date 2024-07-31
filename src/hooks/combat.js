import { CombatHelpers } from "../util/combat-helpers";

export default function() 
{
    Hooks.on("updateCombat", CombatHelpers.updateCombat);
}