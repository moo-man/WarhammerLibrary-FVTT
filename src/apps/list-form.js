const { ApplicationV2 } = foundry.applications.api;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class ListPropertyForm extends HandlebarsApplicationMixin(ApplicationV2)
{
    static DEFAULT_OPTIONS = {
        tag : "form",
        classes : [],
        window : {
            contentClasses: ["standard-form"],
        },
        form: {
            handler: ListPropertyForm.submit,
            submitOnChange: false,
            closeOnSubmit: true
        }
    };

    static PARTS = {
        form: {
            template: "modules/warhammer-lib/templates/apps/list-form.hbs"
        },
        footer : {
            template : "templates/generic/form-footer.hbs"
        }
    };

    constructor(document, options)
    {
        super(options);
        this.document = document;
        this.index = options.index;
        this.path = options.path;
    }

    async _prepareContext(options)
    {
        let context = await super._prepareContext(options);
        context.values = this.list.get(this.index);
        context.fields = this.list.schema.fields.list.element.fields;
        context.buttons = [{ type: "submit", label: "Submit" }];
        return context;
    }

    static async submit(event, form, formData)
    {
        this.document.update(this.list.edit(this.options.index, formData.object));
    }

    get list() 
    {
        return foundry.utils.getProperty(this.document, this.path);
    }
}