export class WarhammerContextMenu extends ContextMenu
{

    render(target, options)
    {
        if (options.event.target.classList.contains("prevent-context") || ui.context.menu.length != 0)
        {
            return;
        }
        super.render(target, options);
    }
}
