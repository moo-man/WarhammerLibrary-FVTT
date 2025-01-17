import WarhammerContextMenu from "../../apps/context-menu";
import { ListPropertyForm } from "../../apps/list-form";
import addSheetHelpers from "../../util/sheet-helpers";
import { addLinkSources, localize} from "../../util/utility";

const WarhammerSheetMixinV2 = (cls) => class extends cls  
{
    #dragDrop;

    constructor(options = {}) 
    {
        super(options);
        addSheetHelpers(this);
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
            unset : this._unsetReference,
            stepProperty : {buttons: [0, 2], handler : this._onStepProperty},
            togglePip : this._onTogglePip,
            clickEffectButton : this._onClickEffectButton,
            editImage : this._onEditImage
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
    
        this.element.querySelectorAll("[data-action='listCreateValue']").forEach(element => 
        {
            element.addEventListener("change", this.constructor._onListCreateWithValue.bind(this));
        });

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
        // return  
        return [
            WarhammerContextMenu.create(this, this.element, ".list-row:not(.nocontext)", this._getContetMenuOptions()), 
            WarhammerContextMenu.create(this, this.element, ".context-menu", this._getContetMenuOptions(), {eventName : "click"}),
            WarhammerContextMenu.create(this, this.element, ".context-menu-alt", this._getContetMenuOptions())
        ];
    }

    _getContetMenuOptions() 
    {

    }

    
    async _prepareContext(options) 
    {
        let context = await super._prepareContext(options);
        if (this.document)
        {
            context.system = this.document.system;
            context.fields = this.document.system.schema.fields;
            context.source = this.document.toObject();
        }
        context.tabs = this._prepareTabs(options);
        context.enriched = await this._handleEnrichment();

        return context;
    }

    async _preparePartContext(partId, context) 
    {
        context.partId = `${this.id}-${partId}`;
        if (context.tabs)
        {
            context.tab = context.tabs[partId];
        }

        let fn = this[`_prepare${partId.capitalize()}Context`]?.bind(this);
        if (typeof fn == "function")
        {
            fn(context);
        }

        return context;
    }

    _prepareTabs(options) 
    {
        if (!this.constructor.TABS)
        {
            return;
        }
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

    static async _onCreateEffect(ev, target) 
    {
        let type = target.dataset.category;
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
        let document = (await this._getDocumentAsync(ev)) || this.document;
        let path = ev.target.dataset.path;
        document.update({[path] : ev.type == "number" ? Number(ev.target.value) : ev.target.value});
    }
  
    static async _onToggleProperty(ev, target)
    {
        let document = (await this._getDocumentAsync(ev)) || this.document;
        let path = target.dataset.path;
        document.update({[path] : !foundry.utils.getProperty(document, path)});
    }

    static async _onStepProperty(ev, target)
    {
        ev.stopPropagation();
        ev.preventDefault();
        let document = (await this._getDocumentAsync(ev)) || this.document;
        let path = target.dataset.path;
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

    static async _onListCreateWithValue(ev)
    {
        let doc = await this._getDocumentAsync(ev) || this.document;
        let list = this._getList(ev);

        if (list)
        {
            if (list instanceof Array)
            {
                return this._handleArrayCreate(doc, ev);
            }
            doc.update(list.add(ev.target.value));
        }
    }

    static async _onListDelete(ev)
    {
        let doc = await this._getDocumentAsync(ev) || this.document;
        let list = this._getList(ev);
        let index = this._getIndex(ev);

        if (list)
        {
            if (list instanceof Array)
            {
                return this._handleArrayDelete(doc, ev);
            }
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
            if (list instanceof Array)
            {
                return this._handleArrayEdit(doc, ev);
            }
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

    static async _onTogglePip(ev)
    {
        let path = this._getPath(ev);
        let clicked = this._getIndex(ev);
        let currentValue = foundry.utils.getProperty(this.document, path);
        let newValue;
        if (clicked + 1 == currentValue)
        {
            newValue = clicked;
        }
        else 
        {
            newValue = clicked + 1;
        }
        this.document.update({[path] : newValue});
    }

    async _unsetReference(ev)
    {
        let doc = await this._getDocumentAsync(ev) || this.document;
        let path = this._getPath(ev);
        let property = foundry.utils.getProperty(doc, path);
        doc.update({[path] : property.unset()});
    }

    
    // TODO: Remove in V13
    static async _onEditImage(event) 
    {
        const attr = event.target.dataset.edit;
        const current = foundry.utils.getProperty(this.document, attr);
        const fp = new FilePicker({
            current,
            type: "image",
            callback: path => 
            {
                this.document.update({img : path});
            },
            top: this.position.top + 40,
            left: this.position.left + 10
        });
        await fp.browse();
    }

    modifyHTML()
    {
        // replacePopoutTokens(this.element);
        addLinkSources(this.element);
    }

    
    // Compatibilty with array properties that don't use the ListModel
    _handleArrayCreate(doc, ev)
    {
        let list = this._getPath(ev);
        let arr = foundry.utils.getProperty(doc, list);

        // Not very good probably but it will do for now
        let value = parseInt(ev.target.value) || ev.target.value;
        
        if (arr)
        {
            doc.update({[list] : arr.concat(value)});
        }
    }
    _handleArrayDelete(doc, ev)
    {
        let list = this._getPath(ev);
        let index = this._getIndex(ev);
        let arr = foundry.utils.getProperty(doc, list);
        
        if (arr)
        {
            doc.update({[list] : arr.filter((_, i) => i != index)});
        }
    }
    _handleArrayEdit(doc, ev)
    {
        let list = this._getPath(ev);
        let index = this._getIndex(ev);
        let arr = foundry.utils.getProperty(doc, list);

        // Not very good probably but it will do for now
        let value = parseInt(ev.target.value) || ev.target.value;

        if (arr)
        {
            doc.update({[list] : arr.map((val, i) => 
            {
                if (i == index)
                {
                    return value;
                }
                else 
                {
                    return val;
                }
            })});
        }
    }
};

export default WarhammerSheetMixinV2;