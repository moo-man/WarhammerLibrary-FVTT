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

    
    Hooks.on("renderFilePicker", (app, html, data) => 
    {
        let folder = data.target.split("/")[0];
        if (folder == "systems" || folder == "modules") 
        {
            let upload = html.querySelector(".upload-file");
            if (upload)
            {
                upload.innerHTML = `<p style="text-align: center" data-tooltip="Upload disabled while in system directory. DO NOT put your assets within any system or module folder.">Upload Disabled <i style="display:inline-block; margin-left:5px;" class="fa-regular fa-circle-question"></i></p>`;
            }
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