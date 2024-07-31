import { keepID } from "../util/utility";
import combat from "./combat";
import handlebars from "./handlebars";
import init from "./init";
import token from "./token";

/**
 *
 */
export default function() 
{
    handlebars();
    init();
    combat();
    token();

    Hooks.on("preCreateJournalEntry", keepIDHook);
    Hooks.on("preCreateScene", keepIDHook);
    Hooks.on("preCreateRollTable", keepIDHook);
}

function keepIDHook(document, data, options)
{
    options.keepId = keepID(document);
}