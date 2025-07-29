import { addLinkSources } from "../util/utility";

export default function() 
{
    /**
     * Adds tooltips to journal sheet buttons and adds listeners for pseudo entities
     */
    Hooks.on("renderJournalEntryPageTextSheet", (obj, html, data) => 
    {
        addLinkSources(html);
    });

    Hooks.on("renderJournalEntrySheet", (sheet, html) => 
    {
        for(let header of html.querySelectorAll(".no-toc"))
        {
            html.querySelector(`nav [data-anchor='${header.dataset.anchor}']`)?.remove();
        }

        for(let header of html.querySelectorAll(".roll-table-embed:not(.include-toc) [data-anchor]"))
        {
            html.querySelector(`nav [data-anchor='${header.dataset.anchor}']`)?.remove();
        }
    });

    Hooks.on("renderJournalEntryPageProseMirrorSheet", (sheet, html) => 
    {
        let selector = html.querySelector("[name='title.level']");
        selector?.insertAdjacentHTML("beforeend", `<option value='4' ${sheet.document.title.level == 4 ? "selected" : ""}>Level 4</option>`);
    });

}