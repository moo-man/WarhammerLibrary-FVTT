export class CombatHelpers 
{

    combatStart(combat, data)
    {

    }

    static async updateCombat(combat, update, options, user) 
    {

        for(let actor of combat.combatants.map(i => i.actor))
        {
            actor.runScripts("updateCombat", {combat}, true);
        }

        if (options.direction == 1)
        {
            let previousCombatant = combat.combatants.get(combat.previous.combatantId);
            if (previousCombatant) 
            {
                await Promise.all(previousCombatant.actor.runScripts("endTurn", {combat}, true));
                Hooks.callAll(game.system.id + ":endTurn", combat);
            }
            if (combat.combatant) 
            {
                await Promise.all(combat.combatant.actor.runScripts("startTurn", {combat}, true));
                Hooks.callAll(game.system.id + ":startTurn", combat);
            }
        }
        // TODO start round and end round

    }
}