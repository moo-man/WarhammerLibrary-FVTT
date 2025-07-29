import { localize } from "../util/utility";

const { ApplicationV2 } = foundry.applications.api;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export default class WarhammerDiffEditor extends HandlebarsApplicationMixin(ApplicationV2)
{    
    static DEFAULT_OPTIONS = {
        tag : "form",
        classes: ["diff-editor", "warhammer"],
        window: {
            resizable : true,
            title : "WH.DiffEditor",
            contentClasses: ["standard-form"],
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
            contentLink : this._onClickContentLink,
            dereference : this._onDereference
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
            ui.notifications.error("WH.Error.MismatchedItemType", {localize: true});
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
      
    static async _onClickContentLink(ev, target)
    {
        let document = await foundry.utils.fromUuid(target.dataset.uuid);
        document?.sheet.render(true, {editable : false});
    }

    static async _onDereference(ev, target)
    {
        let document = this.options.document;
        this.generatedDiff = {name : document.name, flags : document.flags, effects : document.effects.contents.map(i => i.toObject()), img : document.img, type : document.type, dereferenced : true, system : document.system.toJSON()};
        this.render(true);
    }
}