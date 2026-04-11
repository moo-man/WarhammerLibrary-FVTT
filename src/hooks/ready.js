export default function() 
{

    Hooks.on("ready", async (app, html) => 
    {

        if (game.mErr)
        {
            warhammer.utility.error("Failed to load compendium data", true);
        }

        let currentLib = game.modules.get("warhammer-lib").version;
        let minimumLib = game.system.relationships.requires.find(i => i.id == "warhammer-lib").compatibility.minimum;
        if (foundry.utils.isNewerVersion(minimumLib, currentLib))
        {
            ui.notifications.error(game.i18n.format("WH.Error.LibraryOutaded", {system: game.system.title, minimum : minimumLib}), {localize : true, permanent : true});
        }

        if (game.settings.get("warhammer-lib", "disableDragRuler"))
        {
            CONFIG.Token.rulerClass = null;
        }
    
        if (!game.settings.get(game.system.id, "firstLoad"))
        {
            game.settings.set("core", "tokenAutoRotate", false);
            game.settings.set(game.system.id, "firstLoad", true);
            Hooks.callAll(`${game.system.id}:firstLoad`);
        }
    });
}