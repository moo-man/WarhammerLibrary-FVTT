import { systemConfig } from "../util/utility";
import { WarhammerTestContextModel } from "./embedded/context";


export class WarhammerTestMessageModel extends foundry.abstract.DataModel 
{
    static defineSchema() 
    {
        let fields = foundry.data.fields;
        let schema = {};
        schema.context = new fields.ObjectField();
        schema.testData = new fields.ObjectField();
        schema.result = new fields.ObjectField();
        return schema;
    }

    get test() 
    {
        
        let test = new (systemConfig().rollClasses[this.context.rollClass])();
        test.data = {...this};
        test.dice = Roll.fromData(test.testData.dice);
        if (test.context.rerolled)
        {
            test.rerolledDice = Roll.fromData(test.testData.reroll);
        }
        return test;
    }
}