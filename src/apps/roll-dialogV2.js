import WarhammerScript from "../system/script";
import { BaseDialogTooltips } from "../system/tooltips";
import { localize } from "../util/utility";
const {mergeObject} = foundry.utils;
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class WarhammerRollDialogV2 extends HandlebarsApplicationMixin(ApplicationV2)
{
    selectedScripts = [];   // List of scripts that have been manually selected by the user
    unselectedScripts = []; // List of scripts that have been manually UNselected by the user
    #onKeyPress;            // Keep track of Enter key listener so it can be removed when submitted
    currentFocus;           // Keep track of current focused element to handle user submitting before the dialog has calculated the most recent input
    submitted = false;      // Flag that denotes the dialog has been submitted and should go through submission instead of rendering 
    static tooltipClass = BaseDialogTooltips;
    get tooltipConfig() 
    {
        return {};
    }

    static DEFAULT_OPTIONS = {
        classes: ["roll-dialog-v2", "warhammer"],
        tag : "form",
        form : {
            handler : this.submit,
            submitOnChange : false,
            closeOnSubmit : true,
        },
        window: {
            contentClasses: ["standard-form"],
            resizable : true,
        },
        actions : {
            clickModifier :this._onModifierClicked
        }
    };

    static PARTS = {
        modifiers : {
            template : "modules/warhammer-lib/templates/partials/dialog-modifiers.hbs",
        },
        footer : {
            template : "templates/generic/form-footer.hbs"
        }
    };
 
    get actor() 
    {
        return this.data.actor;
    }

    get targets() 
    {
        return this.data.targets;
    }

    get target() 
    {
        return this.targets[0]?.actor;
    }

    /**
     * Creates a roll dialog instancte
     * @param {object} data Internal data the dialog should have
     * @param {object} fields Predefined fields (properties shown in the template) for the dialog
     * @param {object} context Additional contextual flags for dialog, usually used by scripts
     * @param {object} options Additional options for the application
     * @param {*} resolve Resolve where submission data is provided
     */
    constructor(data, fields, context, options={}, resolve)
    {
        super(options);
        this.data = data;
        this.context = context;
        this.tooltips = new this.constructor.tooltipClass(this.tooltipConfig || {});

        this.initialFields = foundry.utils.mergeObject(this._defaultFields(), fields);
        this.fields = this._defaultFields();

        this.userEntry = {};

        // If an effect deems this dialog cannot be rolled, it can switch this property to true and the dialog will close
        this.abort = false;
        
        // The flags object is for scripts to use freely, but it's mostly intended for preventing duplicate effects
        // A specific object is needed as it must be cleared every render when scripts run again
        this.flags = {};
        
        Hooks.call(game.system.id + ":createRollDialog", this);
        data.scripts = data.scripts.concat(this._createScripts(this.context.scripts));
        this.data.scripts = this._consolidateScripts(data.scripts);

        if (resolve)
        {
            this.resolve = resolve;
        }
    }

    /**
     * Create data a dialog expects to receive in its constructor
     * @abstract
     * @param {object} data Any data relevant to the test, such as the attribute/skill/weapon being rolled
     * @param {Actor} actor The actor performing the test
     * @param {object} context Additional contextual flags for dialog, usually used by scripts
     * @param {object} options options associated with the application
     * @returns {object} Formatted dialog data
     */
    static async setupData(data={}, actor, context, options={})
    {
        throw new Error("Only subclasses of RollDialog can be setup");
    }

    /**
     * Creates the basic data that generally all dialogs use, such as formatting the speaker data and handling dialog scirpts
     * @param {Actor} actor Actor performing the test
     * @param {object} context Additional contextual flags for dialog, usually used by scripts
     * @param {object} options Foundry Application options
     * @returns {object} Basic dialog data shared by all types of dialogs
     */
    static _baseDialogData(actor, context, options={})
    {
        let dialogData = {data : {}, fields : {}, context, options};

        dialogData.data.actor = actor;
        dialogData.data.speaker = CONFIG.ChatMessage.documentClass.getSpeaker({actor});
        dialogData.data.speaker.alias = actor.prototypeToken.name;
        dialogData.data.targets = (context.skipTargets) ? [] : context.targets || Array.from(game.user.targets).filter(t => t.document.id != dialogData.data.speaker.token); // Remove self from targets
        delete context.targets;

        // Used by scripts to store data and then pass onto the test
        if (!context.flags)
        {
            context.flags = {};
        }
        
        if (actor && !actor?.token)
        {
            // getSpeaker retrieves tokens even if this sheet isn't a token's sheet
            delete dialogData.data.speaker.scene;
        }

        if (!context.skipTargets) 
        {
            // Collect Dialog effects 
            //   - Don't use our own targeter dialog effects, DO use targets' targeter dialog effects
            dialogData.data.scripts = foundry.utils.deepClone(
                (dialogData.data.targets
                    .map(t => t.actor)
                    .filter(actor => actor)
                    .reduce((prev, current) => prev.concat(current.getScripts("dialog", (s) => s.options?.targeter)), []) // Retrieve targets' targeter dialog effects
                    .concat(actor?.getScripts("dialog", (s) => !s.options?.targeter && !s.options?.defending) // Don't use our own targeter dialog effects
                    ))) || [];
        }
        else 
        {
            dialogData.data.scripts = actor?.getScripts("dialog", (s) => !s.options?.targeter); // Don't use our own targeter dialog effects
        }

        return dialogData;
    }

    static _constructTitle({data, fields, context})
    {
        return "Base Dialog Title";
    }

    async _render(...args)
    {
        await super._render(args);
        
        if (this.abort)
        {
            this.close();
        }

        if (this.submitted)
        {
            this.submit();
        }
    }

    async _onRender(options) 
    {
        await super._onRender(options);

        // Listen on all elements with 'name' property
        this.element.querySelectorAll("[name]").forEach(e => 
        {
            e.addEventListener("change", this._onFieldChange.bind(this));
            e.addEventListener("focus", this._onFieldFocus.bind(this));
        });

        this.element.querySelector("button[type='submit']").addEventListener("mousedown", ev => 
        {
            this.submitted = true;
        });

        // Don't add another listener if one already exists
        if (!this.#onKeyPress)
        {
            // Need to remember binded function to later remove
            this.#onKeyPress = this._onKeyPress.bind(this);
            document.addEventListener("keypress", this.#onKeyPress);
        }

        if (this.abort)
        {
            this.close();
        }

    }

    async _onFirstRender(context, options)
    {
        await super._onFirstRender(context, options);
        this._handleFields();
    }

    // The goal is to allow subclasses to add whatever fields they want in their PARTS
    // So, to ensure the fields are on the right and the modifiers are on the left, we have to 
    // rearrange them manually.
    // field parts are designated with a `fields` property being true
    // modifiers are designated with `modifiers`
    _handleFields(context, options)
    {
        const containers = {};
        // Main dialog element contains 2 children, fields and modifiers
        const mainDialog = document.createElement("div");
        mainDialog.classList.add("dialog-base");

        // These are to be added to main dialog element
        const fields = document.createElement("div");
        fields.classList.add("dialog-fields");
        let modifiers;

        for (const [part, config] of Object.entries(this.constructor.PARTS)) 
        {
            // Store modifiers part
            if (config.modifiers)
            {
                modifiers = this.element.querySelector(`[data-application-part="${part}"]`);
                continue;
            }

            // If not field, ignore
            if (!config.fields) {continue;}

            const element = this.element.querySelector(`[data-application-part="${part}"]`);

            if (!element) {continue;}
            
            element.remove();

            fields.append(element);
        }
        mainDialog.append(fields);
        mainDialog.append(modifiers);
        this.element.querySelector(".window-content").insertAdjacentElement("afterbegin", mainDialog);
    }

    /**
     * A lot of janky handling for focused elements and immediately hitting enter or "Enter" without unfocusing
     * Whene an input value is changed, it has to go through the getData() process to calculate values and scripts
     * So, this was submitted via the enter key and there's a currently focused element, send a change event
     *
     * the supplied event could also be null, as other functions can set the "submitted" flag to true, which
     * gets checked after the dialog renders, and if true, submits the dialog.
     * @param {Event|null} ev Triggering event
     */
    static submit(ev) 
    {
        ev?.preventDefault();
        ev?.stopPropagation();

        if (this.currentFocus && ev?.type == "keypress")
        {
            let event = new Event('change');
            this.currentFocus.dispatchEvent(event);
            this.currentFocus = null;
            return;
        }

        for(let script of this.data.scripts)
        {
            if (script.isActive)
            {
                script.submission(this);
            }
        }

        let submitData = this._getSubmissionData();

        if (this.resolve)
        {
            this.resolve(submitData);
        }
        this.close();
    }

    /**
     * Transforms dialog data and fields into a options into data that will be given to some test object for evaluation
     * @returns {object} Formatted submission data
     */
    _getSubmissionData()
    {
        let submitData = mergeObject(this.data, this.fields);
        submitData.context = this.context;

        if (!this.context.skipTargets)
        {
            submitData.targets = Array.from(submitData.targets).map(t => t.actor.speakerData(t.document));
        }
        submitData.context.breakdown = this.createBreakdown();
        if (canvas.scene)
        {
            game.canvas.tokens.setTargets([]);
        }
        return submitData;
    }


    /**
     * This is intended to be called without rendering the dialog, where the initial calculations (such as scripts)
     * are run and immediately provided back.
     * @returns {object} Formatted submission data
     */
    async bypass()
    {
        await this._prepareContext({});
        let submitData = this._getSubmissionData();

        for(let script of this.data.scripts)
        {
            if (script.isActive)
            {
                script.submission(this);
            }
        }
        return submitData;
    }

    /**
     * When closing the dialog, remove the key listener for "enter"
     */
    close() 
    {
        super.close();
        if (this.options.resolveClose)
        {
            this.resolve();
        }
        document.removeEventListener("keypress", this.#onKeyPress);
    }

    /**
     * Main computation process:
     * 1. Reset tooltips, flags, and fields to their initial values
     * 2. Determine what scripts need to be hidden
     * 3. Determine what should be active
     * 4. Run active scripts
     * 5. Run any built-in field computations
     * 6. Apply any user-entered values to the fields, as they should override calculations
     * @param {object} options Foundry ApplicationV2 options
     * @returns {object} Data provided to the template
     */
    async _prepareContext(options) 
    {
        await super._prepareContext(options);
        // Reset values so they don't accumulate 
        this.tooltips.clear();
        this.flags = {};
        // For some reason cloning the scripts doesn't prevent isActive and isHidden from persisisting
        // So for now, just reset them manually
        this.data.scripts.forEach(script => 
        {
            script.isHidden = false;
            script.isActive = false;
        });

        this.fields = this._defaultFields();

        this.tooltips.start(this);
        mergeObject(this.fields, this.initialFields);
        this.tooltips.finish(this, this.context.initialTooltip || localize("WH.Dialog.Initial"));

        await this.computeInitialFields();
        this.tooltips.start(this);
        for(let key in this.userEntry)
        {
            if (["string", "boolean"].includes(typeof this.userEntry[key]))
            {
                foundry.utils.setProperty(this.fields, key, this.userEntry[key]);
            }
            else if (Number.isNumeric(this.userEntry[key]))
            {
                foundry.utils.setProperty(this.fields, key, this.userEntry[key]);
            }
        }
        this.tooltips.finish(this, localize("WH.Dialog.UserEntry"));

        this._hideScripts();
        this._activateScripts();

        await this.computeScripts();
        await this.computeFields();


        return {
            data : this.data,
            fields : this.fields,
            tooltips : this.tooltips.getTooltips(),
        };
    }

    async _preparePartContext(partId, context) 
    {
        let partContext = await super._preparePartContext(partId, context);

        if (partId == "footer")
        {
            partContext.buttons = [{
                type: "submit",
                label: "Roll"
            }];
        }
        return partContext;
    }


    /**
     * Additional scripts can be provided to the dialog via options.
     * This function takes script data and creates script instances
     * @param {Array<object>} scriptData data for script instances
     * @returns {Array<WarhammerScript>} Created Scripts
     */
    _createScripts(scriptData = [])
    {
        return scriptData.map(i => new WarhammerScript(mergeObject(i, {
            options : {
                dialog : {
                    hideScript : i.hide, 
                    activateScript : i.activate, 
                    submissionScript : i.submit}}}),
        WarhammerScript.createContext(this.item instanceof Item ? this.item : this.actor)));
    }

    /**
     * This is mostly for talents, where an actor likely has multiple
     * of the same talent. We don't want to show the same dialog effect
     * multiple times, so instead count the number of scripts that are the 
     * same. When executed, execute it the number of times there are scripts
     * @param {Array<WarhammerScript>} scripts script instances
     * @returns {Array<WarhammerScript>} consolidated scripts with duplicates removed
     */
    _consolidateScripts(scripts)
    {
        let consolidated = [];

        for(let script of scripts)
        {
            let existing = consolidated.find(s => isSameScript(script, s));
            if (!existing)
            {
                script.scriptCount = 1;
                consolidated.push(script);
            }
            else 
            {
                existing.scriptCount++;
            }
        }


        /**
         * To consolidate scripts, they must match label, script, as well as hide, activate, and submission subscripts
         * @param {WarhammerScript} a script compared with b
         * @param {WarhammerScript} b script compared with a
         * @returns {boolean} whether script is considered duplicate
         */
        function isSameScript(a, b)
        {
            return (a.Label == b.Label) &&
             (a.script == b.script) && 
             (a.options?.hideScript == b.options?.hideScript) && 
             (a.options?.activateScript == b.options?.activateScript) &&
             (a.options?.submissionScript == b.options?.submissionScript);
        }
        return consolidated;
    }

    /**
     * Run the hide subscript and mark hidden if true
     */
    _hideScripts()
    {
        this.data.scripts.forEach((script, index) => 
        {
            // If user selected script, make sure it is not hidden, otherwise, run its script to determine
            if (this.selectedScripts.includes(index))
            {
                script.isHidden = false;
            }
            else
            {
                script.isHidden = script.hidden(this);
            }
        });
    }

    /**
     * Run the activate subscript and mark active if true
     */
    _activateScripts()
    {
        this.data.scripts.forEach((script, index) => 
        {
            // If user selected script, activate it, otherwise, run its script to determine
            if (this.selectedScripts.includes(index))
            {
                script.isActive = true;
            }
            else if (this.unselectedScripts.includes(index))
            {
                script.isActive = false;
            }
            else if (!script.isHidden) // Don't run hidden script's activation test
            {
                script.isActive = script.activated(this);
            }
        });
    }

    /**
     * Run all active scripts
     */
    async computeScripts() 
    {
        for(let script of this.data.scripts)
        {
            if (script.isActive)
            {
                this.tooltips.start(this);
                for(let i = 0; i < script.scriptCount; i++)
                {
                    await script.execute(this);
                }
                this.tooltips.finish(this, script.Label);
            }
        }
    }

    /**
     * Run any hard coded computation for fields
     * @abstract
     */
    async computeFields() 
    {

    }

    
    /**
     * Run any hard coded computation for fields (before scripts)
     */
    async computeInitialFields() 
    {
    }

    /**
     * Whenever a "field" is changed (that being any element with a "name" property) record that field as user defined,
     * which overrides any automatic scripts or computations done to it
     * @param {Event} ev Triggering event
     */
    _onFieldChange(ev) 
    {
        let value = ev.currentTarget.value;
        if (Number.isNumeric(value))
        {
            value = Number(value);
        }

        if (ev.currentTarget.type == "checkbox")
        {
            value = ev.currentTarget.checked;
        }

        this.userEntry[ev.currentTarget.name] = value;

        this.render(true);
    }

    /**
     * When focusing a field, keep track of it. Used to trigger a change event if the dialog is being submitted but hasn't rerun computations.
     * @param {Event} ev Triggering event
     */
    _onFieldFocus(ev) 
    {
        if (ev.currentTarget.tagName == "INPUT")
        {
            ev.currentTarget.select();
        }
        this.currentFocus = ev.currentTarget;
    }

    /**
     * When a modifier (script) is selected, either activate or deactivate it by adding its index to 
     * selected or unselected scripts respectively. 
     * @param {Event} ev Triggering event
     */
    static _onModifierClicked(ev, target)
    {
        let index = Number(target.dataset.index);
        if (!target.classList.contains("active"))
        {
            // If modifier was unselected by the user (originally activated via its script)
            // it can be assumed that the script will still be activated by its script
            if (this.unselectedScripts.includes(index))
            {
                this.unselectedScripts = this.unselectedScripts.filter(i => i != index);
            }
            else 
            {
                this.selectedScripts.push(index);
            }
        }
        else 
        {
            // If this modifier was NOT selected by the user, it was activated via its script
            // must be added to unselectedScripts instead
            if (!this.selectedScripts.includes(index))
            {
                this.unselectedScripts.push(index);
            }
            else // If unselecting manually selected modifier
            {
                this.selectedScripts = this.selectedScripts.filter(i => i != index);
            }
        }
        this.render(true);
    }


    static awaitSubmit({data={}, fields={}, context={}, options={}}={})
    {
        return new Promise(resolve => 
        {
            new this(data, fields, context, options, resolve).render(true);
        });
    }

    _onKeyPress(ev)
    {
        if (ev.key == "Enter")
        {
            this.submitted = true;
            this.submit(ev); 
        }
    }

    _onSubmit(ev)
    {
        ev.preventDefault();
        ev.stopPropagation();
    }
    
    updateTargets()
    {
        this.data.targets = Array.from(game.user.targets);
        this.render(true);
    }

    /**
     * Define any default field values
     * @returns {object} Default fields used in the dialog
     */
    _defaultFields() 
    {
        return {
            rollMode : game.settings.get("core", "rollMode") || "publicroll"
        };
    }

    createBreakdown()
    {
        let breakdown = {};
        return breakdown;
    }

    
    static updateActiveDialogTargets() 
    {
        Object.values(ui.windows).forEach(i => 
        {
            if (i instanceof this)
            {
                i.updateTargets();
            }
        });
    }

}