
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

    }

    computeDerived() 
    {
        
    }

    getOtherEffects()
    {
        return [];
    }
}