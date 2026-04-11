
import {error, log, systemConfig} from "../util/utility";
const { ApplicationV2 } = foundry.applications.api;
const { HandlebarsApplicationMixin } = foundry.applications.api;


export default class WarhammerBugReporter extends HandlebarsApplicationMixin(ApplicationV2)
{
    static issues = []; // Keep issues in static to avoid API limit
    static apiLimitReached = false;

    static DEFAULT_OPTIONS = {
        tag: "form",
        classes: ["bug-report", "warhammer"],
        window: {
            resizable: true,
            title: "WH.BugReporter.Title",
            contentClasses: ["standard-form"]
        },
        position: {
            height: 700,
            width:  550
        },
        actions: {

        },
        defaultTab: "report",
        form: {
            handler: this.submit,
            closeOnSubmit : true,
            submitOnChange: false
        }
    };

    constructor(app) 
    {
        super(app);

        this.endpoint = "https://v3amewbngjjguio5j4nng5hcyq0fjona.lambda-url.us-east-2.on.aws/";
        this.github = systemConfig().bugReporterConfig.repoEndpoint;
        this._notifications = {};
        this.settings = game.settings.get("warhammer-lib", "bugReporter");
        this.loadingIssues = this.loadIssues();
    }

    static #schema = new foundry.data.fields.SchemaField({
        issues : new foundry.data.fields.ArrayField(new foundry.data.fields.NumberField()),
        contact : new foundry.data.fields.StringField(),
        PAT : new foundry.data.fields.StringField()
    });

    static get schema() 
    {
        return this.#schema;
    }

    keyToLabel(key) 
    {
        if (key.includes("-")) 
        {
            return key.slice(key.indexOf("-") + 1);
        }
        else 
        {
            return "";
        }
    }

    static PARTS = {
        tabs: { template: "modules/warhammer-lib/templates/partials/sheet-tabs.hbs" },
        report: { template: "modules/warhammer-lib/templates/apps/reporter/report.hbs"},
        issues: { template: "modules/warhammer-lib/templates/apps/reporter/issues.hbs" }
    };

    static TABS = {
        report: {
            id: "report",
            group: "primary",
            label: "WH.BugReporter.Report",
        },
        issues: {
            id: "issues",
            group: "primary",
            label: "WH.BugReporter.SubmittedIssues",
        }
    };

    static addBugReporterButton(html)
    {
        let sidebarInfo = html.querySelector(".sidebar-info");
        if (sidebarInfo && systemConfig().bugReporterConfig?.repoEndpoint)
        {
            let button = document.createElement("button");
            button.textContent = "Submit Issue";
            button.addEventListener("click", ev => 
            {
                new this().render({force: true});
            });
            sidebarInfo.append(button);
        }
    }

    async _onRender(options) 
    {
        await super._onRender(options);
        this.getLatestVersions().then(latest => 
        {
            this.restrictOptions(latest);
        });

        if (this._addRecordAlert)
        {
            this.element.querySelector("a[data-tab='issues']").innerHTML += `<i style="color: gold" class="fa-solid fa-circle-exclamation"></i>`;
        }
        this.addListeners();
    }

    // Disable any module choices if that module is out of date
    restrictOptions(isLatest)
    {
        let select = this.element.querySelector("[name='module']");
        for(let module in isLatest)
        {
            if(!isLatest[module])
            {
                let option = select.querySelector(`option[value='${module}']`);
                if (option)
                {
                    option.disabled = true;
                }
            }
        }

        // Add notification if any module is out of date
        if (Object.values(isLatest).some(i => !i))
        {
            this.addNotification("Some options are disabled because they are out of date!", select.parentElement, {classes : "warning hint", position: "afterend", key: "modules"});
        }
    }

    addNotification(text, element, {classes="", position="beforebegin", key}={})
    {

        let p = document.createElement("p");
        p.classList.add("notification", ...classes.split(" "));
        p.innerHTML = text;
        if (key && this._notifications[key])
        {
            this._notifications[key].replaceWith(p);
        }
        else 
        {
            element.insertAdjacentElement(position, p);
        }

        if (key)
        {
            this._notifications[key] = p;
        }

    }

    async _prepareContext(options) 
    {
        let context = await super._prepareContext(options);
        await this.loadingIssues;
        context.tabs = this._prepareTabs();
        context.modules = systemConfig().premiumModules;
        context.settings = this.settings;
        context.record = await this.buildRecord();
        if (context.record.alert)
        {
            this._addRecordAlert = true;
        }
        if (this.constructor.apiLimitReached) 
        {
            ui.notifications.error("WH.BugReporter.APILimitReached", { permanent: true, localize: true });
        }
        return context;
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
    
    _prepareTabs()
    {
        let tabs = foundry.utils.deepClone(this.constructor.TABS);

        for (let t in tabs) 
        {
            tabs[t].active = this.tabGroups[tabs[t].group] === tabs[t].id,
            tabs[t].cssClass = tabs[t].active ? "active" : "";
        }

        if (!Object.values(tabs).some(t => t.active)) 
        {
            tabs.report.active = true;
            tabs.report.cssClass = "active";
        }

        return tabs;
    }

    sendIssue(data) 
    {
        fetch(this.endpoint, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: data.title,
                body: data.description,
                contact: data.contact,
                assignees: ["moo-man"],
                labels: data.labels,
                system: game.system.id
            })
        })
            .then(res => 
            {
                if (res.status == 201 || res.status == 200) 
                {
                    ui.notifications.info("WH.BugReporter.ReportSuccess", {localize : true});
                    res.json().then(json => 
                    {
                        ui.notifications.info(systemConfig().bugReporterConfig.successMessage.replace("@URL", json.html_url));
                        this.recordIssue(json.number);
                    });
                }
                else 
                {
                    ui.notifications.error(game.i18n.localize("WH.BugReporter.Error.Report"));
                    res.json().then(json => 
                    {
                        console.error(json);
                    });
                }

            })
            .catch(err => 
            {
                ui.notifications.error(game.i18n.localize("WH.BugReporter.Error.Generic"));
                console.error(err);
            });
    }

    recordIssue(number) 
    {
        let bugReporterData = foundry.utils.deepClone(game.settings.get("warhammer-lib", "bugReporter"));
        bugReporterData.issues.push(number);
        game.settings.set("warhammer-lib", "bugReporter", bugReporterData).then(() => 
        {
            this.refreshIssues();
        });
    }


    async loadIssues() 
    {
        warhammer.utility.log("Loading GitHub Issues...");
        try 
        {

            if (this.constructor.issues.length == 0) 
            {
                for (let i = 1; i <= 10; i++) 
                {
                    foundry.applications.ui.SceneNavigation.displayProgressBar({ label: game.i18n.localize("WH.BugReporter.LoadingIssues"), pct: Math.round((i / 10) * 100) });

                    this.constructor.issues = this.constructor.issues.concat((await fetch(this.github + `/issues?per_page=100&page=${i}&state=all`)
                        .then(r => r.json())
                        .catch(error => 
                        {
                            if (error.status == 403) 
                            {
                                this.constructor.apiLimitReached = true;
                            }
                            console.error(error);
                            this.constructor.issues = [];
                            return [];

                        })).map(this.trimIssue));
                }
            }
            else 
            {
                warhammer.utility.log("Skipping requests, issues already loaded");
            }
            warhammer.utility.log("Issues: ", undefined, this.constructor.issues);
        }
        catch(e)
        {
            console.error(e);
        }

        return this.constructor.issues;
    }

    // Issues are big objects, no need to keep everything, so just take what's needed
    trimIssue(issue) 
    {
        return {
            number: issue.number,
            title: issue.title,
            html_url: issue.html_url,
            labels: issue.labels,
            state: issue.state,
            created_at : issue.created_at
        };
    }

    async refreshIssues() 
    {
        // Request a new page of issues, only keep issues we don't have
        let newIssues = (await fetch(this.github + `/issues?per_page=100&state=all`).then(r => r.json()).catch(error => console.error(error))).map(this.trimIssue);
        this.constructor.issues = this.constructor.issues.concat(newIssues.filter(newIssue => !this.constructor.issues.find(i => i.number == newIssue.number)));
    }

    async buildRecord() 
    {
        let numbersSubmitted = this.settings.issues;

        let issuesSubmitted = this.constructor.issues.filter(i => numbersSubmitted.includes(i.number));

        let record = {
            open: issuesSubmitted.filter(i => i.state == "open"),
            closed: issuesSubmitted.filter(i => i.state == "closed"),
            alert: false
        };

        for (let issue of record.open) 
        {
            if (issue.labels.find(l => l.name == "non-repro" || l.name == "needs-info")) 
            {
                issue.alert = true;
                record.alert = true;
            }
        }

        return record;
    }

    async getLatestVersions() 
    {
        let latest = {};
        warhammer.utility.log("Checking Version Numbers...");
        for (let key in systemConfig().premiumModules) 
        {
            if (key == game.system.id) 
            {
                // Have to use release tag instead of manifest version because CORS doesn't allow downloading release asset for some reason
                let release = await fetch(this.github + "/releases/latest").then(r => r.json()).catch(e => 
                {
                    console.error("Could not fetch latest versions: " + e);
                    return latest;
                });
                latest[key] = !foundry.utils.isNewerVersion(release.tag_name, game.system.version);
            }
            else if (game.modules.get(key)) 
            {
                let manifest = await fetch(`https://foundry-c7-manifests.s3.us-east-2.amazonaws.com/${key}/module.json`).then(r => r.json()).catch(e => 
                {
                    console.error("Could not fetch latest versions: " + e);
                    return latest;
                });
                latest[key] = !foundry.utils.isNewerVersion(manifest.version, game.modules.get(key).version);
            }
            warhammer.utility.log(key + ": " + latest[key]);
        }
        warhammer.utility.log("Version Status:", undefined, latest);
        return latest;
    }

    matchIssues(text) 
    {
        let issues = this.constructor.issues.filter(i => i.state != "closed");

        let words = text.toLowerCase().split(" ");
        let percentages = new Array(issues.length).fill(0);


        issues.forEach((issue, issueIndex) => 
        {
            let issueWords = (issue.title + " " + issue.body).toLowerCase().trim().split(" ");
            words.forEach((word) => 
            {
                {
                    if (issueWords.includes(word)) { percentages[issueIndex]++; };
                }
            });
        });
        let matchingIssues = [];
        percentages = percentages.map(i => i / issues.length);
        percentages.forEach((p, i) => 
        {
            if (p > 0) { matchingIssues.push(issues[i]); };
        });
        return matchingIssues;
    }

    findMatchingIssues() 
    {
        let text = this.element.querySelector("[name='title']").value + " " + this.element.querySelector("[name='description']").value;

        let matchedIssues = this.matchIssues(text);

        let issueList = this.element.querySelector(".issues");


        if (!matchedIssues || matchedIssues?.length <= 0) 
        {
            issueList.style.display = "none";
        }
        else 
        {
            issueList.style.display = "flex";
            let list = issueList.querySelector(".list");
            let matchedElements = matchedIssues.map(i => 
            {
                let match = document.createElement("div");
                match.classList.add("match");
                match.innerHTML = `<a href="${i.html_url}">${i.title}</a> <span>Created ${foundry.utils.timeSince(i.created_at)}</span>`;
                return match;
            });
            list.replaceChildren(...matchedElements);
        }
    }

    static async submit(ev, form, formData)
    {
        let report = {};
        report.module = formData.object["module"];
        report.title = formData.object["title"];
        report.description = formData.object["description"];
        report.contact = formData.object["contact"];
        let label = formData.object["type"];


        if (!report.module || !report.title || !report.description || !report.contact) 
        { 
            throw game.i18n.localize("WH.BugReporter.Error.Incomplete");
        };

        report.title = `[${systemConfig().premiumModules[report.module]}] ${report.title}`;
        report.description = report.description + `<br/>**From**: ${report.contact}`;

        report.labels = [this.keyToLabel(report.module)].filter(i => i);

        if (label) 
        { 
            report.labels.push(label); 
            if (report.module != game.system.id)
            {
                report.labels.push("module");
            }
        }

        game.settings.set("warhammer-lib", "bugReporter", {
            contact : report.contact,
            PAT : report.PAT, 
        });

        let premiumModules = Array.from(game.modules).filter(m => systemConfig().premiumModules[m.id]);

        let versions = `<br/>foundry: ${game.version}<br/>${game.system.id}: ${game.system.version}`;

        for (let mod of premiumModules) 
        {
            let modData = game.modules.get(mod.id);
            if (modData.active) { versions = versions.concat(`<br/>${mod.id}: ${modData.version}`); };
        }

        report.description = report.description.concat(versions);
        report.description += `<br/>Active Modules: ${game.modules.contents.filter(i => i.active).map(i => i.id).filter(i => !systemConfig().premiumModules[i]).join(", ")}`;

        this.sendIssue(report);
    }

    addListeners() 
    {
        this.element.querySelectorAll("[name='title'],[name='description']").forEach(i => i.addEventListener("keyup", async ev => 
        {

            this.findMatchingIssues();

            if (ev.target.value.toLowerCase().includes("help") || ev.target.value.toLowerCase().includes("how do"))
            {
                this.addNotification(game.i18n.format("WH.BugReporter.Warning.NeedHelp", {url : systemConfig().bugReporterConfig.troubleshooting}), ev.target.parentElement, {classes : "warning hint", position: "afterend", key : "help"});
            }
        }));

        this.element.querySelector("[name='contact']").addEventListener("keyup", ev => 
        {
            if (ev.target.value.includes("@"))
            {
                this.addNotification(game.i18n.localize("WH.BugReporter.Warning.Email"), ev.target.parentElement, {classes : "warning hint", position: "afterend", key : "contact"});
            }
        });

        this.element.querySelector("[name='PAT']").addEventListener("keyup", ev => 
        {
            if (ev.target.value)
            {
                this.addNotification(game.i18n.localize("WH.BugReporter.Warning.PAT"), ev.target.parentElement, {classes : "warning hint", position: "afterend", key: "PAT"});
            }
        });
    }
}
