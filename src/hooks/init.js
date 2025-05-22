import { systemConfig } from "../util/utility";
import CompendiumBrowserSettingsConfig from "../apps/browser/compendium-browser-settings.mjs";
import { WarhammerModuleInitializationV2 } from "../modules/module-initializationV2";
const {hasProperty, getProperty} = foundry.utils;

/**
 *
 */
export default function () 
{

    Hooks.on("init", () => 
    {
        CONFIG.ux.ContextMenu = warhammer.apps.WarhammerContextMenu;

        CONFIG.MeasuredTemplate.documentClass.prototype.areaEffect = function () 
        {
            let effectData = this.getFlag(game.system.id, "effectData");
            if (effectData) 
            {
                let effect = new CONFIG.ActiveEffect.documentClass(effectData);
                effect.updateSource({ "system.sourceData.area": this.uuid });
                return effect;
            }
        };

        Handlebars.registerHelper("ifIsGM", function (options) 
        {
            return game.user.isGM ? options.fn(this) : options.inverse(this);
        });

        Handlebars.registerHelper("isGM", function (options) 
        {
            return game.user.isGM;
        });

        Handlebars.registerHelper("config", function (key) 
        {
            return foundry.utils.getProperty(systemConfig(), key);
        });

        Handlebars.registerHelper("configLookup", function (obj, key) 
        {
            if (obj && key)
            {return systemConfig()[obj]?.[key];}
            
        });

        Handlebars.registerHelper("lookup", function (obj, key) 
        {
            if (key === 0)
            {
                key = "0"; // getProperty doesn't like 0 if using an array
            }
            if (!obj) 
            {
                return null;
            }
            else 
            {
                return foundry.utils.getProperty(obj, key?.toString());
            }
        });
    

        Handlebars.registerHelper("pct", function (part, whole, max100=true) 
        {
            let pct =  (part / whole) * 100;
            if (pct > 100 && max100)
            {
                pct = 100;
            }
            return pct;
        });

        Handlebars.registerHelper("add", function (a, b) 
        {
            return a + b; 
        });

        Handlebars.registerHelper("array", function (array, cls, args) 
        {
            if (typeof cls == "string")
            {
                let htmlProperties = Object.keys(args.hash).reduce((html, key) => html + " " + `data-${key}="${args.hash[key]}"`, "");
                return array.map((value, index) => `<a data-index=${index} class="${cls}" ${htmlProperties}>${value}</a>`).join(`<span class="separator ${cls}">, </span>`);
            }
            else
            {return array.join(", ");}
        });

        Handlebars.registerHelper("includes", function(array=[], value) 
        {
            return array.includes(value);
        });

        Handlebars.registerHelper("hasProperty", function (obj, key) 
        {
            return hasProperty(obj, key);
        });    

        Handlebars.registerHelper("tokenImg", function(actor) 
        {
            if (!actor)
            {
                return;
            }
            let tokens = actor.getActiveTokens();
            let tokenDocument = actor.prototypeToken;
            if(tokens.length == 1) 
            {
                tokenDocument = tokens[0].document;
            }
            return tokenDocument.hidden ? systemConfig().unknownTokenPath : tokenDocument.texture.src;
        });

        Handlebars.registerHelper("tokenName", function(actor) 
        {
            if (!actor)
            {
                return;
            }
            let tokens = actor.getActiveTokens();
            let tokenDocument = actor.prototypeToken;
            if(tokens.length == 1) 
            {
                tokenDocument = tokens[0].document;
            }
            return tokenDocument.hidden ? "???" : tokenDocument.name;
        });

        Handlebars.registerHelper("settings", function (key) 
        {
            let path = key.split(".");

            let setting = game.settings.get(game.system.id, path[0]);

            if (path.length > 1)
            {
                return foundry.utils.getProperty(setting, path.slice(1).join("."));
            }
            else 
            {
                return setting;
            }
        });

        Handlebars.registerHelper("fallback", function (value, fallback) 
        {
            return value ? value : fallback;
        });

        game.settings.registerMenu(game.system.id, "moduleInitializationMenu", {
            name: "WH.Initializer.SettingName",
            label: "WH.Initializer.SettingLabel",
            hint: "WH.Initializer.SettingHint",
            icon : "fa-solid fa-download",
            type: WarhammerModuleInitializationV2,
            restricted: true
        });

        // Compendium Browser source exclusion
        game.settings.registerMenu("warhammer-lib", "packSourceConfiguration", {
            name: "WH.CompendiumBrowser.Sources.Name",
            label: "WH.CompendiumBrowser.Sources.Label",
            hint: "WH.CompendiumBrowser.Sources.Hint",
            icon: "fas fa-book-open-reader",
            type: CompendiumBrowserSettingsConfig,
            restricted: true
        });

        game.settings.register(game.system.id, "packSourceConfiguration", {
            name: "Pack Source Configuration",
            scope: "world",
            config: false,
            type: Object,
            default: {},
            onChange: () => warhammer.apps.CompendiumBrowser.instance?.render(false, {changedTab: true})
        });

        game.settings.register(game.system.id, "compendiumWorldItems", {
            scope: "world",
            config: false,
            type: Boolean,
            default: true,
            onChange: () => warhammer.apps.CompendiumBrowser.instance?.render(false, {changedTab: true})
        });
    });
}