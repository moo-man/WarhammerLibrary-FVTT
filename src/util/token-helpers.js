import AreaTemplate from "./area-template";

const {mergeObject} = foundry.utils;
export default class TokenHelpers 
{
    static semaphore = new foundry.utils.Semaphore();

    static highlightToken(tokenId)
    {
        let token = canvas.scene.tokens.get(tokenId);
        token?.object?._onHoverIn({});
    }

    static unhighlightToken(tokenId)
    {
        let token = canvas.scene.tokens.get(tokenId);
        token?.object?._onHoverOut({});
    }

    static displayScrollingText(text, actor, options={}) 
    {
        const tokens = actor.getActiveTokens();

        for ( let t of tokens ) 
        {
            if ( !t.visible || !t.renderable ) { continue; }
            canvas.interface.createScrollingText(t.center, text, mergeObject({
                anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
                direction: CONST.TEXT_ANCHOR_POINTS.TOP,
                distance: (2 * t.h),
                fontSize: 36,
                fill: "0xFFFFFF",
                stroke : "0x000000",
                strokeThickness: 4,
                jitter: 0.25
            }, options));
        }
    }  
    
    /**
     * Creates and deletes auras based on changes to the token or actor
     * 
     * @param {TokenDocument} token Token updated or created
     * @returns 
     */
    static async updateAuras(token)
    {
        let actor = token?.actor;
        if (actor && game.users.activeGM.id == game.user.id)
        {
            let existingAuras = token.parent.regions.contents.filter(i => i.getFlag(game.system.id, "aura")?.owner == actor.uuid);

            let auraEffects = actor.auraEffects;

            // create templates from all aura effects
            let allAuraTemplates = (await Promise.all(auraEffects.map(e => AreaTemplate.fromAuraEffect(e.uuid, token)))).map(i => i.document);
            
            // Filter to keep any templates that need to be created 
            let toCreate = allAuraTemplates.filter(t => !existingAuras.find(existing => existing.getFlag(game.system.id, "effectUuid") == t.getFlag(game.system.id, "effectUuid")));

            // If an actor doesn't produce an aura effect anymore, remove it
            let toDelete = existingAuras.filter(existing => !auraEffects.find(e => e.uuid == existing.getFlag(game.system.id, "effectUuid")));
            
            // Create those templates
            if (toDelete.length)
            {
                await token.parent.deleteEmbeddedDocuments("Region", toDelete.map(i => i.id));
            }
            if (toCreate.length)
            {
                return token.parent.createEmbeddedDocuments("Region", toCreate.map(i => i.toObject()));
            }
        }
    }

    // Given a point, (assumed to be token position), get the center of the grid space
    // This is useful when dealing with raw data without the use of the `center` getter
    // This may not be correct 
    static tokenCenter(tokenData)
    {
        let {x, y, width} = tokenData;
        let halfWidth = (width * canvas.grid.size) / 2;
        return {x : x + halfWidth, y : y + halfWidth};
    }
}

