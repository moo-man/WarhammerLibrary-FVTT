import { ListPropertyForm } from "../../apps/list-form";
import { addLinkSources, localize} from "../../util/utility";

const WarhammerSheetMixinV2 = (cls) => class extends cls  
{

    #dragDrop;

    constructor(options = {}) 
    {
        super(options);
        this.#dragDrop = this.#createDragDropHandlers();
    }

    static DEFAULT_OPTIONS = {
        classes: ["warhammer"],
        actions: {
            editEmbedded : this._onEditEmbeddedDoc,
            deleteEmbedded : this._onDeleteEmbeddedDoc,
            toggleEffect : this._onEffectToggle,
            createEffect : this._onCreateEffect,
            toggleProperty : this._onToggleProperty,
            listCreate : this._onListCreate,
            listDelete : this._onListDelete,
            listForm : this._onListForm,
            stepProperty : {buttons: [0, 2], handler : this._onStepProperty},
            clickEffectButton : this._onClickEffectButton
        },
        window: {
            resizable: true
        },
        form: {
            submitOnChange: true,
        },
        dragDrop: [{ dragSelector: '[data-uuid]:not([data-nodrag])', dropSelector: null }],
    };

    async close(options={}) 
    {
        super.close(options);
        ui.context?.close();
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
            return new DragDrop(d);
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
        return this.isEditable;
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
        return this.isEditable;
    }
  
  
    /**
     * Callback actions which occur at the beginning of a drag start workflow.
     * @param {DragEvent} event       The originating DragEvent
     * @protected
     */
    async _onDragStart(event) 
    {
        const el = event.currentTarget;
        if ('link' in event.target.dataset) {return;}
  
        // Extract the data you need
        let dragData = null;

        if (el.dataset.uuid)
        {
            let document = await fromUuid(el.dataset.uuid);
            dragData = document.toDragData();
        }

  
        if (!dragData) {return;}
  
        // Set data transfer
        event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
    }
  
  
    /**
     * Callback actions which occur when a dragged element is over a drop target.
     * @param {DragEvent} event       The originating DragEvent
     * @protected
     */
    _onDragOver(event) {}
  
  
    /**
     * Callback actions which occur when a dragged element is dropped on a target.
     * @param {DragEvent} event       The originating DragEvent
     * @protected
     */
    async _onDrop(event) 
    {
        const data = TextEditor.getDragEventData(event);

        if (data.type && typeof this["_onDrop" + data.type] == "function")
        {
            this["_onDrop" + data.type](data, event);
        }
        else if (data.type == "custom")
        {
            this._onDropCustom(data, event);
        }
    }

    async _onDropCustom(data, event)
    {
        Hooks.call(`${game.system.id}:dropCustomData`, this, data, event);
    }

    _onRender(_context, _options) 
    {
        this.#dragDrop.forEach((d) => d.bind(this.element));

        this._addEventListeners();
    }

    _addEventListeners()
    {    
        this.element.querySelectorAll("input").forEach((editor) => 
        {
            editor.addEventListener("focusin", (ev) =>
            {
                ev.target.select();
            });
        });
    
        if (!this._contextMenu)
        {
            this._contextMenu = this._setupContextMenus();
        }
        else 
        {
            this._contextMenu.forEach(menu => 
            {
                menu.element = this.element;
                menu.bind();
            });
        }
    
        this.element.querySelectorAll("[data-action='editProperty']").forEach(element => 
        {
            element.addEventListener("change", this.constructor._onEditProperty.bind(this));
        });

        this.element.querySelectorAll("[data-action='editList']").forEach(element => 
        {
            element.addEventListener("change", this.constructor._onListEdit.bind(this));
        });
    }

    _setupContextMenus()
    {

    }

    _getEntryContextOptions() 
    {

    }

    
    async _prepareContext(options) 
    {
        let context = await super._prepareContext(options);
        context.system = this.document.system;
        context.tabs = this._prepareTabs(options);
        context.fields = this.document.system.schema.fields;
        context.source = this.document.toObject();
        context.enriched = await this._handleEnrichment();

        return context;
    }

    async _preparePartContext(partId, context) 
    {
        context.partId = `${this.id}-${partId}`;
        context.tab = context.tabs[partId];

        let fn = this[`_prepare${partId.capitalize()}Context`]?.bind(this);
        if (typeof fn == "function")
        {
            fn(context);
        }

        return context;
    }

    _prepareTabs(options) 
    {
        let tabs = foundry.utils.deepClone(this.constructor.TABS);

        for (let t in tabs) 
        {
            tabs[t].active = this.tabGroups[tabs[t].group] === tabs[t].id,
            tabs[t].cssClass = tabs[t].active ? "active" : "";
        }

        if (!Object.values(tabs).some(t => t.active) && this.options.defaultTab) 
        {
            tabs[this.options.defaultTab].active = true;
            tabs[this.options.defaultTab].cssClass = "active";
        }

        return tabs;
    }

    async _handleEnrichment() 
    {
        return {};
    }

    static async _onCreateEffect(ev) 
    {
        let type = ev.target.dataset.action ? ev.target : this._getParent(ev.target, `[data-action]`).dataset.category;
        let effectData = { name: localize("WH.NewEffect"), img: "icons/svg/aura.svg" };
        if (type == "temporary") 
        {
            effectData["duration.rounds"] = 1;
        }
        else if (type == "disabled") 
        {
            effectData.disabled = true;
        }

        // If Item effect, use item name for effect name
        if (this.document.documentName == "Item")
        {
            effectData.name = this.document.name;
            effectData.img = this.document.img;
        }
        this.document.createEmbeddedDocuments("ActiveEffect", [effectData]).then(effects => effects[0].sheet.render(true));
    }

    static async _onEditEmbeddedDoc(ev)
    {
        let doc = await this._getDocumentAsync(ev);
        doc?.sheet.render(true);
    }

    static async _onDeleteEmbeddedDoc(ev)
    {
        let doc = await this._getDocumentAsync(ev);
        doc?.delete();
    }

    static async _onEffectToggle(ev)
    {
        let doc = await this._getDocumentAsync(ev);
        doc.update({"disabled" : !doc.disabled});
    }

    static async _onEditProperty(ev)
    {
        let element = ev.target.dataset.action ? ev.target : this._getParent(ev.target, `[data-action]`);
        let document = (await this._getDocument(ev)) || this.document;
        let path = element.dataset.path;
        document.update({[path] : ev.type == "number" ? Number(ev.target.value) : ev.target.value});
    }
  
    static async _onToggleProperty(ev)
    {
        let element = ev.target.dataset.action ? ev.target : this._getParent(ev.target, `[data-action]`);
        let document = (await this._getDocument(ev)) || this.document;
        let path = element.dataset.path;
        document.update({[path] : !foundry.utils.getProperty(document, path)});
    }

    static async _onStepProperty(ev)
    {
        ev.stopPropagation();
        ev.preventDefault();
        let element = ev.target.dataset.action ? ev.target : this._getParent(ev.target, `[data-action]`);
        let document = (await this._getDocument(ev)) || this.document;
        let path = element.dataset.path;
        let step = ev.button == 0 ? 1 : -1;
        step = ev.target.dataset.reversed ? -1 * step : step;
        if (ev.ctrlKey)
        {
            step *= 10;
        }
        document.update({[path] : foundry.utils.getProperty(document, path) + step});
    }

    static async _onListCreate(ev)
    {
        let doc = await this._getDocumentAsync(ev) || this.document;
        let list = this._getList(ev);

        if (list)
        {
            doc.update(list.add());
        }
    }

    static async _onListDelete(ev)
    {
        let doc = await this._getDocumentAsync(ev) || this.document;
        let list = this._getList(ev);
        let index = this._getIndex(ev);

        if (list)
        {
            doc.update(list.remove(index));
        }
    }

    static async _onListEdit(ev)
    {
        let doc = await this._getDocumentAsync(ev) || this.document;
        let list = this._getList(ev);
        let index = this._getIndex(ev);
        let internalPath = this._getDataAttribute(ev, "ipath");
        let value = ev.target.value;

        if (list)
        {
            doc.update(list.edit(index, value, internalPath));
        }

    }

    static async _onListForm(ev)
    {
        let doc = await this._getDocumentAsync(ev) || this.document;
        let list = this._getList(ev);
        let index = this._getIndex(ev);
        list.toForm(index, doc);
    }

    modifyHTML()
    {
        // replacePopoutTokens(this.element);
        addLinkSources(this.element);
    }


    // Shared listeners between different document sheets 
    _getId(ev) 
    {
        return this._getDataAttribute(ev, "id");
    }
    
    _getIndex(ev) 
    {
        return Number(this._getDataAttribute(ev, "index"));
    }

    _getKey(ev) 
    {
        return this._getDataAttribute(ev, "key");
    }

    _getType(ev) 
    {
        return this._getDataAttribute(ev, "type");
    }

    _getPath(ev) 
    {
        return this._getDataAttribute(ev, "path");
    }

    _getCollection(ev) 
    {
        return this._getDataAttribute(ev, "collection") || "items";
    }

    _getUUID(ev)
    {
        return this._getDataAttribute(ev, "uuid");
    }

    _getList(ev)
    {
        return foundry.utils.getProperty(this._getDocument(ev) || this.document, this._getPath(ev));
    }


    /**
     * Search for an HTML data property, specified as data-<property>
     * First search target of the event, then search in parent properties
     * @param {Event} ev Event triggered
     * @param {string} property data-<property> being searched for
     * @returns {object} property found
     */
    _getDataAttribute(ev, property)
    {
        let value = ev.target.dataset[property];

        if (!value) 
        {
            const parent = this._getParent(ev.target, `[data-${property}]`);
            if (parent) 
            {
                value = parent.dataset[property];
            }
        }
        return value;
    }

    _getParent(element, selector)
    {
        if (element.matches(selector))
        {
            return element;
        }
        if (!element.parentElement)
        {
            return null;
        }
        if (element.parentElement.matches(selector))
        {
            return element.parentElement;
        }
        else 
        {
            return this._getParent(element.parentElement, selector);
        }

    }

    _getDocument(event)
    {
        let id = this._getId(event);
        let collection = this._getCollection(event);
        let uuid = this._getUUID(event);

        return (uuid ? fromUuidSync(uuid) : this.document[collection]?.get(id));
    }

    _getDocumentAsync(event)
    {
        let id = this._getId(event);
        let collection = this._getCollection(event);
        let uuid = this._getUUID(event);

        return (uuid ? fromUuid(uuid) : this.document[collection]?.get(id));
    }
};

export default WarhammerSheetMixinV2;