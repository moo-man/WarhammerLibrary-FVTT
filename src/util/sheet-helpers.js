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

    static _getList = function (ev, target) 
    {
        return foundry.utils.getProperty(this._getDocument(ev, target) || this.document, this._getPath(ev));
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
        return element.closest(selector);
    };

    static _getDocument = function (event, target) 
    {
        if (target?.dataset.document == "this" || event.target.dataset.document == "this")
        {
            return this.document;
        }
        let id = this._getId(event);
        let collection = this._getCollection(event);
        let uuid = this._getUUID(event);

        return (uuid ? fromUuidSync(uuid) : this.document[collection || "items"]?.get(id));
    };

    static _getDocumentAsync = function (event, target) 
    {
        if (target?.dataset.document == "this" || event.target.dataset.document == "this")
        {
            return this.document;
        }
        let id = this._getId(event);
        let collection = this._getCollection(event);
        let uuid = this._getUUID(event);

        return (uuid ? fromUuid(uuid) : this.document[collection || "items"]?.get(id));
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