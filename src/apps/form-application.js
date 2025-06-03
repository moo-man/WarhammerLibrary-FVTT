// More closely aligns with old V1 FormApplication
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
export class WHFormApplication extends HandlebarsApplicationMixin(ApplicationV2)
{
    static DEFAULT_OPTIONS = {
        tag : "form",
        classes : ["warhammer"],
        window : {
            contentClasses: ["standard-form"]
        },
        form: {
            handler: this.submit,
            submitOnChange: false,
            closeOnSubmit: true
        }
    };

    constructor(document, options)
    {
        super(options);
        this.document = document;
    }

    _configureRenderParts(options) 
    {
        let parts = super._configureRenderParts(options);
        if (this.options.form.submitOnChange)
        {
            delete parts.footer;
        }
        return parts;
    }

    async _prepareContext(options)
    {
        let context = await super._prepareContext(options);
        context.rootId = this.id;
        if (!this.options.form.submitOnChange)
        {
            context.buttons = [{ type: "submit", label: "Submit" }];
        }
        return context;
    }

    static async submit(event, form, formData)
    {
        return this.document.update(formData.object);
    }

}