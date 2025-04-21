const DraggableApp = (cls) => class extends cls  
{
    #dragDrop;

    constructor(options = {}) 
    {
        super(options);
        this.#dragDrop = this.#createDragDropHandlers();
    }

    async _onRender(_context, _options) 
    {
        await super._onRender(_context, _options);
        this.#dragDrop.forEach((d) => d.bind(this.element));
    }

    /**
     * Returns an array of DragDrop instances
     * @type {DragDrop[]}
     */
    get dragDrop() 
    {
        return this.#dragDrop;
    }

    /**
     * Create drag-and-drop workflow handlers for this Application
     * @returns {DragDrop[]}     An array of DragDrop handlers
     * @private
     */
    #createDragDropHandlers() 
    {
        return this.options.dragDrop.map((d) => 
        {
            d.permissions = {
                dragstart: this._canDragStart.bind(this),
                drop: this._canDragDrop.bind(this),
            };
            d.callbacks = {
                dragstart: this._onDragStart.bind(this),
                dragover: this._onDragOver.bind(this),
                drop: this._onDrop.bind(this),
            };
            return new foundry.applications.ux.DragDrop.implementation(d);
        });
    }

    /**
     * Define whether a user is able to begin a dragstart workflow for a given drag selector
     * @param {string} selector       The candidate HTML selector for dragging
     * @returns {boolean}             Can the current user drag this selector?
     * @protected
     */
    _canDragStart(selector) 
    {
        // game.user fetches the current user
        return true;
    }


    /**
     * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
     * @param {string} selector       The candidate HTML selector for the drop target
     * @returns {boolean}             Can the current user drop on this selector?
     * @protected
     */
    _canDragDrop(selector) 
    {
        // game.user fetches the current user
        return true;
    }


    /**
     * Callback actions which occur at the beginning of a drag start workflow.
     * @param {DragEvent} event       The originating DragEvent
     * @protected
     */
    async _onDragStart(event) 
    {
        const el = event.currentTarget;
        if ('link' in event.target.dataset) { return; }

        // Extract the data you need
        let dragData = null;

        if (el.dataset.uuid) 
        {
            let document = await fromUuid(el.dataset.uuid);
            dragData = document.toDragData();
        }


        if (!dragData) { return; }

        // Set data transfer
        event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
    }


    /**
     * Callback actions which occur when a dragged element is over a drop target.
     * @param {DragEvent} event       The originating DragEvent
     * @protected
     */
    _onDragOver(event) { }


    /**
     * Callback actions which occur when a dragged element is dropped on a target.
     * @param {DragEvent} event       The originating DragEvent
     * @protected
     */
    async _onDrop(event) 
    {
        const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

        if (data.type && typeof this["_onDrop" + data.type] == "function") 
        {
            this["_onDrop" + data.type](data, event);
        }
        else if (data.type == "custom") 
        {
            this._onDropCustom(data, event);
        }
    }

    
};

export default DraggableApp;