export class CombatHelpers 
{

    static combatStart(combat, data)
    {
        for(let actor of combat.combatants.map(i => i.actor))
        {
            actor.runScripts("startCombat", {combat}, true);
            actor.runScripts("startRound", {combat}, true);
        }
    }

    static deleteCombat(combat, data)
    {
        for(let actor of combat.combatants.map(i => i.actor))
        {
            actor.runScripts("endCombat", {combat}, true);
        }
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

            if (update.round && update.turn == 0)
            {
                for(let actor of combat.combatants.map(i => i.actor))
                {
                    await Promise.all(actor.runScripts("endRound", {combat}, true));
                    await Promise.all(actor.runScripts("startRound", {combat}, true));
                }
            }
        }
        // TODO start round and end round

    }
}