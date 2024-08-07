import { addLinkSources } from "../util/utility";


/**
 *
 */
export default function() 
{
    /**
     * Adds tooltips to journal sheet buttons and adds listeners for pseudo entities
     */
    Hooks.on("renderJournalPageSheet", (obj, html, data) => 
    {
        addLinkSources(html);
    });
}