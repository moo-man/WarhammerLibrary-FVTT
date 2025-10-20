import WarhammerDiffEditor from "../../apps/diff-editor";
import WarhammerRichEditor from "../../apps/rich-editor";
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
            editRichText : this._onEditRichText,
            clickEffectButton : this._onClickEffectButton,
            editDiff : this._onEditDiff

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

    async _onDropCustom(data, event)
    {
        Hooks.call(`${game.system.id}:dropCustomData`, this, data, event);
    }

    _onRender(_context, _options) 
    {
        super._onRender(_context, _options);
        this.#dragDrop.forEach((d) => d.bind(this.element));

        addLinkSources(this.element);
        
        this._addEventListeners();
    }


    _configureRenderParts(options) 
    {
        if (this.document?.limited)
        {
            return this._configureLimitedParts(options);
        }
        else 
        {
            return super._configureRenderParts(options);
        }
    }

    _configureLimitedParts(options)
    {
        return super._configureRenderParts(options);
    }

    async _onFirstRender(context, options)
    {
        await super._onFirstRender(context, options);
        this._handleContainers();

        // Anything in a list row should be right clickable (usually items) unless otherwise specified (nocontext)
        this._createContextMenu(this._getContextMenuOptions, ".list-row:not(.nocontext)", {jQuery: false, fixed: true});

        // Left clickable context menus (3 vertical pips)
        this._createContextMenu(this._getContextMenuOptions, ".context-menu", {eventName : "click", jQuery: false, fixed: true});

        // Anything else that should be right clickable for context menus
        this._createContextMenu(this._getContextMenuOptions, ".context-menu-alt", {jQuery: false, fixed: true});
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

        this.element.querySelectorAll(".droppable").forEach(e => e.addEventListener("dragenter", ev => 
        {
            ev.target.classList.add("hover");
        }));
        this.element.querySelectorAll(".droppable").forEach(e => e.addEventListener("dragleave", ev => 
        {
            ev.target.classList.remove("hover");
        }));

        this.element.querySelectorAll(".sheet-tabs [data-tab]").forEach(e => e.addEventListener("dragenter", async ev => 
        {
            this.dragTab = true;
            console.log("enter");
            let {tab, group} = ev.currentTarget.dataset;
            await warhammer.utility.sleep(500);
            if (this.dragTab)
            {
                this.changeTab(tab, group);
            }
        }));

        this.element.querySelectorAll(".sheet-tabs [data-tab]").forEach(e => e.addEventListener("dragleave", ev => 
        {
            console.log("leave");
            this.dragTab = false;
        }));
    
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

        this.element.querySelectorAll(".name-list input").forEach(e => 
        {
            e.style.width = e.value.length + 2 + "ch";
        });
    
        this.element.querySelectorAll(".name-list .empty").forEach(e => 
        {
            e.style.width = "3rem";
            e.addEventListener("keydown", e => 
            {
                if (e.key === "Tab")
                {
                    let parent = this._getParent(e.target, ".form-group");
                    this.nameInputFocus = parent.dataset.group;
                }
                else 
                {
                    this.nameInputFocus = null;
                }
            });
        });
        
        if (this.nameInputFocus)
        {
            this.element.querySelector(`.${this.nameInputFocus} .empty`)?.focus();
        }
    }

    _getContextMenuOptions() 
    {
        return [];
    }

    
    async _prepareContext(options) 
    {
        let context = await super._prepareContext(options);
        if (this.document?.system)
        {
            context.system = this.document.system;
            context.fields = this.document.system.schema.fields;
            context.source = this.document.toObject();
        }
        context.tabs = this._prepareTabs(options);
        context.enriched = await this._handleEnrichment();

        return context;
    }

    async _preparePartContext(partId, context, options)
    {
        context.partId = `${this.id}-${partId}`;
        if (context.tabs)
        {
            context.tab = context.tabs[partId];
        }

        let fn = this[`_prepare${partId.capitalize()}Context`]?.bind(this);
        if (typeof fn == "function")
        {
            fn(context, options);
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

    static async _onEditEmbeddedDoc(ev, target)
    {
        let doc = await this._getDocumentAsync(ev, target);
        doc?.sheet.render(true);
    }

    static async _onDeleteEmbeddedDoc(ev, target)
    {
        let doc = await this._getDocumentAsync(ev, target);
        doc?.delete();
    }

    static async _onEffectToggle(ev, target)
    {
        let doc = await this._getDocumentAsync(ev, target);
        doc.update({"disabled" : !doc.disabled});
    }

    static async _onEditProperty(ev, target)
    {
        let document = (await this._getDocumentAsync(ev, target)) || this.document;
        let path = ev.target.dataset.path;
        document.update({[path] : ev.type == "number" ? Number(ev.target.value) : ev.target.value});
    }
  
    static async _onToggleProperty(ev, target)
    {
        let document = (await this._getDocumentAsync(ev, target)) || this.document;
        let path = target.dataset.path;
        document.update({[path] : !foundry.utils.getProperty(document, path)});
    }

    static async _onStepProperty(ev, target)
    {
        ev.stopPropagation();
        ev.preventDefault();
        let document = (await this._getDocumentAsync(ev, target)) || this.document;
        let path = target.dataset.path;
        let step = ev.button == 0 ? 1 : -1;
        step = ev.target.dataset.reversed ? -1 * step : step;
        if (ev.ctrlKey)
        {
            step *= 10;
        }
        document.update({[path] : foundry.utils.getProperty(document, path) + step});
    }

    static async _onListCreate(ev, target)
    {
        let doc = await this._getDocumentAsync(ev, target) || this.document;
        let list = this._getList(ev, target);

        if (list || target.dataset.force)
        {
            if (list instanceof Array || target.dataset.force)
            {
                return this._handleArrayCreate(doc, ev);
            }
            else 
            {
                return doc.update(list.add());
            }

        }
    }

    static async _onListCreateWithValue(ev, target)
    {
        let doc = await this._getDocumentAsync(ev, target) || this.document;
        let list = this._getList(ev, target);

        if (list)
        {
            if (list instanceof Array)
            {
                return this._handleArrayCreate(doc, ev);
            }
            doc.update(list.add(ev.target.value));
        }
    }

    static async _onListDelete(ev, target)
    {
        let doc = await this._getDocumentAsync(ev, target) || this.document;
        let list = this._getList(ev, target);
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

    static async _onListEdit(ev, target)
    {
        let doc = await this._getDocumentAsync(ev, target) || this.document;
        let list = this._getList(ev, target);
        let index = this._getIndex(ev);
        let internalPath = this._getDataAttribute(ev, "ipath");
        let value = ev.target.value;
        if (ev.target.type == "number" && value == "")
        {
            value = null;
        }
        if (ev.target.type == "checkbox")
        {
            value = ev.target.checked;
        }
        if (list)
        {
            if (list instanceof Array)
            {
                return this._handleArrayEdit(doc, ev);
            }
            doc.update(list.edit(index, value, internalPath));
        }

    }

    static async _onListForm(ev, target)
    {
        let doc = await this._getDocumentAsync(ev, target) || this.document;
        let list = this._getList(ev, target);
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

    static async _unsetReference(ev)
    {
        let doc = this.document;
        let path = this._getPath(ev);
        let property = foundry.utils.getProperty(doc, path);
        doc.update(property.unset());
    }

    static async _onEditDiff(event)
    {
        let index = this._getIndex(event);
        let list = this._getList(event);
        let listObject = list[index];
        let originalDocument = await listObject.document?.originalDocument;

        let newDiff = await WarhammerDiffEditor.wait(listObject.document?.diff, {document : originalDocument});

        if (newDiff.name)
        {
            listObject.name = newDiff.name;
        }
        else 
        {
            listObject.name = originalDocument.name;
        }
        this.document.update(list.edit(index, listObject));
    }

    
    // Compatibilty with array properties that don't use the ListModel
    _handleArrayCreate(doc, ev)
    {
        let list = this._getPath(ev);
        let arr = foundry.utils.getProperty(doc, list) || [];

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
        let internalPath = this._getDataAttribute(ev, "ipath");
        let arr = foundry.utils.getProperty(doc, list);

        // Not very good probably but it will do for now
        let value = parseInt(ev.target.value) || ev.target.value;

        if (arr)
        {
            doc.update({[list] : arr.map((val, i) => 
            {
                if (i == index)
                {
                    if (internalPath)
                    {
                        let newVal = foundry.utils.duplicate(val) || {};
                        foundry.utils.setProperty(newVal, internalPath, value);
                        return newVal;
                    }
                    else 
                    {
                        return value;
                    }
                }
                else 
                {
                    return val;
                }
            })});
        }
    }

    static async _onEditRichText(ev, target)
    {
        new WarhammerRichEditor(this.document, {path : target.dataset.path, index : target.dataset.index, ipath : target.dataset.ipath}).render(true);
    }

    async _toggleDropdown(ev, content, parentSelector=".list-row")
    {
        let dropdownElement = this._getParent(ev.target, parentSelector).querySelector(".dropdown-content");
        this._toggleDropdownAt(dropdownElement, content);
    }

    async _toggleDropdownAt(element, content)
    {
        let dropdownElement = element.querySelector(".dropdown-content") || element;

        if (dropdownElement.classList.contains("collapsed"))
        {
            dropdownElement.innerHTML = `<div class="dropdown-container">${content}<div>`;
            dropdownElement.classList.replace("collapsed", "expanded");
            // Fit content can't be animated, but we would like it be flexible height, so wait until animation finishes then add fit-content
            // sleep(500).then(() => dropdownElement.style.height = `fit-content`);
        
        }
        else if (dropdownElement.classList.contains("expanded"))
        {
        // dropdownElement.style.height = `${dropdownElement.scrollHeight}px`;
            dropdownElement.classList.replace("expanded", "collapsed");
        }
    }

    _handleContainers(context, options)
    {
        const containers = {};
        for (const [part, config] of Object.entries(this.constructor.PARTS)) 
        {
            if (!config.container?.id) {continue;}
            const element = this.element.querySelector(`[data-application-part="${part}"]`);
            if (!element) {continue;}
            if (!containers[config.container.id]) 
            {
                const div = document.createElement("div");
                div.dataset.containerId = config.container.id;
                div.classList.add(...config.container.classes ?? []);
                containers[config.container.id] = div;
                element.replaceWith(div);
            }
            containers[config.container.id].append(element);
        }
    }

    
};

export default WarhammerSheetMixinV2;