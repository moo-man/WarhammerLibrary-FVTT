import WarhammerEffectScriptEditor from "../apps/effect-script-editor";
import WarhammerScriptEditor from "../apps/script-editor";
import { localize, systemConfig } from "../util/utility";
import WarhammerSheetMixin from "./mixin";

export default class WarhammerActiveEffectConfig extends WarhammerSheetMixin(ActiveEffectConfig)
{
    systemTemplate = "";
    effectKeysTemplate = "";
    
    static get defaultOptions() 
    {
        const options = super.defaultOptions;
        options.classes.push("warhammer");
        return options;
    }

    async _render(force, options)
    {
        await super._render(force, options);

        let scriptHTML = await renderTemplate("modules/warhammer-lib/templates/effect/effect-scripts.hbs", {scripts : this.object.system.scriptData});
        let transferDataHTML = await renderTemplate("modules/warhammer-lib/templates/effect/effect-transfer-config.hbs", await this.getData());

        // Add Scripts Tab and tab section
        this.element.find("nav").append(`<a class='item' data-tab="scripts"><i class="fas fa-gavel"></i>${localize("WH.Script")}</a>`);
        $(`<section class='tab' data-tab="scripts">${scriptHTML}</section>`).insertBefore(this.element.find("footer"));

        // Replace transfer field with Effect Application data (used to derive transfer value)
        this.element.find("[name='transfer']").parents(".form-group").replaceWith(transferDataHTML);

        this.element.find("[name='statuses']").parents(".form-group").remove();

        // // Replace attribute key field with a select field
        let effectsTab = this.element.find("section[data-tab='effects']");

        // Add a checkbox to toggle between <select> and <input> for effect keys
        $(`<div class="form-group">
        <label>${localize("WH.ManualEffectKeys")}</label>
        <input type="checkbox" class="manual-keys" name="flags.${game.system.id}.manualEffectKeys" ${this.object.getFlag(game.system.id, "manualEffectKeys") ? "checked" : ""}>
        </div>`).insertBefore(effectsTab.find(".effects-header"));

        // Replace all key inputs with <select> fields (unless disabled)
        if (!this.object.getFlag(game.system.id, "manualEffectKeys"))
        {
            for (let element of effectsTab.find(".key input"))
            {
                $(element).replaceWith(await renderTemplate(this.effectKeysTemplate || systemConfig().effectKeysTemplate, {name : element.name, value : element.value}));
            }
        }

        // Activate Script tab if that is the cause of the rerender. It is added after rendering so won't be automatically handled by the Tabs object
        if (options?.renderData?.system?.scriptData)
        {
            this.activateTab("scripts");
        }
        this.element.css("height", "auto");
    }

    async getData()
    {
        let data = await super.getData();
        data.system = this.object.system;
        data.configuration = this.object.constructor.CONFIGURATION;
        if (this.systemTemplate)
        {
            data.systemTemplate = await renderTemplate(this.systemTemplate, data);
        }
        data.hidden = this.hiddenProperties();
        return data;
    }

    hiddenProperties()
    {
        let hidden = {};
        let effect = this.object;
        let transferData = effect.system.transferData;
        hidden.selfOnly = transferData.type != "target" && (transferData.type != "aura" || !transferData.area.aura.transferred);
        if (transferData.type == "document")
        {
            hidden.preApplyScript = true;
            hidden.filter = true;
            hidden.avoidTest = true;
            hidden.prompt = true;
            hidden.testIndependent = true;
        }
        if (transferData.type == "damage")
        {
            // TODO damage can probably work with Item document type
            //      when damage,d provide automatically provide a prompt to select an item

            // hidden.documentType = true;
            // hidden.testIndependent = true;
            // hidden.prompt = true;
        }
        return hidden;
    }

    activateListeners(html)
    {
        super.activateListeners(html);

        html.on("click", ".add-script", () => 
        {
            let scripts = this.object.system.scriptData.concat({label : localize("WH.NewScript"), script : ""});
            return this.submit({preventClose: true, updateData: {
                [`system.scriptData`]: scripts
            }});
        });

        html.on("click", ".script-delete", ev => 
        {
            let index = this._getDataAttribute(ev, "index");
            let scripts = this.object.system.scriptData.filter((value, i) => i != index);
            return this.submit({preventClose: true, updateData: {
                [`system.scriptData`]: scripts
            }});
        });

        html.on("click", ".script-edit", ev => 
        {
            let index = this._getDataAttribute(ev, "index");
            new WarhammerEffectScriptEditor(this.object, {index : Number(index)}).render(true);
        });

        html.on("click", ".script-config", ev => 
        {
            new WarhammerScriptEditor(this.object, {path : this._getDataAttribute(ev, "path")}).render(true);
        });

        html.on("change", ".wh-effect-config input,.wh-effect-config select", () => 
        {
            this.submit({preventClose: true});
        });

        html.on("change", ".manual-keys", () => 
        {
            this.submit({preventClose: true});
        });

        html.on("click", ".configure-template", () => 
        {
            new EmbeddedMeasuredTemplateConfig(this.object).render(true);
        });
    }
}

const { ApplicationV2 } = foundry.applications.api;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class EmbeddedMeasuredTemplateConfig extends HandlebarsApplicationMixin(ApplicationV2)
{
    static DEFAULT_OPTIONS = {
        tag : "form",
        window: {
            contentClasses: ["standard-form"],
            title : "Template Customization"
        },
        form: {
            handler: this.submit,
            submitOnChange: false,
            closeOnSubmit: true
        }
    };

    static PARTS = {
        form: {
            template: "modules/warhammer-lib/templates/apps/template-config.hbs"
        }
    };

    constructor(document, options)
    {
        super(options);
        this.document = document;
    }

    async _prepareContext(options)
    {
        let context = await super._prepareContext(options);
        context.values = this.document._source.system.transferData.area.templateData;
        context.fields = this.document.system.schema.fields.transferData.fields.area.fields.templateData.fields;
        return context;
    }

    static async submit(event, form, formData)
    {
        this.document.update(formData.object);
    }

    get list() 
    {
        return foundry.utils.getProperty(this.document, this.path);
    }
}