import ItemDialog from "../apps/item-dialog";
import { SocketHandlers } from "./socket-handlers";
import { getActiveDocumentOwner, sleep, systemConfig } from "./utility";
const {getProperty} = foundry.utils;

const {setProperty, deepClone} = foundry.utils;

export default class ZoneHelpers 
{
    static semaphore = new foundry.utils.Semaphore();

    // Checks a token's current zone and zone effects, adding and removing them
    static async checkTokenUpdate(token, update, options, user)
    {
        this.updateFollowedEffects(token);

        if (user == game.user.id)
        {
            // If every current region ID exists in priorRegions, and every priorRegion ID existis in current, there was no region change 
            let currentRegions = [...token.regions].map(i => i.id);
            let priorRegions = options._priorRegions?.[token.id] || [];
            let changedRegion = !(currentRegions.every(rId => priorRegions.includes(rId)) && priorRegions.every(rId => currentRegions.includes(rId)));

            if (changedRegion)
            {
                this.semaphore.add(this.checkTokenZoneEffects.bind(this), token);
            }
        }
    }

    static async checkZoneUpdate(region, update, options, user)
    {
        if (user == game.user.id && !options?.skipZoneCheck)
        {
            let tokens = [...region.tokens];
            for(let token of tokens)
            {
                this.semaphore.add(this.checkTokenZoneEffects.bind(this), token);
            }
        }

    }

    static updateFollowedEffects(token)
    {
        if (!token)
        {
            return;
        }

        if (game.users.activeGM.id == game.user.id)
        {
            this.semaphore.add(this._handleFollowedEffects.bind(this), token);
        }
    }

    /**
     * This function handles a token's zone effects, it is meant to be called when the token or any zone is updated.
     * When a token or zone is updated, it re-evaluates what zone effects the provided token should have given what
     * zone(s) it is in. 
     * 
     * @param {TokenDocument} token 
     */
    static async checkTokenZoneEffects(token)
    {

        let inZones = Array.from(token.regions);

        // Zone effects will always be applied (non-grandchild) effects
        let effects = Array.from(token.actor.effects);

        // Compile the status effects from the effects of all the zones the token is in. Used later to prevent adding multiple of the same effect. 
        let zoneStatuses = [];
        inZones.forEach(zone => 
        {
            for (let effect of this.getZoneEffects(zone))
            {
                zoneStatuses = zoneStatuses.concat(effect.statuses || []);
            }
        });

        let toAdd = [];
        let toDelete = [];
        
        // Remove all zone effects that reference a zone the token is no longer in
        toDelete = effects.filter(e => e.system.sourceData.zone && !e.system.transferData.zone.keep && e.statuses.every(s => !zoneStatuses.includes(s))).map(e => e.id);
        
        // For each zone, get the effects that should be added to the token
        for(let zone of inZones)
        {
            // All Zone effects
            let effects = this.getZoneEffects(zone);

            // Only include effects that are not following this token (they already have the effect in the first place)
            effects = effects.filter(e => getProperty(e, "system.transferData.zone.following") != token.uuid);

            // Add any zone effects that aren't already on the token
            toAdd = toAdd.concat(effects.filter(i => ![...token.actor.statuses].includes(i.statuses[0])));
        }
         
        if (toDelete.length)
        {
            await token.actor.deleteEmbeddedDocuments("ActiveEffect", toDelete);
        }
        if (toAdd.length)
        {
            await token.actor.applyEffect({effectData: toAdd});
        }
    }


    /**
     * Given a token, update all regions on a scene to have the correct zone effects
     * i.e. removing or adding any followed effects based on token positions. 
     * 
     * Note: This function might be doing too much, it goes through each region, regardless
     * of whether it was part of the token movement.
     * 
     * 
     * @param {TokenDocument} token 
     */
    static async _handleFollowedEffects(token)
    {
        // Effects following theprovided token
        let followedEffects = token?.actor?.followedZoneEffects || [];

        // For each region, add and delete followed effects
        for(let region of token.parent.regions)
        {
            let update = false;

            // Grab the zone effects and specifically the ones that are following a token
            let effects = foundry.utils.deepClone(region.getFlag(game.system.id, "effects")) || [];
            let existingFollowedEffects = effects.filter(e => e.system.transferData.originalType == "zone" && e.system.transferData.zone.following);

            // Using the provided token, add any non-existing followed zone effects to the region if the token is within it
            if (region.tokens.has(token))
            {
                // for each of the provided token's followed effects
                for(let fe of followedEffects)
                {
                    // Only add a followed effect if it doesn't already exist in the zone
                    if (!existingFollowedEffects.find(e => e._id == fe.id))
                    {
                        this.displayScrollingTextForRegion(region, "+" + fe.name);
                        let followedEffectData = fe.convertToApplied();
                        // Followed effects, when added to the zone's flags, turn into normal Zone effects, they are 
                        // distinguished from other effects by having a `following` property that points to the token it came from
                        followedEffectData.system.transferData.zone.type = "zone";
                        effects = effects.concat(followedEffectData);
                        update = true;
                    }
                }
            }

            // List of followed effects that should be removed
            let followedToDelete = [];

            // Check each followed effect on the region, determine whether it should be kept
            for(let existing of existingFollowedEffects)
            {
                let followingToken = fromUuidSync(existing.system.transferData.zone.following);

                // Only keep if the source token exists, the token is in the region, and the token still has the effect itself
                let shouldKeep = followingToken && followingToken.regions.has(region) && followingToken.actor?.followedZoneEffects.find(i => i.id == existing._id);

                if (!shouldKeep)
                {
                    update = true;
                    followedToDelete.push(existing._id);
                    this.displayScrollingTextForRegion(region, "-" + existing.name, true);
                }
            }

            if (followedToDelete.length > 0)
            {
                effects = effects.filter(e => !followedToDelete.includes(e._id));
            }

            if (update)
            {
                await region.update({[`flags.${game.system.id}.effects`] : effects});
            }

        }
    }



    /**
     * Retrieves custom/zone effects from a given region document
     * @param {RegionDocument} zone Zone (Region) 
     * @returns {Array<ActiveEffect>} Zone effects
     */
    static getZoneEffects(zone)
    {
        let effects = systemConfig().getZoneTraitEffects(zone, this.getGreatestTrait);
        // let tokens = Array.from(zone.tokens);

        effects = effects.concat(zone.getFlag(game.system.id, "effects") || []);

        effects.forEach(e => 
        {
            setProperty(e, "system.sourceData.zone", zone.uuid);
            e.origin = zone.uuid;
        });

        return effects;
    }


    // Zone effects can designate traits to add (e.g. a power making a zone a Minor Hazard)
    // This collects all of them into a single trait object
    static _combineTraitsFromEffects(effects, allTraits={})
    {
        for(let effect of effects)
        {
            let effectTraits = effect.system.transferData.zone.traits;

            for(let key in effectTraits)
            {
                if (effectTraits[key])
                {

                    // If effect trait is a boolean, set collection value to true
                    if (typeof effectTraits[key] == "boolean")
                    {
                        allTraits[key] = true;
                    }
                    // If effect trait is a string, compare and only set if effect trait is greater
                    // e.g. if allTraits has mediumCover, and effect specifies heavyCover, use heavyCover if effect specifies lightCover, don't use (medium is greater)
                    else if (this.isGreaterTrait(effectTraits[key], allTraits[key]))
                    {
                        allTraits[key] = effectTraits[key];
                    }
                }
            }
        }
        return allTraits;
    }
    
    // returns true if trait1 is greater than trait2
    // If a Zone is configured to be some trait, and it has an effect that adds the same trait
    // The "greater" trait should be used
    static getGreatestTrait(traits)
    {
        let effectList = systemConfig().traitOrder;
        let maxIndex = -1;

        traits.forEach(trait => 
        {
            maxIndex = Math.max(maxIndex, effectList.findIndex(t => t == trait));
        });
        return effectList[maxIndex];
    }

    static avgCoordinate(shape) 
    {

        let x, y;
        if (shape.points)
        {
            let xTotal = 0;
            let yTotal = 0;
            shape.points.forEach((p, i) => 
            {
                if (i % 2 == 0)
                {
                    xTotal += p;   
                }
                else 
                {
                    yTotal += p;
                }
            });

            x = xTotal / (shape.points.length / 2);
            y = yTotal / (shape.points.length / 2);
        }
        else 
        {
            x = shape.x + shape.width / 2;
            y = shape.y + shape.height / 2;
        }

    
        return {x, y};
    }

    static displayScrollingTextForRegion(region, text, reversed)
    {
        let promises = [];
        for(let shape of region.shapes)
        {
            promises.push(canvas.interface.createScrollingText(this.avgCoordinate(shape), text, {direction : reversed ? CONST.TEXT_ANCHOR_POINTS.BOTTOM : CONST.TEXT_ANCHOR_POINTS.TOP}));
        }
        return promises;
    }


    static promptZoneEffect({effectUuids=[], effectData=[]}, messageId)
    {
        if (!(effectUuids instanceof Array))
        {
            effectUuids = [effectUuids];
        }

        if (!(effectData instanceof Array))
        {
            effectData = [effectData];
        }

        // Zone must have Text
        let zones = canvas.scene.regions.contents;

        if (zones.length == 0)
        {
            return ui.notifications.error("WH.ErrorNoZones", {localize : true});
        }

        ItemDialog.create(zones, 1, {text : game.i18n.localize("WH.PickZone")}).then(choices => 
        {
            this.applyEffectToZone({effectUuids, effectData}, canvas.scene.regions.get(choices[0].id), messageId);
        });
    }

    /**
     * Apply a zone effect ot a zone. There are three kinds of zone effects
     *
     * 1. Effects tied to that zone and apply to tokens within
     * 2. Effects that are applied once to tokens within that zone
     * 3. Effects that are tied to a single token and apply to whatever zone that token is in
     *
     * Since this function can be passed multiple effects, this function separates them into case 1 and case 2 (3 isn't handled here)
     * Case 1 is added to the zone flags, case 2 is applied to each token
     * @param {Sting} effectUuids UUIDS of effects being applied
     * @param {string} messageId ID of source message
     * @param {RegionDocument} region Zone being applied to 
     * @returns {Promise<null>} Promise to update drawing flags
     */
    static async applyEffectToZone({effectUuids=[], effectData=[]}, region, messageId)
    {
        if (!(effectUuids instanceof Array))
        {
            effectUuids = [effectUuids];
        }

        if (!(effectData instanceof Array))
        {
            effectData = [effectData];
        }

        let owningUser = getActiveDocumentOwner(region);
        if (owningUser?.id == game.user.id)
        {
            let zoneEffects = deepClone(region.flags[game.system.id]?.effects || []).concat(effectData.filter(i => i.system.zone.type == "zone"));

            // One-time application effects that aren't added to a zone but instead added to tokens in the zone
            let tokenEffectUuids = [];
            let tokenEffectData = effectData.filter(i => i.system.zone.type == "tokens");
            let newZoneEffectNames = effectData.filter(i => i.system.zone.type == "zone").map(i => i.name); // Used for scrolling text
            for (let uuid of effectUuids)
            {
                let originalEffect = fromUuidSync(uuid);
                let message = game.messages.get(messageId);
                let zoneEffect = await CONFIG.ActiveEffect.documentClass.create(originalEffect.convertToApplied(message?.system?.test), {temporary : true, message : message?.id});

                if (zoneEffect.system.transferData.zone.type == "tokens")
                {
                    tokenEffectUuids.push(uuid);
                }
                else if (zoneEffect.system.transferData.zone.type == "zone")
                {
                    zoneEffects.push(zoneEffect.toObject());
                    newZoneEffectNames.push(zoneEffect.name);
                }
            }
            let tokens = [...region.tokens];
            for(let name of newZoneEffectNames)
            {
                await this.displayScrollingTextForRegion(region, name);
            }
            let promises = await Promise.all([region.setFlag(game.system.id, "effects", zoneEffects)].concat(tokens.map(t => t.actor.applyEffect({effectUuids : tokenEffectUuids, effectData : tokenEffectData, messageId}))));

            // When placing a zone effect that, mechanically, activates "when a token enters or starts its turn there", immediate effects shouldn't run
            // for tokens that were already in that zone when it was placed, otherwise they'd get hit twice.
            // Immediate scripts should only run for those entering the zone.
            sleep(1000).then(() => 
            {
                let unblockedEffects = region.getFlag(game.system.id, "effects").map(e => 
                {
                    e.system.zone.skipImmediateOnPlacement = false; // This property blocks immediate scripts from running, so update the zone effect. 
                    return e;                                        // Since the tokens in the zone already have the effect, they won't receive this change until the exit and leave. 
                });

                region.update({[`flags.${game.system.id}.effects`] : unblockedEffects}, {skipZoneCheck : true});
            });
            return promises;
        }
        else 
        {
            SocketHandlers.executeOnOwner(region, "applyZoneEffect", {effectUuids, effectData, regionUuid : region.uuid, messageId});
        }
    }
}