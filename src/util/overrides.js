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


    /**
     *
     * @param orig
     */
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




    /**
     * Handle JournalEntry document drop data
     * @param {DragEvent} event   The drag drop event
     * @param {object} data       The dropped data transfer data
     * @protected
     */
    NotesLayer.prototype._onDropData = async function(event, data) 
    {
        let entry;
        const coords = this._canvasCoordinatesFromDrop(event);
        if ( !coords ) {return false;}
        const noteData = {x: coords[0], y: coords[1]};
        if ( data.type === "JournalEntry" ) {entry = await JournalEntry.implementation.fromDropData(data);}
        if ( data.type === "JournalEntryPage" ) 
        {
            const page = await JournalEntryPage.implementation.fromDropData(data);
            entry = page.parent;
            noteData.pageId = page.id;
            noteData.flags = {anchor : data.anchor };
            noteData.name = data.anchor.name;
        }
        if ( entry?.compendium ) 
        {
            const journalData = game.journal.fromCompendium(entry);
            entry = await JournalEntry.implementation.create(journalData);
        }
        noteData.entryId = entry?.id;
        return this._createPreview(noteData, {top: event.clientY - 20, left: event.clientX + 40});
    };

    let _NoteConfigSubmitData = NoteConfig.prototype._getSubmitData;
  
    NoteConfig.prototype._getSubmitData = function(updateData={})
    {
        let data = _NoteConfigSubmitData.bind(this)(updateData);

        data["flags.anchor"] = this.object.flags.anchor;
        return data;
    }; 
}
