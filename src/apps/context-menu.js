import { localize } from "../util/utility";

export default class WarhammerContextMenu extends ContextMenu
{

    static create(app, html, selector, menuItems, {hookName="EntryContext", ...options}={}) 
    {
        // FIXME ApplicationV2 does not support these hooks yet
        app._callHooks?.(className => `get${className}${hookName}`, menuItems);
        return new this(html, selector, menuItems, options);
    }

    /**
     * Set the position of the context menu, taking into consideration whether the menu should expand upward or downward
     * @param {jQuery} html                   The context menu element.
     * @param {jQuery} target                 The element that the context menu was spawned on.
     * @param {object} [options]
     * @param {PointerEvent} [options.event]  The event that triggered the context menu opening.
     * @protected
     */
    _setPosition(html, target, { event }={}) 
    {
        // Append to target and get the context bounds
        // target.css("position", "absolute");
        html.css("visibility", "hidden");
        html.css("top", event.clientY);
        html.css("left", event.clientX);
        html.addClass("warhammer");

        $(document.body).append(html);
        // Display the menu
        html.toggleClass("expand-down");
        html.css("visibility", "");
        target.addClass("context");
    }

    render(target, options)
    {
        if (options.event.target.classList.contains("prevent-context") || ui.context.menu.length != 0)
        {
            return;
        }
        super.render(target, options);
    }

    // #target;

    // bind() 
    // {
    //     const element = this.element instanceof HTMLElement ? this.element : this.element[0];
    //     if (!this._listener)
    //     {
    //         this._listener = this.listener.bind(this);
    //     }
    //     element.removeEventListener(this.eventName, this._listener);
    //     element.addEventListener(this.eventName, this._listener);
    // }

    // listener(event) 
    // {
    //     const matching = event.target.closest(this.selector);
    //     if ( !matching ) {return;}
    //     event.preventDefault();
    //     const priorTarget = this.#target;
    //     this.#target = matching;
    //     const menu = this.menu;

    //     // Remove existing context UI
    //     const prior = document.querySelector(".context");
    //     prior?.classList.remove("context");
    //     if ( this.#target.contains(menu[0]) ) {return this.close();}

    //     // If the menu is already open, call its close handler on its original target.
    //     ui.context?.onClose?.(priorTarget);

    //     // Render a new context menu
    //     event.stopPropagation();
    //     ui.context = this;
    //     this.onOpen?.(this.#target);
    //     return this.render($(this.#target), { event });
    // };
}