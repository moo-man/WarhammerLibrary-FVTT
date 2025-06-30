export default function () 
{
    Hooks.on("renderCompendiumDirectory", (app, html) => 
    {
        html = html instanceof HTMLElement ? html : html[0];
        warhammer.apps.CompendiumBrowser.injectSidebarButton(html);
    });
}