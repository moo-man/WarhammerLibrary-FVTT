export class WarhammerTestBase
{
    async runPreScripts()
    {
        await Promise.all(this.actor.runScripts("preRollTest", this));
    }

    async runPostScripts()
    {
        await Promise.all(this.actor.runScripts("rollTest", this));
    }

    get targetEffects() 
    {
        return this.item.targetEffects;
    }

    get damageEffects() 
    {
        return this.item.damageEffects;
    }

    get zoneEffects() 
    {
        return this.item.zoneEffects;
    }

    get areaEffects() 
    {
        return this.item.areaEffects;
    }
    
};