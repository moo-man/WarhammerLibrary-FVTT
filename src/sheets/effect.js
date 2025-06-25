import AdvancedEffectConfig from "../apps/advanced-effect";
import WarhammerEffectScriptEditor from "../apps/effect-script-editor";
import { localize, systemConfig } from "../util/utility";

export default class WarhammerActiveEffectConfig extends foundry.applications.sheets.ActiveEffectConfig
{
    systemTemplate = "";
    effectKeysTemplate = "";
    _advancedConfig = null;
    
    static DEFAULT_OPTIONS = {
        classes: ["warhammer"],
        actions: {
            addScript : this._onAddScript,
            editScript : this._onEditScript,
            deleteScript : this._onDeleteScript,
            advancedConfig : this._onAdvancedConfig,
            manualToggle : this._onManualToggle
        }
    };

    /** @override */
    static PARTS = {
        header: {template: "templates/sheets/active-effect/header.hbs"},
        tabs: {template: "templates/generic/tab-navigation.hbs"},
        details: {template: "templates/sheets/active-effect/details.hbs"},
        duration: {template: "templates/sheets/active-effect/duration.hbs"},
        changes: {template: "templates/sheets/active-effect/changes.hbs"},
        scripts: {template: "modules/warhammer-lib/templates/effect/effect-scripts.hbs"},
        footer: {template: "templates/generic/form-footer.hbs"}
    };
  
    /** @override */
    static TABS = {
        sheet: {
            tabs: [
                {id: "details", icon: "fa-solid fa-book"},
                {id: "duration", icon: "fa-solid fa-clock"},
                {id: "changes", icon: "fa-solid fa-cogs"},
                {id: "scripts", icon: "fa-solid fa-code"}
            ],
            initial: "details",
            labelPrefix: "EFFECT.TABS"
        }
    };


    async _onRender(context)
    {
        await super._onRender(context);

        let transferDataHTML = await foundry.applications.handlebars.renderTemplate("modules/warhammer-lib/templates/effect/effect-transfer-config.hbs", {system : this.document.system, document : this.document, hidden : this.hiddenProperties()});

        // Replace transfer field with Effect Application data (used to derive transfer value)
        this.element.querySelector("[name='transfer']")?.closest(".form-group").remove();//replaceWith(transferDataHTML);
        this.element.querySelector("[name='statuses']")?.closest(".form-group").remove();

        let details = this.element.querySelector("section[data-tab='details']");
        details.innerHTML += transferDataHTML;

        let manualToggle = document.createElement("div");
        manualToggle.classList.add("form-group");
        manualToggle.innerHTML = `<label>${localize("WH.ManualEffectKeys")}</label>
        <div class="form-fields"><input type="checkbox" data-action="manualToggle" name="flags.${game.system.id}.manualEffectKeys" ${this.document.getFlag(game.system.id, "manualEffectKeys") ? "checked" : ""}></div>`;


        // Replace attribute key field with a select field
        // Add a checkbox to toggle between <select> and <input> for effect keys
        let changes = this.element.querySelector("section[data-tab='changes']");
        changes.insertAdjacentElement("afterbegin", manualToggle);

        // Replace all key inputs with <select> fields (unless disabled)
        if (!this.document.getFlag(game.system.id, "manualEffectKeys"))
        {
            for (let element of changes.querySelectorAll(".key input"))
            {
                element.parentElement.innerHTML = await foundry.applications.handlebars.renderTemplate(this.effectKeysTemplate || systemConfig().effectKeysTemplate, {name : element.name, value : element.value});
            }
        }

        this.addSubmissionListeners();
    }

    async _preparePartContext(partId, context) 
    {
        let partContext = await super._preparePartContext(partId, context);

        if (partId == "scripts")
        {
            partContext.scripts = this.document.system.scriptData;
        }
        return partContext;
    }

    hiddenProperties()
    {
        let hidden = {};
        let effect = this.document;
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

    static _onAddScript(ev, target)
    {
        let scripts = this.document.system.scriptData.concat({label : localize("WH.NewScript"), script : ""});
        return this.submit({updateData: {
            [`system.scriptData`]: scripts
        }});
    }

    static _onDeleteScript(ev, target)
    {
        let index = target.closest("[data-index]").dataset.index;
        let scripts = this.document.system.scriptData.filter((value, i) => i != index);
        return this.submit({updateData: {
            [`system.scriptData`]: scripts
        }});
    }

    static _onEditScript(ev, target)
    {
        let index = target.closest("[data-index]").dataset.index;
        new WarhammerEffectScriptEditor(this.document, {index : Number(index)}).render({force: true});
    }

        html.on("click", ".script-config", ev => 
        {
            new WarhammerScriptConfig(this.object, {path : this._getDataAttribute(ev, "path")}).render(true);
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
            title : "WH.TemplateCustomization",
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
    }

    addSubmissionListeners()
    {
        this.element.querySelectorAll(".transfer-config input, .transfer-config select").forEach(element => 
        {
            element.addEventListener("change", async () => 
            {
                await this.submit(); 
                this._renderAdvancedConfig(false);
            });
        });
    }
}