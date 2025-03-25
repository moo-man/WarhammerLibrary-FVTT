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
    chat();
    directories();
    journal();
    note();
    template();
    token();

    Hooks.on("preCreateJournalEntry", keepIDHook);
    Hooks.on("preCreateScene", keepIDHook);
    Hooks.on("preCreateRollTable", keepIDHook);

    
    Hooks.on("renderFilePicker", (app, html, data) => 
    {
        let folder = data.target.split("/")[0];
        if (folder == "systems" || folder == "modules") 
        {
            html.find("input[name='upload']").css("display", "none");
            let label = html.find(".upload-file label");
            label.text("Upload Disabled");
            label.append(`<i data-tooltip="Upload disabled while in system directory. DO NOT put your assets within any system or module folder." style="display:inline-block; margin-left:5px;" class="fa-regular fa-circle-question"></i>`);
        }
    });  
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