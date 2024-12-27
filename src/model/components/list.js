import { ListPropertyForm } from "../../apps/list-form";
import { DeferredReferenceModel, DiffReferenceModel, DocumentReferenceModel } from "./reference";

// Generic list of objects
export class ListModel extends foundry.abstract.DataModel
{
    
    static createListModel(schema, options)
    {
        return new foundry.data.fields.EmbeddedDataField(class cls extends ListModel 
        {
            static listSchema = schema;
        }, options);
    }
    
    static listSchema = new foundry.data.fields.ObjectField();
    
    static defineSchema() 
    {
        let schema = {};
        schema.list = new foundry.data.fields.ArrayField(this.listSchema instanceof foundry.data.fields.DataField ? this.listSchema : new foundry.data.fields.EmbeddedDataField(this.listSchema) );
        return schema;
    }

    add(value)
    {
        return {[this.schema.fields.list.fieldPath] : this.list.concat(value || this.constructor.listSchema.initial())};
    }

    edit(index, value, path)
    {
        let list = foundry.utils.duplicate(this.list);
        if (typeof value == "object")
        {
            if (path)
            {
                foundry.utils.mergeObject(list[index], {[path] : value}, {overwrite : true});
            }
            else 
            {
                foundry.utils.mergeObject(list[index], value, {overwrite : true});
            }
        }
        else if (["string", "number", "boolean"].includes(typeof value))
        {
            if (path)
            {
                foundry.utils.setProperty(list[index], path, value);
            }
            else 
            {
                list[index] = value;
            }
        }
        return {[this.schema.fields.list.fieldPath] : list};
    }

    remove(index)
    {
        index = Number(index);
        return {[this.schema.fields.list.fieldPath] : this.list.filter((value, i) => i != index)};
    }

    removeId(id)
    {
        if (id.includes("."))
        {
            return this.remove(this.list.findIndex(i => i.uuid == id));
        }
        else 
        {
            return this.remove(this.list.findIndex(i => i.id == id));
        }
    }

    get(index)
    {
        return this.list[index];
    }

    toForm(index, document)
    {
        new ListPropertyForm(document, {path : this.schema.fieldPath, index, window : {title : this.schema.options.label}}).render(true);
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

    get documents() 
    {
        if (this.relative)
        {
            this.list.forEach(i => i.relative = this.relative);
        }
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

export class DiffReferenceListModel extends DeferredReferenceListModel
{
    static listSchema = DiffReferenceModel;
}