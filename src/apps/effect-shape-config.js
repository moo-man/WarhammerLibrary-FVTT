import {WHFormApplication} from "./form-application";

export default class WarhammerEffectShapeConfig extends WHFormApplication
{
    static DEFAULT_OPTIONS = {
        tag : "form",
        classes : ["shape-config"],
        actions : {

        },
        form: {
            submitOnChange: true,
            closeOnSubmit: false
        }
    };

    static PARTS = {
        scripts : {scrollable : [""], template : "modules/warhammer-lib/templates/effect/effect-shape-config.hbs", classes: ["standard-form"]}
    };

    get scriptLocked()
    {
        return this._hasScriptReferences() && !this.unlocked;
    }

    async _prepareContext()
    {
        let data = await super._prepareContext();
        data.fields = this.document.system.schema.fields.transferData.fields.area.fields.shape.fields;
        data.source = this.document._source.system.transferData.area.shape;
        data.radius = this.document.system.transferData.area.radius;
        data.aura = this.document.system.transferData.type == "aura";
        data.curvatures = {
            "round": game.i18n.localize("WH.Curvature.Round"),
            "flat" : game.i18n.localize("WH.Curvature.Flat"),
            "semicircle" : game.i18n.localize("WH.Curvature.Semicircle")
        },
        data.types = {
            "circle" : game.i18n.localize("WH.ShapeType.Circle"),
            "cone" : game.i18n.localize("WH.ShapeType.Cone"),
            "rectangle" : game.i18n.localize("WH.ShapeType.Rectangle"),
            "ellipse" : game.i18n.localize("WH.ShapeType.Ellipse"),
            "line" : game.i18n.localize("WH.ShapeType.Line")
        };
        return data;
    }
}