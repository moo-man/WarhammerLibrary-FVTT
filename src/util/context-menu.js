export class WarhammerContextMenu extends foundry.applications.ux.ContextMenu
{

    render(target, options)
    {
        if (options.event.target.closest(".prevent-context") || ui.context.menu.length != 0)
        {
            return;
        }
        super.render(target, options);
    }
}
