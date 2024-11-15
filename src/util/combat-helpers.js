export class CombatHelpers
{
    static startCombat = [];
    static endCombat = [];
    
    static startTurn = [];
    static endTurn = [];
    
    static startRound = [];
    static endRound = [];

    // When scripts run, trackers record what round it was executed and prevent them from running again on that same round. 
    // So if some "Start Turn" effect runs on some combatant on Round 2, it can only run again on that combatant on Round 3, then 4, etc. 
    static trackers = {};
    static _blankTracker = {
        startTurn : {},
        endTurn : {},
        startRound : 0,
        endRound : 0,
        endCombat : {},
    };



    static combatStart(combat, data)
    {

        for(let combatant of combat.combatants)
        {
            combatant.actor.runScripts("startCombat", {combat}, true);
            this.trackers[combat.id] = foundry.utils.deepClone(this._blankTracker);
            combatant.actor.runScripts("startRound", {combat}, true);
        }
        this.trackers[combat.id].startRound = 1;
        this.startCombat.forEach(fn => fn(combat,  data));
    }

    static deleteCombat(combat, data)
    {
        for(let actor of combat.combatants.map(i => i.actor))
        {
            actor.runScripts("endCombat", {combat}, true);
        }
        this.endCombat.forEach(fn => fn(combat,  data));
    }

    static async updateCombat(combat, update, options, user) 
    {
        if (foundry.utils.hasProperty(update, "turn") || foundry.utils.hasProperty(update, "round"))
        {
            for(let actor of combat.combatants.map(i => i.actor))
            {
                actor.runScripts("updateCombat", {combat}, true);
            }
        }

        if (options.direction == 1)
        {
            let previousCombatant = combat.combatants.get(combat.previous.combatantId);
            let tracker = this.trackers[combat.id];

            // Might need to reinitialize tracker if user refreshed
            if (!tracker)
            {
                this.trackers[combat.id] = foundry.utils.deepClone(this._blankTracker);
                tracker = this.trackers[combat.id];
            }
            if (previousCombatant) 
            {
                if (!tracker.endTurn[previousCombatant.id]  || tracker.endTurn[previousCombatant.id] < combat.round)
                {
                    await Promise.all(previousCombatant.actor.runScripts("endTurn", {combat}, true));
                    Hooks.callAll(game.system.id + ":endTurn", combat);
                    this.endTurn.forEach(fn => fn(combat, update, options, user));
                    tracker.endTurn[previousCombatant.id] = combat.round;
                }
            }
            if (combat.combatant) 
            {
                if (!tracker.startTurn[combat.combatant.id] || tracker.startTurn[combat.combatant.id] < combat.round)
                {
                    await Promise.all(combat.combatant.actor.runScripts("startTurn", {combat}, true));
                    Hooks.callAll(game.system.id + ":startTurn", combat);
                    this.startTurn.forEach(fn => fn(combat, update, options, user));
                    tracker.startTurn[combat.combatant.id] = combat.round;
                }
            }

            if (update.round && update.turn == 0)
            {
                if (!tracker.endRound < combat.round)
                {
                    for(let combatant of combat.combatants)
                    {
                        await Promise.all(combatant.actor.runScripts("endRound", {combat}, true));
                    }
                    this.endRound.forEach(fn => fn(combat, update, options, user));
                    tracker.endRound = combat.round;
                }

                if (!tracker.startRound < combat.round)
                {
                    for(let combatant of combat.combatants)
                    {
                        await Promise.all(combatant.actor.runScripts("startRound", {combat}, true));
                    }
                    this.startRound.forEach(fn => fn(combat, update, options, user));
                    tracker.startRound = combat.round;
                }
            }
        }
    }
}