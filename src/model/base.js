import {getPackage} from "../util/utility.js";

export class BaseWarhammerModel extends foundry.abstract.DataModel 
{
    static metadata = {};

    get metadata() {
        return this.constructor.metadata;
    }

    get id () 
    {
        return this.parent.id;
    }
    
    static defineSchema() 
    {
        return {};
    }

    // This ensures automated form groups have `system` in their name
    // This is built in with `TypeDataModels` but those aren't being used
    static get schema() 
    {
        if ( this.hasOwnProperty("_schema") ) 
        {
            return this._schema;
        }
        const schema = super.schema;
        schema.name = "system";
        return schema;
    }

    /**
     * Filters available for this item type when using the compendium browser.
     * @returns {CompendiumBrowserFilterDefinition}
     */
    static get compendiumBrowserFilters() {
        return new Map();
    }

    static _deriveSource(uuid) {
        const pckg = getPackage(uuid);

        return {
            slug: pckg?.id ?? 'world',
            value: pckg?.title ?? game.i18n.localize('PACKAGE.Type.world')
        }
    }

    static addSourceData(data) {
        foundry.utils.setProperty(data, "system.source", this._deriveSource(data.uuid));
    }


    get source() {
        return this.constructor._deriveSource(this.parent.uuid);
    }


    async _preCreate(data, options, user) 
    {
    }

    async _preUpdate(data, options, user) 
    {
    }

    async _preDelete(options, user)
    {
     
    }

    async _onUpdate(data, options, user)
    {
       
    }

    async _onCreate(data, options, user)
    {
      
    }

    async _onDelete(options, user)
    {
        
    }

    computeBase() 
    {
        this._addModelProperties();
    }

    computeDerived() 
    {
        
    }

    _addModelProperties()
    {

    }

    getOtherEffects()
    {
        return [];
    }
}