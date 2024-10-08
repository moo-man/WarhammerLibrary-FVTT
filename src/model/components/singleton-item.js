import { log } from "../../util/utility";
import { DocumentReferenceModel } from "./reference";


export class SingletonItemModel extends DocumentReferenceModel
{
    static defineSchema() 
    {
        let schema = {};
        schema.uuid = new foundry.data.fields.StringField();
        schema.name = new foundry.data.fields.StringField();
        return schema;
    }

    get document()
    {
        return fromUuidSync(this.uuid);
    }

    set(item)
    {
        log("New singleton item", {args : item});
        if (this.document)
        {
            log("Deleting old singleton item", {args: this.document});
            this.document.delete();
        }
        return super.set(item);
    }

    delete()
    {
        return {[`${this.schema.fieldPath}`] : {uuid : "", name : ""}};
    }
}