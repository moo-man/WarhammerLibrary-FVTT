import WarhammerScript from "../system/script";
import { AvoidTestModel } from "./embedded/avoidTest";

let fields = foundry.data.fields;

export class WarhammerActiveEffectModel extends foundry.abstract.DataModel 
{

    static _avoidTestModel = AvoidTestModel;

    static defineSchema() 
    {
        let schema = {};
        schema.transferData = new fields.SchemaField({
            type: new fields.StringField({initial : "document"}),
            originalType: new fields.StringField({initial : "document"}), // transfer type before application
            documentType: new fields.StringField({initial: "Actor"}),
            avoidTest: new fields.EmbeddedDataField(this._avoidTestModel),
            testIndependent: new fields.BooleanField({ initial: false }),
            preApplyScript: new fields.StringField({}),  // A script that runs before an effect is applied - this runs on the source, not the target
            equipTransfer: new fields.BooleanField({ initial: false }),
            enableConditionScript: new fields.StringField({}),
            filter: new fields.StringField({}),
            prompt: new fields.BooleanField({ initial: false }),
            itemTargetIDs: new fields.ArrayField(new fields.StringField({}, { nullable: true, initial : null }))
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

        schema.zone = new fields.SchemaField({
            type: new fields.StringField({initial: "zone"}), // previously "Zone type", "zone", "tokens", or "follow"
            traits: new fields.ObjectField(),
            blockImmediateOnPlacement : new fields.BooleanField({}) // Very specific property, some zone effects do things "when they enter or when they start their turn" in the zone
            //TODO                                                  // Immediate scripts work for when they enter the zone, but that means they shouldn't run when the effect is added to the zone
        });
        
        schema.area = new fields.SchemaField({
            aura: new fields.BooleanField({ initial: false }),
            radius: new fields.StringField({ nullable: true }), // Area/Aura radius, if null, inherit from item
            transferred : new fields.BooleanField({initial : false}),
            render: new fields.BooleanField({ initial: true }), // Whether or not to render the measured template
            templateData: new fields.ObjectField(),

            keep: new fields.BooleanField({ initial: false }), // Area/Aura - should they keep the effect when leaving

            duration: new fields.StringField({ initial: "sustained" }), // Area - "instantaneous" or "sustained"
        });

        schema.sourceData = new fields.SchemaField({
            zone : new fields.StringField(),
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
        return this.transferData.type == "target" || (this.transferData.type == "aura" && this.transferData.targetedAura);
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
        let ids = this.itemTargetsData;
        if (ids.length == 0) 
        {
            return this.actor.items.contents;
        }
        else 
        {
            return ids.map(i => this.actor.items.get(i));
        }
    }

}
