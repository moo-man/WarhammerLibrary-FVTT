import WarhammerSheetMixinV2 from "../sheets/v2/mixin";

const { ApplicationV2 } = foundry.applications.api;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export default class WarhammerDiffEditor extends WarhammerSheetMixinV2(HandlebarsApplicationMixin(ApplicationV2))
{    
    static DEFAULT_OPTIONS = {
        tag : "form",
        classes: ["diff-editor", "warhammer", "standard-form"],
        window: {
            resizable : true,
            title : "WH.DiffEditor",
        },
        position : {
            height: 600,
            width: 500
        },
        form: {
            handler: this.submit,
            submitOnChange: false,
            closeOnSubmit: true
        },
        actions : {
            contentLink : this._onClickContentLink
        }
    };

    static PARTS = {
        diff : {template : "modules/warhammer-lib/templates/scripts/diff-editor.hbs", classes: ["diff"]},
        footer : {
            template : "templates/generic/form-footer.hbs"
        }
    };

    constructor(diff, options)
    {
        super(options);
        this.diff = diff;
    }

    static async wait(diff, options)
    {
        return new Promise(resolve => 
        {
            options.resolve = resolve;
            new this(diff, options).render(true);
        });
    }

    async _prepareContext() 
    {
        let context = await super._prepareContext();
        context.document = this.options.document;
        context.content = this.getContent();
        context.buttons = [{ type: "submit", label: "Submit" }];
        return context;
    }

    getContent()
    {
        return JSON.stringify(this.generatedDiff || this.diff);
    }

    async _onDropItem(data, ev)
    {
        let item = await Item.implementation.fromDropData(data);
        if (item?.type == this.options.document.type)
        {
            this.generatedDiff = {name : item.name, flags : foundry.utils.diffObject(this.options.document.flags, item.flags), system : foundry.utils.diffObject(this.options.document.system.toObject(), item.system.toObject())};
            this.render(true);
        }
        else if (item.type)
        {
            ui.notifications.error("Mismatched Item type");
        }
    }

    static async submit(ev, form, formData)
    {
        let diff = JSON.parse(formData.object.diff || "{}"); 
        if (this.options.resolve)
        {
            this.options.resolve(diff);
        }
    }

    _canDragDrop(selector) 
    {
        return true;
    }
      
    static async _onClickContentLink(ev)
    {
        let document = await this._getDocumentAsync(ev);
        document.sheet.render(true, {editable : false});
    }
}