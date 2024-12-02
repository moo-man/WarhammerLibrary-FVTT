import { systemConfig } from "../util/utility";
const {hasProperty, getProperty} = foundry.utils;

/**
 *
 */
export default function () 
{

    Hooks.on("init", () => 
    {

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
                return foundry.utils.getProperty(obj, key.toString());
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
                let htmlProperties = Object.keys(args.hash).reduce((html, key) => html + " " + `data-${key}=${args.hash[key]}`, "");
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
            return game.settings.get(game.system.id, key);
        });
    });
}