import WarhammerScript from "../system/script";
import { AvoidTestModel } from "./embedded/avoidTest";


export class WarhammerActiveEffectModel extends foundry.abstract.DataModel 
{
    
    static _avoidTestModel = AvoidTestModel;

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

    
    static defineSchema() 
    {
        let fields = foundry.data.fields;
        let schema = {};
        schema.transferData = new fields.SchemaField({
            type: new fields.StringField({initial : "document"}),
            originalType: new fields.StringField({initial : "document"}), // transfer type before application
            documentType: new fields.StringField({initial: "Actor"}),
            avoidTest: new fields.EmbeddedDataField(this._avoidTestModel),
            testIndependent: new fields.BooleanField({ initial: false }),
            preApplyScript: new fields.StringField({}),  // A script that runs before an effect is applied - this runs on the source, not the target
            equipTransfer: new fields.BooleanField({ initial: false }),
            selfOnly: new fields.BooleanField({ initial: false }),
            enableConditionScript: new fields.StringField({}),
            filter: new fields.StringField({}),
            prompt: new fields.BooleanField({ initial: false }),

            area : new fields.SchemaField({
                radius: new fields.StringField({ nullable: true }), // Area/Aura radius, if null, inherit from item
                templateData: new fields.SchemaField({
                    borderColor : new fields.ColorField({label : game.i18n.localize("TEMPLATE.BorderColor")}),
                    fillColor : new fields.ColorField({label : game.i18n.localize("TEMPLATE.FillColor")}),
                    texture : new fields.FilePathField({label : game.i18n.localize("WH.TransferData.Texture"), categories : ['IMAGE', 'VIDEO']})
                }),
                keep: new fields.BooleanField({ initial: false }), // Area/Aura - should they keep the effect when leaving
    
                aura : new fields.SchemaField({
                    transferred : new fields.BooleanField({initial : false}),
                    render: new fields.BooleanField({ initial: true }), // Whether or not to render the measured template
                }),
    
                // Placed Template
                duration: new fields.StringField({ initial: "sustained" }), // Area - "instantaneous" or "sustained"
            }),

            zone : new fields.SchemaField({
                type: new fields.StringField({initial: "zone"}), // previously "Zone type", "zone", "tokens", "self" or "follow"
                following : new fields.StringField(), // For applied followed zone effects to keep track of what token it's sourced from
                transferred: new fields.BooleanField({}),
                traits: new fields.ObjectField(),
                skipImmediateOnPlacement : new fields.BooleanField({}), // Very specific property, some zone effects do things "when they enter or when they start their turn" in the zone
                keep: new fields.BooleanField({ initial: false }),      // should they keep the effect when leaving
                //TODO                                                  // Immediate scripts work for when they enter the zone, but that means they shouldn't run when the effect is added to the zone
            })
        });

        schema.itemTargetData = new fields.SchemaField({
            ids: new fields.ArrayField(new fields.StringField({})),
            allItems: new fields.BooleanField({ initial: false })
        });

        schema.scriptData = new fields.ArrayField(new fields.SchemaField({
            script: new fields.StringField(),
            label: new fields.StringField(),
            trigger: new fields.StringField(),
            options: new fields.SchemaField({
                targeter: new fields.BooleanField({initial : false}),
                hideScript: new fields.StringField({}),
                activateScript: new fields.StringField({}),
                submissionScript: new fields.StringField({}),
                deleteEffect: new fields.BooleanField({initial : false}),
            }),
            async: new fields.BooleanField()
        }));

        // TODO move back into transferData
        schema.zone = new fields.SchemaField({
            type: new fields.StringField({initial: "zone"}), // previously "Zone type", "zone", "tokens", "self" or "follow"
            traits: new fields.ObjectField(),
            skipImmediateOnPlacement : new fields.BooleanField({}) // Very specific property, some zone effects do things "when they enter or when they start their turn" in the zone
            //TODO                                                  // Immediate scripts work for when they enter the zone, but that means they shouldn't run when the effect is added to the zone
        });

        schema.sourceData = new fields.SchemaField({
            zone : new fields.StringField(),
            area : new fields.StringField(),
            item: new fields.StringField(),
            test: new fields.ObjectField(),
        });


        return schema;
    }

    static avoidTestModel() 
    {

    }

    get scripts() 
    {
        if (!this._scripts) 
        {
            this._scripts = this.scriptData.map(s => new WarhammerScript(s, WarhammerScript.createContext(this.parent)));
        }
        return this._scripts;
    }

    get filterScript() 
    {
        if (this.transferData.filter) 
        {
            try 
            {
                return new WarhammerScript({ script: this.transferData.filter, label: `${this.name} Filter` }, WarhammerScript.createContext(this.parent));
            }
            catch (e) 
            {
                console.error("Error creating filter script: " + e);
                return null;
            }
        }
        else { return null; }
    }

    get testIndependent() 
    {
        return this.transferData.testIndependent;
    }

    get isTargetApplied() 
    {
        return this.transferData.type == "target" || (this.transferData.type == "aura" && this.transferData.area.aura.transferred);
    }

    get isAreaApplied() 
    {
        return this.transferData.type == "area";
    }

    get isCrewApplied() 
    {
        return this.transferData.type == "crew";
    }

    get itemTargets() 
    {
        if (this.itemTargetData.allItems)
        {
            return this.actor.items.contents;
        }
        else 
        {
            return this.itemTargetData.ids.map(i => this.actor.items.get(i)).map(i => i);;
        }
    }

    migrateData()
    {
        
    }

}