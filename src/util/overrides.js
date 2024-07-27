/**
 *
 */
export default function () 
{

    // Convert functions that move data between world and compendium to retain ID
    Actors.prototype.fromCompendium = addKeepIdOption(Actors.prototype.fromCompendium);
    Items.prototype.fromCompendium = addKeepIdOption(Items.prototype.fromCompendium);
    Journal.prototype.fromCompendium = addKeepIdOption(Journal.prototype.fromCompendium);
    Scenes.prototype.fromCompendium = addKeepIdOption(Scenes.prototype.fromCompendium);
    RollTables.prototype.fromCompendium = addKeepIdOption(RollTables.prototype.fromCompendium);

    Actor.implementation.prototype.toCompendium = addKeepIdOption(Actor.implementation.prototype.toCompendium);
    Item.implementation.prototype.toCompendium = addKeepIdOption(Item.implementation.prototype.toCompendium);
    JournalEntry.implementation.prototype.toCompendium = addKeepIdOption(JournalEntry.implementation.prototype.toCompendium);
    Scene.implementation.prototype.toCompendium = addKeepIdOption(Scene.implementation.prototype.toCompendium);
    RollTable.implementation.prototype.toCompendium = addKeepIdOption(RollTable.implementation.prototype.toCompendium);


    function addKeepIdOption(orig)
    {
        return function(...args)
        {
            try 
            {
                args[1].keepId = true;
            }
            catch(e)
            {
                console.error("Error setting keepId: " + e);
            }
            return orig.bind(this)(...args);
        };
    }
}
