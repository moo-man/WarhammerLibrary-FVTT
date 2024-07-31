import ItemDialog from "../apps/item-dialog";
import { SocketHandlers } from "./socket-handlers";
import { getActiveDocumentOwner, systemConfig } from "./utility";

const {setProperty, deepClone} = foundry.utils;

export default class ZoneHelpers 
{
    // Checks a token's current zone and zone effects, adding and removing them
    static async checkTokenUpdate(token, update, options, user)
    {
        if (user == game.user.id)
        {

            let inZones = Array.from(token.regions);
            let inZoneIds = inZones.map(i => i.uuid);
            let effects = Array.from(token.actor.effects);
            
            let toAdd = [];
            let toDelete = [];
            
            // Remove all zone effects that reference a zone the token is no longer in
            toDelete = effects.filter(i => !inZoneIds.includes(i.system.sourceData.zone)).map(i => i.id);
            
            for(let zone of inZones)
            {
                let effects = this.getZoneEffects(zone);
                toAdd = toAdd.concat(effects.filter(i => i.statuses[0] != [...token.actor.statuses][0]));
            }
                
            await token.actor.deleteEmbeddedDocuments("ActiveEffect", toDelete);
            await token.actor.createEmbeddedDocuments("ActiveEffect", toAdd);
        }
    }

    static checkZoneUpdate(region, update, options)
    {

    }

    /**
     * Retrieves custom/zone effects from a given region document
     * @param {RegionDocument} zone Zone (Region) 
     * @returns {Array<ActiveEffect>} Zone effects
     */
    static getZoneEffects(zone)
    {
        let effects = systemConfig().getZoneTraitEffects(zone);

        effects = effects.concat(zone.getFlag(game.system.id, "effects") || []);

        effects.forEach(e => 
        {
            setProperty(e, "system.sourceData.zone", zone.uuid);
            e.origin = zone.uuid;
        });

        return effects;
    }

  
    /**
     * Return an array of effect data based on Zone Settings
     * @param {Drawing} drawing Drawing instance
     * @returns {Array<WarhammerEffect>} zone effect instances
     */
    static zoneEffects(drawing)
    {
        let traits = [];
        let zoneTraits = drawing.document.flags?.impmal?.traits || {};
        let zoneEffects = drawing.document.flags?.impmal?.effects || [];
        this._combineTraitsFromEffects(zoneEffects, zoneTraits);

        for (let key in zoneTraits)
        {
            if (zoneTraits[key])
            {
                if (typeof zoneTraits[key] == "boolean")
                {
                    traits.push(key); // For boolean properties, the effect key is the property name
                }
                else if (typeof zoneTraits[key] == "string")
                {
                    traits.push(zoneTraits[key]); // For selection properties, the effect key is the value 
                }
            }
        }
        
        // Return trait effects and any other added effects
        return traits.map(i => deepClone(systemConfig().zoneEffects[i]))
            .concat(zoneEffects || [])
            .map(effect => 
            {
            // Designate all zone effects with a flag to easily be distinguished
                setProperty(effect, `system.sourceData.zone`, drawing.document.uuid);
                setProperty(effect, `system.transferData.zoneType`,  "");
                effect.origin = drawing.document.uuid;
                return effect;
            });
    }

    // Zone effects can designate traits to add (e.g. a power making a zone a Minor Hazard)
    // This collects all of them into a single trait object
    static _combineTraitsFromEffects(effects, allTraits={})
    {
        for(let effect of effects)
        {
            let effectTraits = effect.flags.impmal.applicationData?.traits || {};

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
    // trait1 = lightCover, trait2 = mediumCover, return false
    // trait1 = heavyCover, trait2 = mediumCover, return true
    static isGreaterTrait(trait1, trait2)
    {
        let effectList = ["lightCover", "mediumCover", "heavyCover", "lightlyObscured", "heavilyObscured", "minorHazard", "majorHazard", "deadlyHazard", "poorlyLit", "dark"];
        return effectList.findIndex(i => i == trait1) > effectList.findIndex(i => i == trait2);
    }

    // Follow Effects are tied to actors, but apply to the zone they are in
    static followEffects(tokens)
    {
        if (!(tokens instanceof Array))
        {
            tokens = [tokens];
        }
        return tokens.map(t => t.actor) // Take all token actors 
            .filter(t => t)
            .reduce((prev, current) => prev // Reduce them to just their "Follow" zone effects
                .concat(Array.from(current.allApplicableEffects())
                    .filter(e => e.system.area.zoneType == "follow")), [])
            .map(effect =>                  // Convert these effects to data  
            {
                let data = effect.toObject();
                if (data.statuses.length == 0) // Zone effects should alway show on a token
                {
                    data.statuses.push(effect.name.slugify());
                }
                return data;
            });
    }

    /**
     * When a token is updated, check new position vs old and collect which zone effects
     * to add or remove based on zones left and entered. 
     * @param {Token} token Token being updated
     * @param {object} update Token update data (new x and y)
     * @param {Array} drawings Array of Drawing instances to check
     */
    // static async checkTokenUpdate(token, update, drawings)
    // {
    //     if (!(drawings instanceof Array))
    //     {
    //         drawings = [drawings];
    //     }

    //     if (update.x || update.y)
    //     {
    //         let preX = {x : token.object.center.x, y: token.object.center.y};
    //         let postX = {
    //             x :(update.x || token.x) + canvas.grid.size / 2 , 
    //             y: (update.y || token.y) + canvas.grid.size / 2
    //         };

    //         let toAdd = [];
    //         let toRemove = [];

    //         let currentZoneEffects = token.actor?.currentZoneEffects || [];

    //         let entered = [];
    //         let left = [];
    //         for (let drawing of drawings)
    //         {
    //             if (ZoneHelpers.isInDrawing(postX, drawing) && !ZoneHelpers.isInDrawing(preX, drawing)) // If entering Zone
    //             {
    //                 entered.push(drawing);
    //             }

    //             if (!ZoneHelpers.isInDrawing(postX, drawing) && ZoneHelpers.isInDrawing(preX, drawing)) // If leaving Zone
    //             {
    //                 left.push(drawing);
    //             }
    //         }

    //         // Take the drawings the token left, filter through the actor's zone effects to find the ones from those drawings, mark those for removal
    //         // Note that some effects are denoted as "kept" and are not removed upon leaving the zone
    //         for(let drawing of left)
    //         {
    //             toRemove = toRemove.concat(currentZoneEffects.filter(effect => effect.flags.impmal.fromZone == drawing.document.uuid && !effect.flags.impmal.applicationData?.keep));
    //         }

    //         for(let drawing of entered)
    //         {
    //             toAdd = toAdd.concat(ZoneHelpers.zoneEffects(drawing));
    //         }


    //         await token.actor.deleteEmbeddedDocuments("ActiveEffect", toRemove.filter(e => e).map(e => e.id));
    //         await token.actor.createEmbeddedDocuments("ActiveEffect", toAdd.filter(e => e && e.flags.impmal?.following != token.uuid));
    //         // Don't re-add following effect to the token that it's following

    //         // If the token that got updated has an effect following it
    //         // Add it to the drawing entered, remove it from the drawings left
    //         // This will trigger checkDrawingUpdate to apply and remove from actors
    //         let followEffects = this.followEffects(token);
    //         if (followEffects.length)
    //         {
    //             followEffects.forEach(e => setProperty(e, "flags.impmal.following", token.uuid));
    //             for(let drawing of entered)
    //             {
    //                 let zoneEffects = foundry.utils.deepClone(drawing.document.flags.impmal?.effects || []);
    //                 zoneEffects = zoneEffects.concat(followEffects);
    //                 await SocketHandlers.executeOnOwner(drawing.document, "updateDrawing", {uuid: drawing.document.uuid, data : {flags : {impmal: {effects : zoneEffects}}}});
    //             }

    //             for(let drawing of left)
    //             {
    //                 let zoneEffects = foundry.utils.deepClone(drawing.document.flags.impmal?.effects || []);
    //                 zoneEffects = zoneEffects.filter(e => e.flags.impmal?.following != token.uuid);
    //                 await SocketHandlers.executeOnOwner(drawing.document, "updateDrawing", {uuid: drawing.document.uuid, data : {flags : {impmal: {effects : zoneEffects}}}});
    //             }
    //         }   
    //     }
    // }

    /**
     * When a Drawing is updated (either moved, or an effect is added to it), remove all existing 
     * effects from that zone, and add them back again to all tokens in that zone
     * @param {Drawing} drawing Drawing being updated
     */
    static async checkDrawingUpdate(drawing)
    {
        let effects = this.zoneEffects(drawing);

        for(let token of drawing.scene.tokens.map(t => t.object))
        {
            let currentZoneEffects = token.actor.currentZoneEffects.filter(e => e.system.sourceData.zone == drawing.document.uuid);

            // Remove all effects originating from this zone
            await token.actor.deleteEmbeddedDocuments("ActiveEffect", currentZoneEffects.map(i => i.id));

            if (this.isInDrawing(token.center, drawing))
            {
                // Add them back to those still in the drawing
                await token.actor?.createEmbeddedDocuments("ActiveEffect", effects.filter(e => e && e.flags.impmal?.following != token.document.uuid));
            }
        }
    }


    static promptZoneEffect(effectUuids, messageId)
    {
        if (typeof effectUuids == "string")
        {
            effectUuids = [effectUuids];
        }

        // Zone must have Text
        let zones = canvas.scene.regions.contents;

        if (zones.length == 0)
        {
            return ui.notifications.error("WH.ErrorNoZones", {localize : true});
        }

        ItemDialog.create(zones, 1, {text : game.i18n.localize("WH.PickZone")}).then(choices => 
        {
            this.applyEffectToZone(effectUuids, messageId, canvas.scene.regions.get(choices[0].id));
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
    static async applyEffectToZone(effectUuids, messageId, region)
    {
        let owningUser = getActiveDocumentOwner(region);
        if (owningUser?.id == game.user.id)
        {
            let zoneEffects = deepClone(region.flags[game.system.id]?.effects || []);

            // One-time application effects that aren't added to a zone but instead added to tokens in the zone
            let tokenEffectUuids = [];
            for (let uuid of effectUuids)
            {
                let originalEffect = fromUuidSync(uuid);
                let message = game.messages.get(messageId);
                let zoneEffect = await CONFIG.ActiveEffect.documentClass.create(originalEffect.convertToApplied(), {temporary : true, message : message?.id});

                if (zoneEffect.system.zone.type == "tokens")
                {
                    tokenEffectUuids.push(uuid);
                }
                else if (zoneEffect.system.zone.type == "zone")
                {
                    zoneEffects.push(zoneEffect.toObject());
                }
            }
            let tokens = [...region.tokens];
            return Promise.all([region.setFlag(game.system.id, "effects", zoneEffects)].concat(tokens.map(t => t.actor.applyEffect({effectUuids : tokenEffectUuids, messageId}))));
        }
        else 
        {
            SocketHandlers.executeOnOwner(region, "applyZoneEffect", {effectUuids, regionUuid : region.uuid, messageId});
        }
    }
}