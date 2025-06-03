const { ApplicationV2 } = foundry.applications.api;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export default class AdvancedEffectConfig extends HandlebarsApplicationMixin(ApplicationV2)
{

    static DEFAULT_OPTIONS = {
        tag: "form",
        classes: ["advanced-effect", "warhammer"],
        window: {
            resizable : true,
            title : "WH.AdvancedConfig",
            contentClasses: ["standard-form"],
        },
        position : {
            height: 700,
            width: 600
        },
        form: {
            handler: this._onSubmit,
            submitOnChange: true,
            closeOnSubmit: false
        },
        actions : {

        },
    };

    static PARTS = {
        form : {scrollable: [""], template : "modules/warhammer-lib/templates/effect/effect-advanced-config.hbs"}
    };

    constructor(document, options)
    {
        super(options);
        this.document = document;
    }

    async _prepareContext(options)
    {
        let context = await super._prepareContext(options);
        context.hidden = this.options.hidden;
        context.system = this.document.system;
        context.configuration = this.document.constructor.CONFIGURATION;
        context.hidden = this.options.hiddenProperties?.() || {};
        if (this.options.systemTemplate)
        {
            context.systemTemplate = await foundry.applications.handlebars.renderTemplate(this.options.systemTemplate, context);
        }
        context.avoidTypes = {
            "none" : "WH.TransferData.AvoidTestNone",
            "item" : "WH.TransferData.AvoidTestItem",
            "custom" : "WH.TransferData.AvoidTestCustom",
            "script" : "WH.TransferData.AvoidTestScript"
        };
        context.zoneTypes = {
            "zone" : "WH.ZoneEffect",
            "tokens" : "WH.TokensInZone",
            "follow" : "WH.FollowToken"
        };

        context.fields = this.document.system.schema.fields.transferData.fields;
        return context;
    }  

    static async _onSubmit(event, form, formData) 
    {
        let update = foundry.utils.expandObject(formData.object);
        await this.document.update(update);
        this.render({force : true});
    }

}

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