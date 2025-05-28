import { keepID } from "../util/utility";
import combat from "./combat";
import handlebars from "./handlebars";
import init from "./init";
import journal from "./journal";
import note from "./note";
import ready from "./ready";
import template from "./template";
import token from "./token";
import zones from "./zones";
import debug from "./debug";
import sidebar from "./sidebar";
import directories from "./directories.js";

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
    directories();
    journal();
    note();
    template();
    token();
    sidebar();

    // #if _ENV == "development"
    debug();
    // #endif

    Hooks.on("preCreateJournalEntry", keepIDHook);
    Hooks.on("preCreateScene", keepIDHook);
    Hooks.on("preCreateRollTable", keepIDHook);

}

/**
 *
 * @param document
 * @param data
 * @param options
 */
function keepIDHook(document, data, options)
{
    options.keepId = keepID(document);
}