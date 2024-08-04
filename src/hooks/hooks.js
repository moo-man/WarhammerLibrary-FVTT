import { keepID } from "../util/utility";
import combat from "./combat";
import handlebars from "./handlebars";
import init from "./init";
import zones from "./zones";

/**
 *
 */
export default function() 
{
    handlebars();
    init();
    combat();
    zones();

    Hooks.on("preCreateJournalEntry", keepIDHook);
    Hooks.on("preCreateScene", keepIDHook);
    Hooks.on("preCreateRollTable", keepIDHook);
}

function keepIDHook(document, data, options)
{
    options.keepId = keepID(document);
}