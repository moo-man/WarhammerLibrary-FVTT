import { format, systemConfig } from "../util/utility";
import { WarhammerModuleContentHandler } from "./content-handler";
import { localize } from "../util/utility";

const { ApplicationV2 } = foundry.applications.api;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class WarhammerModuleInitializationV2 extends HandlebarsApplicationMixin(ApplicationV2)
{

    static DEFAULT_OPTIONS = {
        window : {
            title : "WH.Initializer.Title",
            resizable: true
        },
        position : {
            width: 1000,
            height: 800
        },
        actions : {
            initialize : this.initialize,
            update : this.update,
            delete : this.delete
        },
        classes : ["warhammer", "module-initializer"],
        id : "module-initializer"
    };

    static PARTS = {
        initializer : {
            template: "modules/warhammer-lib/templates/modules/module-initialization.hbs"
        }
    };

    async _prepareContext(options)
    {
        let context = await super._prepareContext(options);
        context.modules = Object.keys(systemConfig().premiumModules).filter(i => i != game.system.id).map(m => 
        {
            let module = game.modules.get(m)?.toJSON();
            let moduleData = {
                installed : !!module,
                active : game.modules.get(m)?.active,
                initialized : game.modules.get(m)?.active && game.settings.get(m, "initialized"),
                data : module,
                title : systemConfig().premiumModules[m]
            };            
            if (!moduleData.installed)
            {
                moduleData.tooltip = "WH.Initializer.Tooltips.NotInstalled";
            }
            else if (!moduleData.active)
            {
                moduleData.tooltip = "WH.Initializer.Tooltips.NotActive";
            }
            return moduleData;
        });
        return context;
    }

    static async initialize(ev, target)
    {
        let key = target.closest("[data-module]").dataset.module;
        let module = game.modules.get(key);
        let dialogContent = format("WH.Updater.DialogContent", {title : module.title, description : module.description});
        dialogContent += `
        <ul>
        ${module.flags.initializationPacks.map(p => 
    {
        let pack = game.packs.get(p);
        pack.getIndex();
        return `<li>${pack.metadata.type}: ${pack.index.size} </li>`;
    }).join("")}
        </ul>
        <hr>
        ${systemConfig().copyrightText.replace("@AUTHORS@", Array.from(module.authors).slice(0, module.authors.size - 1).map(i => i.name).join(", "))}
        `;
        if (await foundry.applications.api.DialogV2.confirm({window: {title : `${localize("WH.Initialize")} ${module.title}`}, content : dialogContent, classes : ["initialization"]}))
        {
            new WarhammerModuleContentHandler(module).initialize();
            game.settings.set(key, "initialized", true);
        }
    }

    static async update(ev, target)
    {
        let key = target.closest("[data-module]").dataset.module;
        let module = game.modules.get(key);
        
        let update = await foundry.applications.api.DialogV2.wait({
            window: { title: game.i18n.format("UpdaterTitle", {module : module.title})},
            content: `
                ${localize("WH.Initializer.UpdaterText")}
              <label><input type="checkbox" name="actors"> ${localize("WH.Initializer.OverwriteActors")}</label>
              <label><input type="checkbox" name="journals"> ${localize("WH.Initializer.OverwriteJournals")}</label>
              <label><input type="checkbox" name="tables"> ${localize("WH.Initializer.OverwriteTables")}</label>
              <label><input type="checkbox" name="scenes"> ${localize("WH.Initializer.OverwriteScenes")}</label>
              <label><input type="checkbox" name="macros"> ${localize("WH.Initializer.OverwriteMacros")}</label>
              <hr>
              <label><input type="checkbox" name="excludeNameChanges"> ${localize("WH.Initializer.UpdaterExclude")}</label>
              <p class="hint">${localize("WH.Initializer.UpdaterExcludeHint")}</p>
            `,
            classes : ["initialization"],
            buttons : [{
                action: "update",
                label: "Update",
                callback: (event, button, dialog) => new foundry.applications.ux.FormDataExtended(button.form).object
            },
            {
                action: "cancel",
                label: "Cancel",
                callback: (event, button, dialog) => false

            }]
        });

        if (update)
        {
            new WarhammerModuleContentHandler(module).update(update);
        }
    }

    static async delete(ev, target)
    {
        let key = target.closest("[data-module]").dataset.module;
        let module = game.modules.get(key);
        if (await foundry.applications.api.DialogV2.confirm({window: {title : format("WH.Initializer.DeleteModuleContent", {title : module.title})}, 
            content : format("DeleteModuleContentDesc", {module : module.title}),
            classes : ["initialization"]
        }))
        {
            new WarhammerModuleContentHandler(module).delete();
        }
    }
}