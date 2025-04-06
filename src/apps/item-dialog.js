import addSheetHelpers from "../util/sheet-helpers";
import { localize, systemConfig } from "../util/utility";
const {getProperty} = foundry.utils;
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class ItemDialog extends HandlebarsApplicationMixin(ApplicationV2) 
{

    static DEFAULT_OPTIONS = {
        classes: ["item-dialog", "warhammer", "standard-form"],
        tag : "form",
        form : {
            handler : this.submit,
            submitOnChange : false,
            closeOnSubmit : true
        },
        window: {
            resizable : true,
            title : "WH.ItemDialog",
        },
        position : {
            height: 500,
            width: 400
        },
        actions : {
            clickItem : {buttons : [0, 2], handler: this._onClickItem}
        }
    };

    static PARTS = {
        form: {
            template: "modules/warhammer-lib/templates/apps/item-dialog.hbs",
            scrollable : [".dialog-list"]
        }
    };

    constructor(data, options)
    {
        super(options);
        addSheetHelpers(this);
        this.items = data.items || [];
        this.count = data.count || 1;
        this.chosen = [];
    }

    static _items = [];

    async _prepareContext(options)
    {
        let context = await super._prepareContext(options);
        context.items = this.items;
        context.text = this.options.text;
        context.title = this.options.title;
        context.chosen = this.chosen;
        return context;
    }

    static async submit(event, form, fromData)
    {
        let items = await Promise.all(this.items.filter((_, index) => this.chosen.includes(index)).map(i => 
        {
            // If index is provided instead of actual documents, make sure they are retrieved before sending them back
            if (this.options.indexed)
            {
                return fromUuid(i.uuid);
            }
            else 
            {
                return i;
            }
        }));
        if (this.options.resolve)
        {
            this.options.resolve(items);
        }
        return items;
    }

    static async create(items, count = 1, {title, text, skipSingularItemPrompt, indexed}={})
    {

        if (typeof items == "object" && !Array.isArray(items) && !(items instanceof Collection))
        {
            items = this.objectToArray(items);
        }

        if (count == 0 || items.length == 0)
        {
            return [];
        }

        if (items.length == 1 && skipSingularItemPrompt)
        {
            return items;
        }

        return new Promise((resolve) => 
        {
            new this({items, count}, {text, resolve, indexed}).render(true, {window : {title}});
        });
    }

    static async createFromFilters(filters, count, {title, text, items}={})
    {
        items = await ItemDialog.filterItems(filters, items);
        // TODO handle indexing for filters
        return ItemDialog.create(items, count, {title, text});    
    }

    
    // simulate document structure with key as the ID and the value as the name
    static objectToArray(object, img = systemConfig().blankItemImage, namePath)
    {
        return Object.keys(foundry.utils.deepClone(object)).map(key => 
        {
            return {
                id : key,
                name : namePath ? foundry.utils.getProperty(object[key], namePath) : object[key],
                img
            };
        });

    }

    static async filterItems(filters=[], items)
    {
        if (!items)
        {
            items = await this._fetchItems();
        }

        for (let f of filters)
        {
            // Choice filters
            if (f.path && f.operation)
            {
                let op = f.operation;
                if (op == "=")
                {
                    op = "==";
                }
                items = items.filter(i => 
                {
                    let property = foundry.utils.getProperty(i, f.path);
                    let value = f.value;
                    if ((systemConfig().filterValues || {})[f.path])
                    {
                        property = systemConfig().filterValues[f.path][property];
                        value = systemConfig().filterValues[f.path][value];
                    }
                    if (f.operation == "includes")
                    {
                        return (property || "").includes(value);
                    }
                    else 
                    {
                        return Roll.safeEval(`"${property}"${op}"${value}"`);
                    }
                });
            }
            // WFRP4e Template Filters
            else if (f.regex)
            {
                items = items.filter(i => Array.from(getProperty(i, f.property).matchAll(f.value)).length);
            }
            else 
            {
                let value = f.value;
                if (!Array.isArray(value))
                {
                    value = [value];
                }
                items = items.filter(i => value.includes(getProperty(i, f.property)));
            }
        }

        return items.sort((a, b) => a.name > b.name ? 1 : -1);
    }

    static async _fetchItems()
    {
        // If we've already fetched items, don't fetch again
        // This causes a slight bug in that new items won't be shown without refreshing
        if (this._items.length)
        {
            return [...this._items]; // Copy array so items don't get filtered
        }

        let items = game.items.contents;
        
        for (let p of game.packs) 
        {
            if (p.metadata.type == "Item") 
            {
                items = items.concat((await p.getDocuments()).filter(i => !this._items.find(existing => existing.id == i.id)));
            }
        }

        this._items = items; // Delay setting this so multiple item dialogs rendering don't return early

        return this._items;
    }

    static async _onClickItem(ev)
    {
        if (ev.button == 0)
        {

            let index = this._getIndex(ev);
            if (this.chosen.includes(index))
            {
                this.chosen = this.chosen.filter(i => i != index);
            }
            else if (this.count == "unlimited" || this.chosen.length < this.count)
            {
                this.chosen.push(index);
            }

            this._highlightChosen();
        }
        else if (ev.button == 2)
        {
            let uuid = this._getUUID(ev);
            if (uuid)
            {
                let item = await fromUuid(uuid);
                item?.sheet.render(true);
            }
        }
    }

    _highlightChosen()
    {
        let items = Array.from(this.element.querySelectorAll(".dialog-item"));
        items.filter(i => i.classList.contains("selected")).forEach(i => 
        {
            i.classList.remove("selected");
        });

        for(let chosen of this.chosen)
        {
            items[chosen].classList.add("selected");
        }
    }
}