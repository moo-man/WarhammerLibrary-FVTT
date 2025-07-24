/**
 * Generic helper used to conveniently prompt for some basic input
 * Has the ability to provide preset values, turning the input element into a select element
 */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
import DraggableApp from "./draggable";

export default class DragDialog extends DraggableApp(HandlebarsApplicationMixin(ApplicationV2))  
{
    static DEFAULT_OPTIONS = {
        classes: ["drag-dialog", "warhammer"],
        tag : "form",
        form : {
            handler : this.submit,
            submitOnChange : false,
            closeOnSubmit : true
        },
        window: {
            title : "WH.Dialog.DragDialog",
            contentClasses: ["standard-form"]
        },
        position : {
            height: 300,
            width: 300
        },
        actions : {
        },
        dragDrop: [{ dragSelector: null, dropSelector: ".window-content" }],

    };

    static PARTS = {
        form: {
            template: "modules/warhammer-lib/templates/apps/dialog/drag-dialog.hbs",
        }
    };

  
    constructor({text, title, filter, onError = game.i18n.localize("WH.Dialog.DragFilter")}, options)
    {
        if (title)
        {
            options.title = title;
        } 
        super(options);
        this.filter = filter;
        this.text = text;
        this.onError = onError;
    }

    close()
    {
        super.close();
        this.options.resolve();
    }

    /**
     * Submits the dialog, returning the input value
     * 
     * @param {Event} event event triggering submission
     * @param {HTMLElement} form HTML Element for the form
     * @param {Object} formData form data from the dialog
     * @returns 
     */
    static async submit(event, form, formData)
    {
        if (this.options.resolve)
        {
            this.options.resolve(this.document);
        }
        return formData.object.value;
    }

    /** @inheritdoc */
    async _prepareContext(options)
    {
        let context = await super._prepareContext(options);
        context.document = this.document;
        context.text = this.text || game.i18n.localize("WH.Dialog.DragText");
        return context;
    }

    async _onDropItem(data, ev)
    {
        let item = await Item.implementation.fromDropData(data);
        if (!this.filter)
        {
            this.document = item;
            this.render({force : true});
        }
        else if (this.filter && this.filter(item)) 
        {
            this.document = item;
            this.render({force : true});
        }
        else if (this.onError)
        {
            return ui.notifications.error(this.onError);
        }
    }

    static async create({text, title, filter, onError}={}, options={})
    {
        return new Promise(resolve => 
        {
            options.resolve = resolve;
            new this({text, title, filter, onError}, options).render({force :true, window: {title}});
        });
    }
}