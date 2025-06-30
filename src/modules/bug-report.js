import { localize, log, systemConfig } from "../util/utility";
const {isNewerVersion} = foundry.utils;

export default class WarhammerBugReport extends Application 
{

    
    static issues = []; // Keep issues in static to avoid API limit
    static apiLimitReached = false;

    constructor(app) 
    {
        super(app);

        this.endpoint = systemConfig().bugReporterConfig.endpoint;
        this.github = systemConfig().bugReporterConfig.githubURL;
        this.troubleshootingURL = systemConfig().bugReporterConfig.troubleshootingURL;

        this.loadingIssues = this.loadIssues();
        this.latest = this.checkVersions();
    }

    static get defaultOptions() 
    {
        const options = super.defaultOptions;
        options.id = "bug-report";
        options.template = "modules/warhammer-lib/templates/modules/bug-report.hbs";
        options.classes.push(game.system.id, "bug-report");
        options.resizable = true;
        options.width = 600;
        options.minimizable = true;
        options.title = localize("WH.BugReporter.Title");
        options.tabs = [{ navSelector: ".tabs", contentSelector: ".content", initial: "submit" }];
        return options;
    }


    async _render(...args)
    {
        await super._render(...args);
        this.latest = await this.latest;
        this.element.find(".module-check").replaceWith(this.formatVersionWarnings());
    }

    async getData() 
    {
        let data = await super.getData();
        await this.loadingIssues;
        data.domains = systemConfig().premiumModules;
        data.name = game.settings.get(game.system.id, "bugReportName");
        data.record = await this.buildRecord();
        data.troubleshootingURL = this.troubleshootingURL;
        if (this.constructor.apiLimitReached)
        {
            ui.notifications.error(localize("WH.BugReporter.APIReached"), {permanent : true});
        }
        return data;
    }

    formatVersionWarnings() 
    {

        if (!this.latest || this.latest instanceof Promise)
        {
            return "<div></div>";
        }


        let allUpdated = true;
        let outdatedList = "";

        for (let key in this.latest) 
        {
            if (!this.latest[key]) 
            {
                allUpdated = false;
                outdatedList += `<li>${systemConfig().premiumModules[key]}</li>`;
            }
        }

        let element = `<div class='notification ${allUpdated ? "stable" : "warning"}'>`;

        if (allUpdated) 
        {
            element += localize("WH.BugReporter.Updated");
        }
        else 
        {
            element += localize("WH.BugReporter.NotUpdated");
            element += "<ul>";
            element += outdatedList;
            element += "</ul>";
        }

        element += "</div>";

        return element;
    }

    submit(data) 
    {
        fetch(this.endpoint, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: data.title,
                body: data.description,
                assignees: ["moo-man"],
                labels: data.labels
            })
        })
            .then(res => 
            {
                if (res.status == 201) 
                {
                    ui.notifications.notify(localize("WH.BugReporter.PostSuccess"));
                    res.json().then(json => 
                    {
                        
                        console.log(systemConfig().bugReporterConfig.successMessage.replace("@URL", json.html_url));
                        this.recordIssue(json.number);
                    });
                }
                else 
                {
                    ui.notifications.error(localize("WH.Error.PostError"));
                    console.error(res);
                }

            })
            .catch(err => 
            {
                ui.notifications.error(localize("WH.Error.GeneralBugReport"));
                console.error(err);
            });
    }

    recordIssue(number)
    {
        let postedIssues = foundry.utils.deepClone(game.settings.get(game.system.id, "postedIssues"));
        postedIssues.push(number);
        game.settings.set(game.system.id, "postedIssues", postedIssues).then(() => 
        {
            this.refreshIssues();
        });
    }


    async loadIssues() 
    {
        log("Loading GitHub Issues...");
        if (this.constructor.issues.length == 0)
        {
            for(let i = 1; i <= 10; i++)
            {
                foundry.applications.ui.SceneNavigation.displayProgressBar({label: localize("WH.LoadingIssues"), pct: Math.round((i / 10) * 100) });

                this.constructor.issues = this.constructor.issues.concat((await fetch(this.github + `issues?per_page=100&page=${i}&state=all`)
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
            log("Skipping requests, issues already loaded");
        }
        log("Issues: ", undefined, this.constructor.issues);
        return this.constructor.issues;
    }

    // Issues are big objects, no need to keep everything, so just take what's needed
    trimIssue(issue)
    {
        return {
            number: issue.number,
            title : issue.title,
            html_url : issue.html_url,
            labels : issue.labels,
            state : issue.state
        };
    }

    async refreshIssues()
    {
        // Request a new page of issues, only keep issues we don't have
        let newIssues = (await fetch(this.github + `issues?per_page=100&state=all`).then(r => r.json()).catch(error => console.error(error))).map(this.trimIssue);
        this.constructor.issues = this.constructor.issues.concat(newIssues.filter(newIssue => !this.constructor.issues.find(i => i.number == newIssue.number)));
    }

    async buildRecord()
    {
        let numbersSubmitted = game.settings.get(game.system.id, "postedIssues");

        let issuesSubmitted = this.constructor.issues.filter(i => numbersSubmitted.includes(i.number));

        let record = {
            open : issuesSubmitted.filter(i => i.state == "open"),
            closed : issuesSubmitted.filter(i => i.state == "closed"),
            alert : false
        };

        for(let issue of record.open)
        {
            if (issue.labels.find(l => l.name == "non-repro" || l.name == "needs-info"))
            {
                issue.alert = true;
                record.alert = true;
            }
        }

        return record;
    }

    async checkVersions() 
    {
        let latest = {};
        log("Checking Version Numbers...");
        for (let key in systemConfig().premiumModules) 
        {
            if (key == game.system.id) 
            {
                // Have to use release tag instead of manifest version because CORS doesn't allow downloading release asset for some reason
                let release = await fetch(this.github + "releases/latest").then(r => r.json()).catch(e => 
                {
                    console.error("Could not fetch latest versions: " + e);
                    return latest;
                });
                latest[key] = !isNewerVersion(release.tag_name, game.system.version);
            }
            else if (game.modules.get(key)) 
            {
                let manifest = await fetch(`https://foundry-c7-manifests.s3.us-east-2.amazonaws.com/${key}/module.json`).then(r => r.json()).catch(e => 
                {
                    console.error("Could not fetch latest versions: " + e);
                    return latest;
                });
                latest[key] = !isNewerVersion(manifest.version, game.modules.get(key).version);
            }
            log(key + ": " + latest[key]);
        }
        log("Version Status:", undefined, latest);
        return latest;
    }

    matchIssues(text) 
    {

        let issues = this.constructor.issues.filter(i => i.state == "open");

        let words = text.toLowerCase().split(" ");
        let percentages = new Array(issues.length).fill(0);


        issues.forEach((issue, issueIndex) => 
        {
            let issueWords = (issue.title + " " + issue.body).toLowerCase().trim().split(" ");
            words.forEach((word) => 
            {
                {
                    if (issueWords.includes(word))
                    {percentages[issueIndex]++;}
                }
            });
        });
        let matchingIssues = [];
        percentages = percentages.map(i => i/issues.length);
        percentages.forEach((p, i) => 
        {
            if (p > 0)
            {matchingIssues.push(issues[i]);}
        });
        return matchingIssues;
    }

    showMatchingpostedIssues(element, issues)
    {
        if(!issues || issues?.length <= 0)
        {element[0].style.display="none";}
        else 
        {
            element[0].style.display="flex";
            let list = element.find(".issue-list");
            list.children().remove();
            list.append(issues.map(i => `<div class="issue"><a href="${i.html_url}">${i.title}</div>`));
        }
    }

    checkWarnings(text)
    {
        let publicityWarning = this.element.find(".publicity")[0];
        let discordNameWarning = this.element.find(".discord")[0];
        publicityWarning.style.display = text.includes("@") ? "block" : "none";
        discordNameWarning.style.display = text.includes("#") ? "block" : "none";
    }

    activateListeners(html) 
    {


        let modulesWarning = html.find(".active-modules")[0];
        let title = html.find(".bug-title")[0];
        let description = html.find(".bug-description")[0];
        let matching = html.find(".matching");
        let issuer = html.find(".issuer")[0];

        this.checkWarnings(issuer.value);

        html.find(".issuer").keyup(ev => 
        {
            this.checkWarnings(ev.target.value);
        });

        html.find(".issue-label").change(ev => 
        {
            if (ev.currentTarget.value == "bug") 
            {
                if (game.modules.contents.filter(i => i.active).map(i => i.id).filter(i => !systemConfig().premiumModules[i]).length > 0)
                {modulesWarning.style.display = "block";}
                else
                {modulesWarning.style.display = "none";}
            }
            else
            {modulesWarning.style.display = "none";}
        });

        html.find(".bug-title, .bug-description").keyup(async ev => 
        {
            let text = title.value + " " + description.value;
            text = text.trim();
            if (text.length > 2) 
            {
                this.showMatchingpostedIssues(matching, this.matchIssues(text));
            }
        });

        html.find(".bug-submit").click(ev => 
        {
            let data = {};
            let form = $(ev.currentTarget).parents(".bug-report")[0];
            data.domain = $(form).find(".domain")[0].value;
            data.title = $(form).find(".bug-title")[0].value;
            data.description = $(form).find(".bug-description")[0].value;
            data.issuer = $(form).find(".issuer")[0].value;
            let label = $(form).find(".issue-label")[0].value;


            if (!data.domain || !data.title || !data.description)
            {return ui.notifications.error(localize("WH.BugReporter.BugReportFormError"));}
            if (!data.issuer)
            {return ui.notifications.error(localize("WH.BugReporter.BugReportNameError"));}


            data.title = `[${systemConfig().premiumModules[data.domain]}] ${data.title}`;
            data.description = data.description + `<br/>**From**: ${data.issuer}`;

            data.labels = [data.domain.split("-")[1]];

            if (label)
            {data.labels.push(label);}

            game.settings.set(game.system.id, "bugReportName", data.issuer);

            let premiumModules = Array.from(game.modules).filter(m => systemConfig().premiumModules[m.id]);

            let versions = `<br/>foundry: ${game.version}<br/>${game.system.id}: ${game.system.version}`;

            for (let mod of premiumModules) 
            {
                let modData = game.modules.get(mod.id);
                if (modData.active)
                {versions = versions.concat(`<br/>${mod.id}: ${modData.version}`);}
            }

            data.description = data.description.concat(versions);
            data.description += `<br/>Active Modules: ${game.modules.contents.filter(i => i.active).map(i => i.id).filter(i => !systemConfig().premiumModules[i]).join(", ")}`;

            this.submit(data);
            this.close();
        });
    }
    static addSidebarButton(app, html)
    {
        if (app.options.id == "settings")
        {
            let button = $(`<button class='bug-report'>${game.i18n.localize("WH.BugReporter.Title")}</button>`);
                
            button.click(ev => 
            {
                new WarhammerBugReport().render(true);
            });
                
            button.insertAfter(html.find("#game-details"));
                
        }
    }
}
