import { keepID } from "../util/utility";
import handlebars from "./handlebars";
import ready from "./ready";

/**
 *
 */
export default function() 
{
    handlebars();
    ready();

    // Hooks.on("preCreateJournalEntry", keepID)
    // Hooks.on("preCreateScene", keepID)
    // Hooks.on("preCreateRollTable", keepID)
}