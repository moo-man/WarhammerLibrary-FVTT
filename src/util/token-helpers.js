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
    
    static async updateAuras(token)
    {
        let actor = token?.actor;
        if (actor && game.users.activeGM.id == game.user.id)
        {
            let existingAuraTemplates = token.parent.templates.contents.filter(i => i.getFlag("wfrp4e", "aura")?.owner == actor.uuid);
            if (token._destroyed)
            {
                return await token.parent.deleteEmbeddedDocuments("MeasuredTemplate", existingAuraTemplates.map(i => i.id));
            }
            let auraEffects = actor.auraEffects;
            // create templates from all aura effects
            let allAuraTemplates = (await Promise.all(auraEffects.map(e => AreaTemplate.fromAuraEffect(e.uuid, token)))).map(i => i.document);
            
            // Find all templates that have already been created 
            

            // Filter to keep any templates that need to be created 
            let newAuraTemplates = allAuraTemplates.filter(t => !existingAuraTemplates.find(existing => existing.getFlag("wfrp4e", "effectUuid") == t.getFlag("wfrp4e", "effectUuid")));

            let toDelete = existingAuraTemplates.filter(existing => !auraEffects.find(e => e.uuid == existing.getFlag("wfrp4e", "effectUuid")));
            
            // Create those templates
            if (toDelete.length)
            {
                await token.parent.deleteEmbeddedDocuments("MeasuredTemplate", toDelete.map(i => i.id));
            }
            if (newAuraTemplates.length)
            {
                return token.parent.createEmbeddedDocuments("MeasuredTemplate", newAuraTemplates.map(i => i.toObject()));
            }
        }
    }

    static async moveAuras(token, update, options, user)
    {
        if (game.users.activeGM.id == game.user.id)
        {
            let tokenAnimations = [...token.object.animationContexts.values()];
            let hidden = token.hidden;
            if (update.x || update.y || update.hidden)
            {
                let auraTemplates = token.parent.templates.contents.filter(i => i.getFlag("wfrp4e", "aura")?.owner == token.actor?.uuid);

                for(let t of auraTemplates)
                {
                    CanvasAnimation.animate([{parent: t.object, attribute : "x", to: options._newCenter[token.id].x}, {parent: t.object, attribute : "y", to: options._newCenter[token.id].y}], {duration : tokenAnimations[0]?.duration || 0});
                }

                let auraTemplateData = auraTemplates.map(i => i.toObject());

                for(let t of auraTemplateData)
                {
                    // If the token is hidden, always hide the aura
                    if (hidden)
                    {
                        t.hidden = hidden;
                    }
                    if (options._newCenter)
                    {
                        t.x = options._newCenter[token.id].x;
                        t.y = options._newCenter[token.id].y;
                    }
                }

                await Promise.all(tokenAnimations.map(i => i.promise));
                token.parent.updateEmbeddedDocuments("MeasuredTemplate", auraTemplateData);
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

