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
        if (this.relative && this.id)
        {
            return this.relative.get(this.id);
        }
        if (!this._document && (this.uuid || this.id))
        {
            if (this.uuid?.includes("Compendium"))
            {
                this._document = foundry.utils.fromUuid(this.uuid);
            }
            else 
            {
                this._document = foundry.utils.fromUuidSync(this.uuid);
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
        return {[`${this.schema.fieldPath}`] : {uuid : "", id : "", name : ""}};
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
        return {[`${this.schema.fieldPath}`] : {uuid : "", id : "", name : ""}};
    }
}

export class DiffReferenceModel extends DeferredReferenceModel
{
    static defineSchema() 
    {
        let schema = super.defineSchema();
        schema.diff = new foundry.data.fields.ObjectField();
        return schema;
    }

    get document() 
    {
        this._document = null;
        let document = super.document;
        if (document instanceof Promise)
        {
            return new Promise(resolve => 
            {
                document.then(doc => 
                {
                    let diffed = new doc.constructor(foundry.utils.mergeObject(doc.toObject(), this.diff));
                    diffed.originalDocument = doc;
                    resolve(diffed);
                });
            });
        }
        else if (document)
        {
            // return document.clone({[`flags.diff`] : foundry.utils.deepClone(this.diff)});
            let diffed = new document.constructor(foundry.utils.mergeObject(document.toObject(), this.diff));
            diffed.originalDocument = document;
            return diffed;
        }
        else 
        {
            return null;
        }
    }

    async awaitDocument()
    {
        this._document = await this.document;
        return this._document;
    }
}