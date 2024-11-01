
export class BaseWarhammerModel extends foundry.abstract.DataModel 
{
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