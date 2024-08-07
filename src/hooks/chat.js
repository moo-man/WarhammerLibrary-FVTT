import { addLinkSources } from "../util/utility";


/**
 *
 */
export default function() 
{

    Hooks.on("renderChatMessage", async (app, html) => 
    {
        addLinkSources(html);
    });
}