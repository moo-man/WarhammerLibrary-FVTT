export default function() 
{

    Hooks.on("renderApplication", (app, html, data) => 
    {
        warhammer.utility.log(`Rendering ${app.constructor.name}`, {args : data});
    });

    Hooks.on("ready", () => 
    {
        fromUuidSync("Item.KycEfE5L0DRbgLxU.ActiveEffect.OzYvvoXQuxn3nCzS").sheet.render(true);
        // new WFRP4eThemeConfig().render(true);
        // ui.sidebar.activateTab("chat");
        // ui.sidebar.toggleExpanded();
    });
}