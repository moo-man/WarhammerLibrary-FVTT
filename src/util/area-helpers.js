import TokenHelpers from "./token-helpers";
import { sleep } from "./utility";

export default class AreaHelpers 
{

    // If an actor has multiple auras, and they move, effect evaluation is calculated for each one, however each evaluation looks at ALL areas
    // So, we need to lock and prevent updates to only allow the first one to update. 
    static semaphore = new foundry.utils.Semaphore();
    /**
     * Determines if a coordinate is within a Template's strokes
     * @param {object} {x, y} object being tested
     * @param point
     * @param {Template} template Template object being tested
     * @returns
     */
    static isInTemplate(point, template)
    {
        if (template.t == "rect")
        {
            return this._isInRect(point, template.object);
        }
        else if (["ray", "cone"].includes(template.t))
        {
            return this._isInPolygon(point, template.object);
        }
        else if (template.t == "circle")
        {
            return this._isInEllipse(point, template.object);
        }
    }

    static setTokenAreas(token, update, options, user)
    {
        let scene = token.parent;
        if (!options._priorAreas)
        {
            options._priorAreas = {};
            options._areas = {};
            options._newCenter = {};
        }
        // Get all areas left, but aura owners should never leave their aura area
        options._priorAreas[token.id] = scene.templates.contents.filter(template => this.isInTemplate(token.object.center, template) && template.getFlag("wfrp4e", "aura")?.owner != token.actor?.uuid).map(i => i.id);
        let newCenter = TokenHelpers.tokenCenter(foundry.utils.mergeObject(token.toObject(), update));
        options._newCenter[token.id] = newCenter;
        options._areas[token.id] = scene.templates.contents.filter(template => this.isInTemplate(newCenter, template)).map(i => i.id);
    }

    // Checks a token's current zone and zone effects, adding and removing them
    static async checkTokenUpdate(token, update, options, user)
    {
        if (user == game.user.id)
        {
            // If every current region ID exists in priorAuras, and every priorRegion ID existis in current, there was no region change 
            let currentAreas = options._areas[token.id] || [];
            let priorAreas = options._priorAreas[token.id] || [];
            let changedRegion = !(currentAreas.every(rId => priorAreas.includes(rId)) && priorAreas.every(rId => currentAreas.includes(rId)));

            if (changedRegion)
            {
                await this.checkTokenAreaEffects(token, options._newCenter[token.id]);
            }
        }
    }

    static async checkAreaUpdate(template, update, options, user)
    {
        // players can't manage token effects, so only the active GM should add/remove area effects
        if (game.users.activeGM.id == game.user.id && !options?.skipAreaCheck)
        {
            // Tokens that are now in the template or have effects from this template
            let tokens = template.parent?.tokens.contents.filter(token => this.isInTemplate(token.object.center, template) || token.actor?.effects.find(e => e.system.sourceData.area == template.uuid));
            for(let token of tokens)
            {
                this.semaphore.add(this.checkTokenAreaEffects.bind(this), token);
            }
        }
    }

    static async checkAreaCreate(template, options, user)
    {
        // players can't manage token effects, so only the active GM should add/remove area effects
        if (game.users.activeGM.id == game.user.id && !options?.skipAreaCheck)
        {
            // Tokens that are now in the template or have effects from this template
            let tokens = template.parent?.tokens.contents.filter(token => this.isInTemplate(token.object.center, template) || token.actor?.effects.find(e => e.system.sourceData.area == template.uuid));
            for(let token of tokens)
            {
                this.semaphore.add(this.checkTokenAreaEffects.bind(this), token);
            }
            
            if (template.getFlag("wfrp4e", "instantaneous"))
            {
                sleep(500).then(() => 
                {
                    template.setFlag("wfrp4e", "effectData", null);
                });
            }
        }

    }

    static async checkAreaDelete(template, options, user)
    {
        // players can't manage token effects, so only the active GM should add/remove area effects
        if (game.users.activeGM.id == game.user.id && !options?.skipAreaCheck)
        {
            // Tokens that have effects from this template
            let tokens = template.parent?.tokens.contents.filter(token => token.actor?.effects.find(e => e.system.sourceData.area == template.uuid));
            for(let token of tokens)
            {
                this.semaphore.add(this.checkTokenAreaEffects.bind(this), token);
            }
        }

    }

    static async checkTokenAreaEffects(token, newCenter)
    {
        if (!token.actor) return;

        let scene = token.parent;
        let inAreas = scene.templates.contents.filter(t => this.isInTemplate(newCenter || token.object.center, t));
        let effects = Array.from(token.actor.effects);
        let areaEffects = [];
        inAreas.forEach(area => 
        {
            let areaEffect = area.areaEffect();
            let auraData = area.getFlag("wfrp4e", "aura");
            // If the effect exists, only add the area effect if the area is not an aura OR this isn't the owner of the aura and it's not a transferred aura
            // in other words, if the aura is transferred, apply to owner of the aura. If it's a constant aura, don't add the effect to the owner
            if (areaEffect && (!auraData || auraData.owner != token.actor?.uuid || auraData.transferred))
            {
                areaEffects.push(areaEffect);
            }
        });

        // Remove all area effects that reference an area the token is no longer in
        let toDelete = effects.filter(e => e.system.sourceData.area && !inAreas.map(i => i.uuid).includes(e.system.sourceData.area) && !e.system.transferData.area.keep).map(e => e.id);

        // filter out all area effects that are already on the actor
        let toAdd = areaEffects.filter(ae => !token.actor.effects.find(e => e.system.sourceData.area == ae.system.sourceData.area));
    
        if (toDelete.length)
        {
            await token.actor.deleteEmbeddedDocuments("ActiveEffect", toDelete);
        }
        if (toAdd.length)
        {
            await token.actor.applyEffect({effects : toAdd});
        }
        // If an effect from this area was not found, add it. otherwise ignore
    }

    /**
     * Get all Tokens inside template
     * @param template
     * @returns
     */
    static tokensInTemplate(template)
    {
        let scene = template.scene;
        let tokens = scene.tokens.contents;
        return tokens.filter(t => this.isInTemplate(t.object.center, template));
    }

    
    static _isInEllipse(point, template)
    {
        let grid = canvas.scene.grid;
        let templateGridSize = template.document.distance/grid.distance * grid.size;
        // NEED TO USE template.document - hooks don't reflect template.x/y immediately
        let ellipse = new PIXI.Ellipse(template.document.x, template.document.y, templateGridSize, templateGridSize);
        return ellipse.contains(point.x, point.y);
    }


    // Not used currently
    static _isInRect(point, template)
    {
        // let x1 = template.document.x;
        // let x2 = x1 + template.document.shape.width;
        // let y1 = template.document.y;
        // let y2 = y1 + template.document.shape.height;

        // if (point.x > x1 && point.x < x2 && point.y > y1 && point.y < y2)
        // {
        //     return true;
        // }
    }

    // Not used currently
    static _isInPolygon(point, template)
    {                                                                                 // points are relative to origin of the template, needs to be origin of the map
        let polygon = new PIXI.Polygon(template.shape.points.map((coord, index) => coord += index % 2 == 0 ? template.document.x : template.document.y ));
        return polygon.contains(point.x, point.y);
    }

    static effectToTemplate(effect)
    {
        let token = effect.actor.getActiveTokens()[0];
        let template = new MeasuredTemplate(new CONFIG.MeasuredTemplate.documentClass(foundry.utils.mergeObject({
            t: "circle",
            _id : effect.id,
            user: game.user.id,
            distance: effect.radius,
            direction: 0,
            x: token.center.x, // Using the token x/y will double the template's coordinates, as it's already a child of the token
            y: token.center.y, // However, this is necessary to get tho correct grid highlighting. The template's position is corrected when it's rendered (see renderAura)
            fillColor: game.user.color,
            flags: {
                wfrp4e: {
                    effectUuid: effect.uuid
                }
            }
        }, effect.flags.wfrp4e?.system.transferData.area?.templateData || {}), {parent : canvas.scene}));

        // For some reason, these temporary templates have 0,0 as their coordinates
        // instead of the ones provided by the document, so set them manually
        template.x = template.document.x;
        template.y = template.document.y;
        template.auraEffect = effect;
        return template;
    }

    static refreshArea(template, flags)
    {   
        let document = template.document;
        let effect = document.areaEffect();
        if (effect && !effect.system.transferData.area.aura.render)
        {
            template.visible = false;
            canvas.interface.grid.clearHighlightLayer(template.highlightId);
        }
    }

}