import { ListModel } from "./list";

export class DocumentReferenceModel extends foundry.abstract.DataModel
{
    static defineSchema() 
    {
        let fields = foundry.data.fields;
        let schema = {};
        schema.uuid = new fields.StringField();
        schema.id = new fields.StringField();
        schema.name = new fields.StringField();
        return schema;
    }

    get document() 
    {
        if (this.schema.options.relative && this.id)
        {
            return foundry.utils.getProperty(this, this.schema.options.relative).get(this.id);
        }
        if (!this._document && (this.uuid || this.id))
        {
            if (this.uuid?.includes("Compendium"))
            {
                this._document = fromUuid(this.uuid);
            }
            else 
            {
                this._document = fromUuidSync(this.uuid);
            }

        }
        if (this._document instanceof Promise)
        {
            this._document.then(document => 
            {
                this._document = document;
            });
        }
        return this._document;
    }

    async awaitDocument()
    {
        this._document = await this.document;
        return this._document;
    }

    set(document)
    {
        return {[`${this.schema.fieldPath}`] : {uuid : document.uuid, id : document.id, name : document.name}};
    }

    unset() 
    {
        return {[`${this.schema.fieldPath}`] : {uuid : null, id : null, name : ""}};
    }
}

export class DeferredReferenceModel extends DocumentReferenceModel
{
    get document() 
    {
        if (this._document)
        {
            return this._document;
        }
        if (this.uuid)
        {
            let parsed = foundry.utils.parseUuid(this.uuid);
            let id = parsed.id;
            let type = parsed.type; 
            this._document = game.collections.get(type)?.get(id) || fromUuid(this.uuid);
        }
        else if (this.id)
        {
            this._document = warhammer.utility.findItemId(this.id);
        }

        if (this._document instanceof Promise)
        {
            this._document.then(document => 
            {
                this._document = document;
            });
        }

        return this._document;
    }

    set(document)
    {
        return {[`${this.schema.fieldPath}`] : {uuid : document.uuid, id : document.id, name : document.name}};
    }

    unset() 
    {
        return {[`${this.schema.fieldPath}`] : {uuid : null, id : null, name : ""}};
    }
}

export class DocumentReferenceListModel extends ListModel 
{
    static listSchema = DocumentReferenceModel;

    add(document)
    {
        return this._add({uuid : document.uuid, id : document.id, name : document.name});
    }

    _add(value)
    {
        return {[this.schema.fields.list.fieldPath] : this.list.concat(value)};
    }

    removeId(uuid)
    {
        return super.remove(this.list.findIndex(i => i.uuid == uuid));
    }

    get documents() 
    {
        return this.list.map(i => i.document).filter(i => i);
    }

    async awaitDocuments()
    {
        return await Promise.all(this.list.map(i => i.awaitDocument()));
    }
}

export class DeferredReferenceListModel extends ListModel 
{
    static listSchema = DeferredReferenceModel;

    add(document)
    {
        return {[this.schema.fields.list.fieldPath] : this.list.concat({uuid : document.uuid, id : document.id, name : document.name})};
    }

    get documents() 
    {
        return this.list.map(i => i.document).filter(i => i);
    }

    async awaitDocuments()
    {
        return await Promise.all(this.list.map(i => i.awaitDocument()));
    }
}