import { addLinkSources } from "../util/utility";

export default class WarhammerChatMessage extends ChatMessage 
{

    /** @inheritDoc */
    async renderHTML(options)
    {
        let html = await super.renderHTML(options);

        // Add tooltips to links showing what premium module it links to, if any 
        addLinkSources(html);

        // Call DataModel
        await this.system.onRender?.(html);

        // Listen for actions
        html.addEventListener("click", event => 
        {
            const target = event.target.closest("[data-action]");
            if ( target ) 
            {
                this.onChatAction(event, target);
            }
        });

        return html;
    }

    onChatAction(event, target)
    {
        let action = target.dataset.action;
        let actionFn = this.system.constructor?.actions[action]?.bind(this.system);
        if (actionFn)
        {
            actionFn(event, target);
        }
    }
}