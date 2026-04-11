import { addLinkSources } from "../util/utility";

export default function() 
{

    Hooks.on("renderRollTableSheet", (sheet, html) => 
    {
        addLinkSources(sheet.element);
    });

}