class SheetHelpers 
{
    // Shared listeners between different document sheets 
    static _getId = (ev) => 
    {
        return this._getDataAttribute(ev, "id");
    };

    static _getIndex = (ev) => 
    {
        return Number(this._getDataAttribute(ev, "index"));
    };

    static _getKey = (ev) => 
    {
        return this._getDataAttribute(ev, "key");
    };

    static _getType = (ev) => 
    {
        return this._getDataAttribute(ev, "type");
    };

    static _getPath = (ev) => 
    {
        return this._getDataAttribute(ev, "path");
    };

    static _getCollection = (ev) => 
    {
        return this._getDataAttribute(ev, "collection") || "items";
    };

    static _getUUID = (ev) => 
    {
        return this._getDataAttribute(ev, "uuid");
    };

    static _getList = (ev) => 
    {
        return foundry.utils.getProperty(this._getDocument(ev) || this.document, this._getPath(ev));
    };


    /**
     * Search for an HTML data property, specified as data-<property>
     * First search target of the event, then search in parent properties
     * @param {Event} ev Event triggered
     * @param {string} property data-<property> being searched for
     * @returns {object} property found
     */
    static _getDataAttribute = (ev, property) => 
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
    };

    static _getParent = (element, selector) => 
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

    };

    static _getDocument = (event) => 
    {
        let id = this._getId(event);
        let collection = this._getCollection(event);
        let uuid = this._getUUID(event);

        return (uuid ? fromUuidSync(uuid) : this.document[collection]?.get(id));
    };

    static _getDocumentAsync = (event) => 
    {
        let id = this._getId(event);
        let collection = this._getCollection(event);
        let uuid = this._getUUID(event);

        return (uuid ? fromUuid(uuid) : this.document[collection]?.get(id));
    };
};

/**
 *
 * @param obj Object to add sheet helpers to
 */
export default function addSheetHelpers(obj)
{
    Object.assign(obj, SheetHelpers);
}