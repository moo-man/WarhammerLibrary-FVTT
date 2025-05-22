import WarhammerSheetMixinV2 from "../sheets/v2/mixin";

const { ApplicationV2 } = foundry.applications.api;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export default class WarhammerRichEditor extends HandlebarsApplicationMixin(ApplicationV2)
{    
    static DEFAULT_OPTIONS = {
        tag : "form",
        classes: ["rich-editor", "warhammer"],
        window: {
            resizable : true,
            title : "WH.RichEditor",
        },
        position : {
            height: 600,
        },
        form: {
            handler: this.submit,
            submitOnChange: true,
            closeOnSubmit: false
        },
    };

    static PARTS = {
        choices : {template : "modules/warhammer-lib/templates/apps/rich-editor.hbs"}
    };

    constructor(document, options)
    {
        super(options);
        this.document = document;
    }

    // static async wait(script, options={})
    // {
    //     return new Promise(resolve => 
    //     {
    //         options.resolve = resolve;
    //         options.script = script;
    //         new this(null, options).render(true);
    //     });
    // }

    async _prepareContext() 
    {
        let context = await super._prepareContext();  
        let index = this.options.index;
        let ipath = this.options.ipath;
        let path = this.options.path;

        if(!isNaN(index))
        {
            context.text = foundry.utils.getProperty(this.document, `${path}.${index}.${ipath || ""}`);
        }
        else 
        {
            context.text = foundry.utils.getProperty(this.document, this.options.path);
        }

        return context;
    }

    static async submit(ev, form, formData)
    {
        let text = formData.object.text; 
        let index = this.options.index;
        let ipath = this.options.ipath;
        let path = this.options.path;
        if(!isNaN(index))
        {
            let arr = foundry.utils.deepClone(foundry.utils.getProperty(this.document, path));
            foundry.utils.setProperty(arr[index], ipath, text);
            return this.document.update({[path] : arr});
        }
        else 
        {
            return this.document.update({[path] : text});
        }
    }


}