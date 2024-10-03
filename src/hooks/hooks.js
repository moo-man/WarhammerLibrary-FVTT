import { keepID } from "../util/utility";
import chat from "./chat";
import combat from "./combat";
import handlebars from "./handlebars";
import init from "./init";
import journal from "./journal";
import note from "./note";
import ready from "./ready";
import template from "./template";
import token from "./token";
import zones from "./zones";

/**
 *
 */
export default function() 
{
    ready();
    handlebars();
    init();
    combat();
    zones();
    chat();
    journal();
    note();
    template();
    token();

    Hooks.on("preCreateJournalEntry", keepIDHook);
    Hooks.on("preCreateScene", keepIDHook);
    Hooks.on("preCreateRollTable", keepIDHook);
}

function keepIDHook(document, data, options)
{
    options.keepId = keepID(document);
}