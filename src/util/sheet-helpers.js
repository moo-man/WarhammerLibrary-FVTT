class SheetHelpers 
{
    // Shared listeners between different document sheets 
    static _getId = function (ev) 
    {
        return this._getDataAttribute(ev, "id");
    };

    static _getIndex = function (ev) 
    {
        return Number(this._getDataAttribute(ev, "index"));
    };

    static _getKey = function (ev) 
    {
        return this._getDataAttribute(ev, "key");
    };

    static _getType = function (ev) 
    {
        return this._getDataAttribute(ev, "type");
    };

    static _getPath = function (ev) 
    {
        return this._getDataAttribute(ev, "path");
    };

    static _getCollection = function (ev) 
    {
        return this._getDataAttribute(ev, "collection") || "items";
    };

    static _getUUID = function (ev) 
    {
        return this._getDataAttribute(ev, "uuid");
    };

    static _getList = function (ev, sheetDocument=false) 
    {
        return foundry.utils.getProperty((sheetDocument ? this.document : (this._getDocument(ev) || this.document)), this._getPath(ev));
    };


    /**
     * Search for an HTML data property, specified as data-<property>
     * First search target of the event, then search in parent properties
     * @param {Event} ev Event triggered
     * @param {string} property data-<property> being searched for
     * @returns {object} property found
     */
    static _getDataAttribute = function (ev, property) 
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

    static _getParent = function (element, selector) 
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

    static _getDocument = function (event) 
    {
        let id = this._getId(event);
        let collection = this._getCollection(event);
        let uuid = this._getUUID(event);

        return (uuid ? fromUuidSync(uuid) : this.document[collection]?.get(id));
    };

    static _getDocumentAsync = function (event) 
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
    return;
}