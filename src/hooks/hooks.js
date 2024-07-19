import { keepID } from "../util/utility";
import handlebars from "./handlebars";
import init from "./init";

/**
 *
 */
export default function() 
{
    handlebars();
    init();

    Hooks.on("preCreateJournalEntry", keepIDHook);
    Hooks.on("preCreateScene", keepIDHook);
    Hooks.on("preCreateRollTable", keepIDHook);
}

function keepIDHook(document, data, options)
{
    options.keepId = keepID(document);
}