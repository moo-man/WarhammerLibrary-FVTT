import AreaTemplate from "../util/area-template";
import { localize } from "../util/utility";

const WarhammerSheetMixin = (cls) => class extends cls 
{
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
            const parent = $(ev.target).parents(`[data-${property}]`);
            if (parent) 
            {
                value = parent[0]?.dataset[property];
            }
        }
        return value;
    }

    _getDocument(event)
    {
        let id = this._getId(event);
        let collection = this._getCollection(event);
        let uuid = this._getUUID(event);

        return (uuid ? fromUuidSync(uuid) : this.object[collection].get(id));
    }

    activateListeners(html)
    {
        super.activateListeners(html);
        html.find(".effect-create").click(this._onEffectCreate.bind(this));  
        html.find(".effect-edit").click(this._onEditEmbeddedDoc.bind(this));  
        html.find(".effect-delete").click(this._onDeleteEmbeddedDoc.bind(this));  
        html.find(".effect-toggle").click(this._onEffectToggle.bind(this));  
        html.find(".item-edit").click(this._onEditEmbeddedDoc.bind(this));  
        html.find(".item-delete").click(this._onDeleteEmbeddedDoc.bind(this));  
    }

    async _onEffectCreate(ev) 
    {
        let type = ev.currentTarget.dataset.category;
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
        if (this.object.documentName == "Item")
        {
            effectData.name = this.object.name;
            effectData.img = this.object.img;
        }
        this.object.createEmbeddedDocuments("ActiveEffect", [effectData]).then(effects => effects[0].sheet.render(true));
    }

    _onEditEmbeddedDoc(ev)
    {
        let doc = this._getDocument(ev);
        doc?.sheet.render(true);
    }

    _onDeleteEmbeddedDoc(ev)
    {
        let doc = this._getDocument(ev);
        doc?.delete();
    }

    _onEffectToggle(ev)
    {
        let doc = this._getDocument(ev);
        doc.update({"disabled" : !doc.disabled});
    }
};

export default WarhammerSheetMixin;