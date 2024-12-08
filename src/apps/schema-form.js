const { ApplicationV2 } = foundry.applications.api;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class SchemaForm extends HandlebarsApplicationMixin(ApplicationV2)
{
    static DEFAULT_OPTIONS = {
        tag : "form",
        window : {},
        form: {
            handler: this.submit,
            submitOnChange: false,
            closeOnSubmit: true
        }
    };

    static PARTS = {
        form: {
            template: "modules/warhammer-lib/templates/apps/list-form.hbs"
        }
    };

    constructor(document, options)
    {
        super(options);
        this.document = document;
        this.fieldPaths = options.fields;
        this.modelPath = options.model;
    }

    async _prepareContext(options)
    {
        let context = await super._prepareContext(options);
        context.values = this.model;
        context.fields = this.model.schema.fields;
        return context;
    }

    static async submit(event, form, formData)
    {
        this.document.update({[path] : formData.object});
    }

    get fields() 
    {
        return foundry.utils.getProperty(this.document, this.path);
    }
}