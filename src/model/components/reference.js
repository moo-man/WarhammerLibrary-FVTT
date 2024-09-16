import { ListModel } from "./list";

export class DocumentReferenceModel extends foundry.abstract.DataModel
{
    static defineSchema() 
    {
        let fields = foundry.data.fields;
        let schema = {};
        schema.uuid = new fields.StringField();
        schema.name = new fields.StringField();
        return schema;
    }

    getDocument() 
    {
        if (!this.document)
        {
            this.document = fromUuid(this.uuid);
        }
        return this.document;
    }

    set(document)
    {
        return {uuid : document.uuid, name : document.name};
    }
}

export class DocumentReferenceListModel extends ListModel 
{
    static listSchema = DocumentReferenceModel;

    add(value)
    {
        return this.list.concat({uuid : value.uuid, name : value.name});
    }

    get documents() 
    {
        return this.list.map(i => i.getDocument());
    }
}