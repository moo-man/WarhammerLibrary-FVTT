import WarhammerSheetMixinV2 from "../sheets/v2/mixin";
import { localize } from "../util/utility";

const { ApplicationV2 } = foundry.applications.api;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export default class WarhammerDiffEditor extends WarhammerSheetMixinV2(HandlebarsApplicationMixin(ApplicationV2))
{    
    static DEFAULT_OPTIONS = {
        tag : "form",
        classes: ["diff-editor", "warhammer"],
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
        choices : {template : "modules/warhammer-lib/templates/scripts/diff-editor.hbs"}
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
        let data = await super._prepareContext();
        data.document = this.options.document;
        data.content = this.getContent();
        return data;
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
            this.generatedDiff = {name : item.name, system : foundry.utils.diffObject(this.options.document.system.toObject(), item.system.toObject())};
            this.render(true);
        }
        else if (item.type)
        {
            ui.notifications.error(localize("WH.Error.MismatchedItemType"));
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
      

    _onRender(options)
    {
        super._onRender(options);
        this.element.querySelector("textarea").addEventListener("keydown", ev => 
        {
            if (ev.key == "Tab")
            {
                ev.preventDefault();
                let target = ev.target;
                var start = target.selectionStart;
                var end = target.selectionEnd;
    
                target.value = target.value.substring(0, start) + "\t" + target.value.substring(end);
    
                target.selectionStart = target.selectionEnd = start + 1;
            }
        });

    }

    static async _onClickContentLink(ev)
    {
        let document = await this._getDocumentAsync(ev);
        document.sheet.render(true, {editable : false});
    }
}