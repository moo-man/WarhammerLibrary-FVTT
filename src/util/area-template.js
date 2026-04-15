import { getActiveDocumentOwner } from "./utility";

/**
 * Shamelessly copied from dnd5e's spell template implementation
 * @augments {Region}
 */
export default class AreaTemplate extends foundry.canvas.placeables.Region
{

    /**
     * Track the timestamp when the last mouse move event was captured.
     * @type {number}
     */
    #moveTime = 0;

    /* -------------------------------------------- */

    /**
     * The initially active CanvasLayer to re-activate after the workflow is complete.
     * @type {CanvasLayer}
     */
    #initialLayer;

    /* -------------------------------------------- */

    /**
     * Track the bound event handlers so they can be properly canceled later.
     * @type {object}
     */
    #events;

    
    static fromString(aoeString, actorId, itemId, messageId, diameter=true) 
    {
        if (aoeString.toLowerCase().includes(game.i18n.localize("AoE").toLowerCase()))
        {aoeString = aoeString.substring(aoeString.indexOf("(")+1, aoeString.length-1);};
      
        let radius = diameter ? parseInt(aoeString) / 2 : parseInt(aoeString);

        // Prepare template data
        const templateData = {
            name: game.i18n.localize("WH.AreaTemplate.PreviewName"),
            user: game.user.id,
            color: game.user.color,
            visibility: 3,
            shapes : [{
                type: "circle",
                radius: (radius / canvas.grid.distance) * canvas.grid.size,
                x: 0,
                y: 0,
                gridBased: false
            }],
            flags: {
                [game.system.id]: {
                    itemuuid: `Actor.${actorId}.Item.${itemId}`,
                    messageId: messageId,
                    round: game.combat?.round ?? -1,
                    target : true
                }
            }
        };
  
        const cls = CONFIG.Region.documentClass;
        const template = new cls(templateData, {parent: canvas.scene});
  
        // Return the template constructed from the item data
        return new this(template);
    }

    static async fromEffect({effectUuid, effect, effectData}, messageId, radius, mergeData={}) 
    {
        let test = game.messages.get(messageId)?.system.test;

        if (effectUuid)
        {
            effect = await fromUuid(effectUuid);
            effectData = effect.convertToApplied(test);
        }
        else if (effect) 
        {
            effectData = effect.convertToApplied(test);
        }

        // Sometimes, the radius needs to reference the test (usually overcasting)
        foundry.utils.setProperty(effectData, "system.sourceData.test",  test);

        foundry.utils.mergeObject(effectData, mergeData);


        radius = radius || Number(effectData.system.transferData.area.radius) || effect?.radius; 

        let shapeData = effectData.system.transferData.area.shape;

        shapeData.radius = this._convertGridUnits(radius);

        shapeData.width = this._convertGridUnits(shapeData.width);
        shapeData.height = this._convertGridUnits(shapeData.height);
        shapeData.length = this._convertGridUnits(shapeData.length);
        shapeData.x = 0;
        shapeData.y = 0;

        shapeData.radiusX = shapeData.width;
        shapeData.radiusY = shapeData.height;


        // Prepare template data
        const templateData = {
            user: game.user.id,
            name: effectData.name,
            color: shapeData.color || game.user.color,
            visibility: 3,
            shapes : [shapeData],
            flags: {
                [game.system.id]: {
                    effectData: effectData,
                    messageId: messageId,
                    aura: false,
                    round: game.combat?.round ?? -1,
                    instantaneous : effectData.system.transferData.area.duration == "instantaneous"
                }
            }
        };

        const cls = CONFIG.Region.documentClass;
        const template = new cls(templateData, {target: true, parent: canvas.scene });

        // Return the template constructed from the item data
        return new this(template);
    }

    static _convertGridUnits(units)
    {
        return (units / canvas.grid.distance) * canvas.grid.size;
    }

    /* -------------------------------------------- */

    
    static async fromAuraEffect(effectUuid, token) 
    {

        let effect = await fromUuid(effectUuid);
        let effectData = effect.convertToApplied();
        let shapeData = effectData.system.transferData.area.shape;
        

        // Prepare template data
        const templateData = {
            name: effect.name,
            user: game.user.id,
            color: shapeData.color || game.user.color,
            visibility: effectData.system.transferData.area.aura.visibility,
            attachment: {
                token: token.id
            },
            // visibility: effectData.system.transferData.area.aura.render ? 3 : 1,
            shapes : [{
                type: "emanation",
                base: {
                    type: "token",
                    height: token.height,
                    width: token.width,
                    shape: 4,
                    x: token.x,
                    y: token.y
                },
                radius: this._convertGridUnits(effect.radius),
                gridBased: false
            }],
            flags: {
                [game.system.id]: {
                    effectData: effectData,
                    aura : {
                        owner : token.actor?.uuid,
                        transferred : effect.system.transferData.area.aura.transferred,
                        render: effect.system.transferData.area.aura.render
                    },
                    effectUuid : effectUuid,
                    instantaneous: false
                }
            }
        };

    
        const cls = CONFIG.Region.documentClass;
        const template = new cls(templateData, {target: true, parent: canvas.scene });

        // Return the template constructed from the item data
        return new this(template);
    }

    /**
     * Creates a preview of the spell template.
     * @returns {Promise}  A promise that resolves with the final measured template if created.
     */
    drawPreview() 
    {
        const initialLayer = canvas.activeLayer;

        // Draw the template and switch to the template layer
        this.draw();
        this.layer.activate();
        this.layer.preview.addChild(this);

        // Hide the sheet that originated the preview
        this.actorSheet?.minimize();

        // Activate interactivity
        return this.activatePreviewListeners(initialLayer);
    }

    /* -------------------------------------------- */

    /**
     * Activate listeners for the template preview
     * @param {CanvasLayer} initialLayer  The initially active CanvasLayer to re-activate after the workflow is complete
     * @returns {Promise}                 A promise that resolves with the final measured template if created.
     */
    activatePreviewListeners(initialLayer) 
    {
        return new Promise((resolve, reject) => 
        {
            this.#initialLayer = initialLayer;
            this.#events = {
                cancel: this._onCancelPlacement.bind(this),
                confirm: this._onConfirmPlacement.bind(this),
                move: this._onMovePlacement.bind(this),
                resolve,
                reject,
                rotate: this._onRotatePlacement.bind(this)
            };

            // Activate listeners
            canvas.stage.on("mousemove", this.#events.move);
            canvas.stage.on("mousedown", this.#events.confirm);
            canvas.app.view.oncontextmenu = this.#events.cancel;
            canvas.app.view.onwheel = this.#events.rotate;
        });
    }

    /* -------------------------------------------- */

    /**
     * Shared code for when template placement ends by being confirmed or canceled.
     * @param {Event} event  Triggering event that ended the placement.
     */
    async _finishPlacement(event) 
    {
        event.interactionData = {}; // Needed for upstream cancellation
        this.layer._onDragLeftCancel(event);
        canvas.stage.off("mousemove", this.#events.move);
        canvas.stage.off("mousedown", this.#events.confirm);
        canvas.app.view.oncontextmenu = null;
        canvas.app.view.onwheel = null;
        this.#initialLayer.activate();
        await this.actorSheet?.maximize();
    }


    _updateShape(data={})
    {
        let shape = this.document.shapes[0].toObject();
        foundry.utils.mergeObject(shape, data);
        this.document.updateSource({shapes: [shape]});
    }
    /* -------------------------------------------- */

    /**
     * Move the template preview when the mouse moves.
     * @param {Event} event  Triggering mouse event.
     */
    _onMovePlacement(event) 
    {
        event.stopPropagation();
        let now = Date.now(); // Apply a 20ms throttle
        if ( now - this.#moveTime <= 20 ) {return;}
        const center = event.data.getLocalPosition(this.layer);
        if (!canvas.grid.isGridless)
        {
            const snapped = this.getSnappedPosition(center);
            this._updateShape(snapped);
        }
        else 
        {
            this._updateShape(center);
        }
        this.refresh();
        this.#moveTime = now;
        if (this.document.getFlag(game.system.id, "target"))
        {
            this.updateAOETargets(this.document);
        }
    }


    /* -------------------------------------------- */

    /**
     * Rotate the template preview by 3˚ increments when the mouse wheel is rotated.
     * @param {Event} event  Triggering mouse event.
     */
    _onRotatePlacement(event) 
    {
        if ( event.ctrlKey ) {event.preventDefault();} // Avoid zooming the browser window
        event.stopPropagation();
        let delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
        let snap = event.shiftKey ? delta : 5;
        this._updateShape({rotation: this.document.shapes[0].rotation + (snap * Math.sign(event.deltaY))});
        this.refresh();
    }

    /* -------------------------------------------- */

    /**
     * Confirm placement when the left mouse button is clicked.
     * @param {Event} event  Triggering mouse event.
     */
    async _onConfirmPlacement(event) 
    {
        await this._finishPlacement(event);
        const destination = this.getSnappedPosition(this.document.shapes[0]);
        this._updateShape(destination);
        this.#events.resolve(CONFIG.Region.documentClass.create(this.document.toObject(), {parent: this.document.parent}).then(region =>  
        {
            let test = game.messages.get(region.flags[game.system.id].messageId)?.system?.test;
            if (test && test.data.context.templates)
            {
                test.data.context.templates = test.data.context.templates.concat(region.id);
                test.renderRollCard();
            }
        }));
    }

    /* -------------------------------------------- */

    /**
     * Cancel placement when the right mouse button is clicked.
     * @param {Event} event  Triggering mouse event.
     */
    async _onCancelPlacement(event) 
    {
        await this._finishPlacement(event);
        this.#events.reject();
    }

    getSnappedPosition(...args)
    {
        return this.layer.getSnappedPoint(...args);
    }

    updateAOETargets(region)
    {
        canvas.tokens.setTargets(canvas.scene.tokens.contents.filter(t => t.testInsideRegion(region)).map(t => t.id));
    }

}

