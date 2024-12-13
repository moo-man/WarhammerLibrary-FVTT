import WarhammerSheetMixinV2 from "../sheets/v2/mixin";
import ChoiceDecision from "./choice-decision";
import { ChoiceOptionFormV2 } from "./choice-option";
const { ApplicationV2 } = foundry.applications.api;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export default class ChoiceConfigV2 extends WarhammerSheetMixinV2(HandlebarsApplicationMixin(ApplicationV2))
{

    static DEFAULT_OPTIONS = {
        classes: ["choice-config", "warhammer"],
        window: {
            resizable : true,
            title : "WH.Choice.Config",
            controls: [
                {
                    action: "openChoiceDialog",
                    icon: "fa-solid fa-share-nodes",
                    label: "Choice Dialog"
                }
            ]
        },
        position : {
            height: 600,
            width: 500
        },
        actions : {
            listEdit : this._onListEdit,
            listCreate : this._onListCreate,
            listDelete : this._onListDelete,
            toggleConnector : this._onToggleConnector,
            openChoiceDialog : this._onOpenChoiceDialog
        },
        dragDrop: [{ dragSelector: '.option', dropSelector: ".option" }],

        defaultTab : "options"
    };

    static PARTS = {
        choices : {scrollable: [".list-content"], template : "modules/warhammer-lib/templates/apps/choice-config.hbs"}
    };

    constructor(document, options)
    {
        super(options);
        this.document = document;
        this.choices = foundry.utils.getProperty(this.document.system, this.options.path);
    }

    
    static TABS = {
        options: {
            id: "options",
            group: "primary",
            label: "Options",
            icon : "fa-solid fa-ballot",
        },
        structure: {
            id: "structure",
            group: "primary",
            label: "Structure",
            icon: "fa-solid fa-share-nodes"
        }
    };

    async _prepareContext(options)
    {
        let data = await super._prepareContext(options);
        data.options = this.choices.options;
        data.structureHTML = this.constructStructureHTML();
        return data;
    }

    constructStructureHTML(structure)
    {
        structure = structure || this.choices.structure;
        return `<div class="choice" data-id=${structure.id}>
        ${this._choiceHTML(structure.options, structure.type)}
        </div>`;
    }

    _choiceHTML(options, type)
    {
        let choiceLabel = game.i18n.localize(type == "and" ? "WH.Choice.AND" : "WH.Choice.OR");
        return options.map(i => 
        {
            if (i.type != "option")
            {
                return this.constructStructureHTML(i);
            }
            else 
            {
                let option = this.choices.options.find(c => c.id == i.id);
                return `<a class="option" data-id=${option.id}>${option.name}</a>`;
            }
        }).join(`<span class="connector" data-action="toggleConnector">${choiceLabel}</span>`);
    }

    async _onDrop(ev)
    {
        let dropData = JSON.parse(ev.dataTransfer.getData("text/plain"));
        let document;
        if (dropData.type == "Item")
        {
            document = await Item.implementation.fromDropData(dropData);
        }
        else if (dropData.type == "ActiveEffect")
        {
            document = await ActiveEffect.implementation.fromDropData(dropData);
        }
        else if (dropData.type == "option" && dropData.id)
        {
            this.handleOptionDrop(ev.target.dataset.id, dropData.id);
        }
        if (document)
        {
            this._updateObject(this.choices.addOption(document));
        }
    }

    handleOptionDrop(dropId, optionId)
    {
        this._updateObject({structure : this.choices.move(optionId, dropId)});
    }

    async _updateObject(choices)
    {
        await this.document.update({[`system.${this.options.path}`] : choices});
        this.choices = foundry.utils.getProperty(this.document.system, this.options.path);
        this.render(true);
    }

    _canDragStart(selector) 
    {
        return true;
    }
      
      
    _canDragDrop(selector) 
    {
        return true;
    }

    _onDragStart(ev)
    {
        if (ev.target.classList.contains("option"))
        {
            ev.dataTransfer.setData("text/plain", JSON.stringify({type : "option", id : ev.target.dataset.id}));
        }

    }

    _onDragOption(ev)
    {
        ev.dataTransfer.setData("text/plain", JSON.stringify({type : "option", id : ev.target.dataset.id}));
    }

    static _onToggleConnector(ev)
    {
        this._updateObject({structure : this.choices.switch(ev.target.parentElement.dataset.id)});
    }

    static _onOpenChoiceDialog()
    {
        new ChoiceDecision(this.choices).render(true);
    }

    static async _onListCreate()
    {
        let type = await foundry.applications.api.DialogV2.wait(
            {
                window : {title : game.i18n.localize("WH.Choice.CreateOption")},
                content : game.i18n.localize("WH.Choice.CreateOptionDetails"),
                buttons : [
                    {
                        action: "placeholder",
                        label : game.i18n.localize("WH.Choice.Placeholder"),
                    },
                    {
                        action : "filter",
                        label : game.i18n.localize("WH.Choice.Filter"),
                    }],
            });

        let structureData;
        if (type == "filter")
        {
            structureData = this.choices.addOption({type : "filter", name : game.i18n.localize("WH.Choice.Filter")});
        }
        else if (type == "placeholder")
        {
            structureData = this.choices.addOption({type : "placeholder", name : game.i18n.localize("WH.Choice.Placeholder")});
        }
        if (structureData)
        {
            await this._updateObject(structureData);
            let index = this.choices.options.length - 1;
            new ChoiceOptionFormV2({choices : this.choices, index, updateChoices : this._updateObject.bind(this)}).render(true);
        }

    }

    static _onListDelete(event) 
    {
        let id = this._getId(event);
        this._updateObject(this.choices.deleteOption(id));
    }

    static async _onListEdit(event) 
    {
        let optionId = this._getId(event);
        let options = foundry.utils.deepClone(this.choices.options);
        let index = options.findIndex(o => o.id == optionId);
        if (index != -1)
        {
            if (["placeholder", "filter"].includes(options[index].type))
            {
                new ChoiceOptionFormV2({choices : this.choices, index, updateChoices : this._updateObject.bind(this)}).render(true);
            }
            else 
            {
                let document = await this.choices.getOptionDocument(options[index].id, this.document);
                if (document.documentName == "Item")
                {

                    document.sheet.render(true, {editable : false});

                    // new WHItemDiffSheet(document, {diffUpdater : (newDiff) => 
                    // {
                    //     warhammer.utility.log("Updating DIFF: ", this.document, index, newDiff);
                    //     options[index].diff = newDiff;
                    //     if (newDiff.name)
                    //     {
                    //         options[index].name = newDiff.name;
                    //     }
                    //     this._updateObject({options});
                    // }, diff : options[index].diff}).render(true);
                    
                }
                else 
                {
                    document.sheet.render(true);
                }
            }

        }
    }

    
}