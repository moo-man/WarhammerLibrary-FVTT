import { ListPropertyForm } from "../../apps/list-form";

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
            foundry.utils.mergeObject(list[index], value, {overwrite : true});
        }
        else if (typeof value == "string" || typeof value == "number")
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

    get(index)
    {
        return this.list[index];
    }

    toForm(index, document)
    {
        new ListPropertyForm(document, {path : this.schema.fieldPath, index, window : {title : this.schema.options.label}}).render(true);
    }
}

// // List of objects that reference some embedded document on the parent
// export class DocumentListModel extends ListModel 
// {
//     static defineSchema() 
//     {
//         let schema = super.defineSchema();
//         schema.list = new fields.ArrayField(new fields.EmbeddedDataField(DocumentReferenceModel));
//         return schema;
//     }

//     removeId(id) 
//     {
//         let index = this.list.findIndex(i => i.id == id);

//         if (index != -1) {return this.remove(index);}
//         else {return this.list;}
//     }

//     findDocuments(collection) 
//     {
//         this.list.forEach(i => i.getDocument(collection));
//         this.documents = this.list.map(i => i.document);
//         return this.documents;
//     }

//     addDocument(document)
//     {
//         return this.add({
//             id : document.id,
//             name : document.name,
//             type : document.documentName
//         });
//     }
// }

// // List of document references that could point to world items, or compendium items
// // If ID is found in the world, use that, otherwise, search the compendium
// export class DeferredDocumentListModel extends DocumentListModel 
// {
//     static defineSchema() 
//     {
//         let schema = super.defineSchema();
//         schema.list = new fields.ArrayField(new fields.EmbeddedDataField(DeferredDocumentModel));
//         return schema;
//     }

//     get(id)
//     {
//         return this.list.find(i => i.id == id).getDocument();
//     }
    
//     getDocuments()
//     {
//         return Promise.all(this.list.map(i => i.getDocument()));
//     }

//     get html() 
//     {
//         return this.list.map(i => `<a data-id=${i.id}>${i.name}</a>`).join(", ");
//     }
// }