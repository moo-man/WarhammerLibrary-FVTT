export default function() 
{

    Hooks.on("ready", async (app, html) => 
    {
        let currentLib = game.modules.get("warhammer-lib").version;
        let minimumLib = game.system.relationships.requires.find(i => i.id == "warhammer-lib").compatibility.minimum;
        if (foundry.utils.isNewerVersion(minimumLib, currentLib))
        {
            ui.notifications.error(game.i18n.format("WH.Error.LibraryOutaded", {system: game.system.title, minimum : minimumLib}), {localize : true, permanent : true});
        }
    });
}