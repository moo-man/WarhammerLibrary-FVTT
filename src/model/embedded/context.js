let fields = foundry.data.fields;

export class WarhammerTestContextModel extends foundry.abstract.DataModel 
{
    static defineSchema() 
    {
        let schema = {};
        schema.targetSpeakers = new fields.ArrayField({});
        schema.speaker = new fields.SchemaField({});
        schema.title = new fields.StringField({});
        schema.rollMode = new fields.StringField({});
        return schema;
    }

    get actor ()
    {
        return CONFIG.ChatMessage.documentClass.getSpeakerActor(this.speaker);
    }

    
    get targets() 
    {
        return this.targetSpeakers.map(CONFIG.ChatMessage.documentClass.getSpeakerActor);
    }
}