import addSheetHelpers from "../util/sheet-helpers";
import { localize } from "../util/utility";
import { WHFormApplication } from "./form-application";

export class WarhammerZoneConfig extends WHFormApplication
{

    static configTemplate = ""; // Defined by system subclass

    static DEFAULT_OPTIONS = 
        {
            tag: "form",
            classes : ["warhammer", "zone-config"],
            window : {
                title : "WH.ZoneConfig",
                contentClasses : ["standard-form"]
            },
            position : {
                width : 300
            },
            actions : {
                deleteEffect: this._onDeleteEffect,
                createEffect: this._onCreateEffect,
                openEffect: this._onOpenEffect
            },
            defaultTab : "config"
        };

    static PARTS = {
        tabs : {template : "modules/warhammer-lib/templates/partials/sheet-tabs.hbs"},
        config: { template: this.configTemplate },
        effects : { template : "modules/warhammer-lib/templates/apps/zone-effects.hbs" },
        footer : {
            template : "templates/generic/form-footer.hbs"
        }
    };

    static TABS = {
        config: {
            id: "config",
            group: "primary",
            label: "WH.Configuration",
        },
        effects: {
            id: "effects",
            group: "primary",
            label: "WH.Effects",
        }
    };

    constructor(document, options)  
    {
        super(options);
        addSheetHelpers(this);
        this.document = document;
    }

    async _prepareContext(options)
    {
        let context = await super._prepareContext(options);
        context.tabs = this._prepareTabs(options);
        context.basePath = this.document.documentName == "ActiveEffect" ? "system.transferData.zone.traits" : `flags.${game.system.id}.traits`;
        context.effects = this.document.getFlag(game.system.id, "effects");
        context.traits = foundry.utils.getProperty(this.document, context.basePath);
        return context;
    }

    _prepareTabs()
    {
        let tabs = foundry.utils.deepClone(this.constructor.TABS);

        for (let t in tabs) 
        {
            tabs[t].active = this.tabGroups[tabs[t].group] === tabs[t].id,
            tabs[t].cssClass = tabs[t].active ? "active" : "";
        }

        if (!Object.values(tabs).some(t => t.active) && this.options.defaultTab) 
        {
            tabs[this.options.defaultTab].active = true;
            tabs[this.options.defaultTab].cssClass = "active";
        }

        if (this.document.documentName == "ActiveEffect")
        {
            delete tabs.effects;
        }

        return tabs;
    }

    async _preparePartContext(partId, context) 
    {
        context.partId = `${this.id}-${partId}`;
        context.tab = context.tabs[partId];

        let fn = this[`_prepare${partId.capitalize()}Context`]?.bind(this);
        if (typeof fn == "function")
        {
            fn(context);
        }

        return context;
    }
    
    static _onCreateEffect(ev)
    {
        ui.notifications.error("WH.Error.CreateZoneEffect", {localize: true});
    }

    static _onDeleteEffect(ev)
    {
        let index = this._getIndex(ev);  
        this.document.setFlag(game.system.id, "effects", this.document.flags[game.system.id].effects.filter((_, i) => i != index)).then(() => this.render(true));
    } 

    static _onOpenEffect(ev)
    {
        let index = this._getIndex(ev);
        let effectData = this.document.getFlag(game.system.id, "effects")[index];
        new ActiveEffect.implementation(effectData, {parent: {documentName : "Region"}}).sheet.render(true, {editable : false});
    }
        
    static addRegionControls()
    {
        foundry.applications.sheets.RegionConfig.DEFAULT_OPTIONS.window.controls = [
            {
                icon: 'fa-solid fa-game-board-simple',
                label: "Zone",
                action: "zoneConfig"
            }
        ];
        Hooks.on("renderRegionLegend", (app, html) => 
        {
            html.querySelectorAll(".region").forEach(region => 
            {
                $(`<button class="icon" data-tooltip="WH.ConfigureZoneTT"><i class="fa-solid fa-game-board-simple"></i></button>`).insertBefore(region.querySelector("button")).on("click", (ev) => 
                {
                    let region = canvas.scene.regions.get(ev.currentTarget.parentElement.dataset.regionId);
                    new this(region).render(true);
                });
            });
        });
        Hooks.on('setup', (app, html) => 
        {
            foundry.applications.sheets.RegionConfig.DEFAULT_OPTIONS.actions.zoneConfig = function (event, target) 
            {
                new this(this.document).render(true);
            };
        });
    }
}





