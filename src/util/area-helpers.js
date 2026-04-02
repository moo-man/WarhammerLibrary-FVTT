import TokenHelpers from "./token-helpers";
import { log, sleep } from "./utility";

export default class AreaHelpers 
{
    static semaphore = new foundry.utils.Semaphore();


    // Checks a token's current zone and zone effects, adding and removing them
    static async checkTokenUpdate(token, update, options, user)
    {
        let currentRegions = [...token.regions].map(i => i.id);
        let priorRegions = options._priorRegions?.[token.id] || [];
        let changedRegion = !(currentRegions.every(rId => priorRegions.includes(rId)) && priorRegions.every(rId => currentRegions.includes(rId)));

        if (user == game.user.id &&changedRegion)
        {
            await this.checkTokenRegionEffects(token);
        }
    }

    static async checkRegionUpdate(region, update, options, user)
    {
        // players can't manage token effects, so only the active GM should add/remove area effects
        if (game.users.activeGM.id == game.user.id && !options?.skipRegionCheck)
        {
            // Tokens that are now in the template or have effects from this template
            let tokens = Array.from(region.tokens).concat(token => region.parent.tokens.contents.filter(token.actor?.effects.find(e => e.system.sourceData.area == region.uuid)));
            for(let token of tokens)
            {
                this.semaphore.add(this.checkTokenRegionEffects.bind(this), token);
            }
        }
    }

    static async checkRegionCreate(region, options, user)
    {
        // players can't manage token effects, so only the active GM should add/remove area effects
        if (game.users.activeGM.id == game.user.id && !options?.skipRegionCheck)
        {
            // Tokens that are now in the template or have effects from this template
            let tokens = Array.from(region.tokens).concat(token => region.parent.tokens.contents.filter(token.actor?.effects.find(e => e.system.sourceData.area == region.uuid)));
            for(let token of tokens)
            {
                this.semaphore.add(this.checkTokenRegionEffects.bind(this), token);
            }


            if (region.getFlag(game.system.id, "instantaneous"))
            {
                // Wait for semaphore to finish before removing effect data from the template
                // Not really ideal but I don't know of a way to await the semaphore
                let poll = setInterval(((semaphore) => 
                {
                    log("Checking semaphore...");    
                    if (!semaphore.remaining)
                    {
                        log("Semaphore finished");    
                        region.setFlag(game.system.id, "effectData", null);
                        clearInterval(poll);
                    }
                }), 500, this.semaphore);

            }
            
        }

    }

    static async checkRegionDelete(region, options, user)
    {
        // players can't manage token effects, so only the active GM should add/remove area effects
        if (game.users.activeGM.id == game.user.id && !options?.skipRegionCheck)
        {
            // Tokens that have effects from this template
            let tokens = region.parent?.tokens.contents.filter(token => token.actor?.effects.find(e => e.system.sourceData.area == region.uuid));
            for(let token of tokens)
            {
                this.semaphore.add(this.checkTokenRegionEffects.bind(this), token);
            }
        }

    }

    static async checkTokenRegionEffects(token)
    {
        if (!token.actor) {return;}

        let inRegions = Array.from(token.regions);
        let effects = Array.from(token.actor?.effects);
        let regionEffects = [];
        inRegions.forEach(region => 
        {
            let regionEffect = region.regionEffect();
            let auraData = region.getFlag(game.system.id, "aura");
            // If the effect exists, only add the area effect if the area is not an aura OR this isn't the owner of the aura and it's not a transferred aura
            // in other words, if the aura is transferred, apply to owner of the aura. If it's a constant aura, don't add the effect to the owner
            if (regionEffect && (!auraData || auraData.owner != token.actor?.uuid || auraData.transferred))
            {
                regionEffects.push(regionEffect);
            }
        });

        // Remove all area effects that reference an area the token is no longer in
        let toDelete = effects.filter(e => e.system.sourceData.area && !inRegions.map(i => i.uuid).includes(e.system.sourceData.area) && !e.system.transferData.area.keep).map(e => e.id);

        // filter out all area effects that are already on the actor
        let toAdd = regionEffects.filter(ae => !token.actor?.effects.find(e => e.system.sourceData.area == ae.system.sourceData.area));
    
        if (toDelete.length)
        {
            await token.actor?.deleteEmbeddedDocuments("ActiveEffect", toDelete);
        }
        if (toAdd.length)
        {
            await token.actor?.applyEffect({effects : toAdd});
        }
        // If an effect from this area was not found, add it. otherwise ignore
    }

}