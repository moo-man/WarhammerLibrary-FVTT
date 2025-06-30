import { localize, log, format } from "../util/utility";
import WarhammerModuleUpdater from "./module-updater";


export default class WarhammerModuleInitializer extends Dialog 
{

    constructor(module, title, html) 
    {
        super({
            title: title,
            content: html,
            module: game.modules.get(module),
            buttons: {
                initialize: {
                    label: localize("WH.Initialize"),
                    callback: async () => 
                    {
                        game.settings.set(module, "initialized", true);
                        await this.initialize();
                        ui.notifications.notify(game.modules.get(module).title + ": " + localize("WH.Initialization.Complete"));
                    }
                },
                update: {
                    label: localize("Update"),
                    condition : game.settings.get(module, "initialized"),
                    callback: async () => 
                    {
                        let updater = await WarhammerModuleUpdater.create(game.modules.get(module), this);
                        updater.render(true);
                    }
                },
                delete : {
                    label: localize("Delete"),
                    condition : game.settings.get(module, "initialized"),
                    callback: async () => 
                    {
                        this.deleteModuleContent(module);
                    }
                },
                no: {
                    label: localize("No"),
                    callback: () => 
                    {
                        game.settings.set(module, "initialized", true);
                        ui.notifications.notify(localize("WH.Initialization.Skipped"));
                    }
                }
            }
        });
    }

    rootFolders = {};

    async initialize() 
    {
        let packList = this.data.module.flags.initializationPacks;

        for (let pack of packList.map(p => game.packs.get(p))) 
        {
            await this.createFolders(pack);
            let documents = await pack.getDocuments();
            try 
            {
                switch (documents[0].documentName) 
                {
                case "Actor":
                    ui.notifications.notify(this.data.module.title + ": " + localize("WH.Initialization.Actors"));
                    await this.createOrUpdateDocuments(documents, game.actors);
                    break;
                case "Item":
                    ui.notifications.notify(this.data.module.title + ": " + localize("WH.Initialization.Items"));
                    await this.createOrUpdateDocuments(documents, game.items);
                    break;
                case "JournalEntry":
                    ui.notifications.notify(this.data.module.title + ": " + localize("WH.Initialization.Journals"));
                    await this.createOrUpdateDocuments(documents, game.journal);
                    break;
                case "RollTable":
                    ui.notifications.notify(this.data.module.title + ": " + localize("WH.Initialization.Tables"));
                    await this.createOrUpdateDocuments(documents, game.tables);
                    break;
                case "Scene":
                    ui.notifications.notify(this.data.module.title + ": I" + localize("WH.Initialization.Scenes"));
                    await this.createOrUpdateDocuments(documents, game.scenes);
                    break;
                }
            }
            catch(e)
            {
                console.error(e);
            }

        }
    }

    createFolders(pack)
    {
        let root = game.modules.get(pack.metadata.packageName).flags.folder;
        root.type = pack.metadata.type;
        root._id = foundry.utils.randomID();
        root.flags = {source : this.data.module.id};
        let packFolders = pack.folders.contents.map(f => f.toObject());
        for(let f of packFolders)
        {
            if (!f.folder)
            {
                f.folder = root._id;
            }
            f.flags.source = this.data.module.id;
        }
        this.rootFolders[pack.metadata.id] = root._id;
        return CONFIG.Folder.documentClass.create(packFolders.concat(root), {keepId : true});
    }

    async createOrUpdateDocuments(documents, collection, )
    {
        let existingDocuments = documents.filter(i => collection.has(i.id));
        let newDocuments = documents.filter(i => !collection.has(i.id));
        await collection.documentClass.create(this._addData(newDocuments));
        if (existingDocuments.length)
        {
            log("Pre Existing Documents: ", null, {args : existingDocuments});
            existingDocuments = await new Promise(resolve => new ModuleDocumentResolver(existingDocuments, {resolve}).render(true));
            log("Post Existing Documents: ", null, {args : existingDocuments});
        }
        this._addData(existingDocuments);
        for (let doc of existingDocuments)
        {
            let existing = collection.get(doc.id);
            await existing.update(doc.toObject());
            ui.notifications.notify(format("WH.Initialization.UpdatedExistingDocument", {name: doc.name}));
        }
    }

    _addData(documents)
    {
        return documents.map(d => 
        {
            if (!d.folder)
            {
                d.updateSource({folder : this.rootFolders[d.pack], flags : {source : this.data.module.id}});
            }
            d.updateSource({flags : {source : this.data.module.id}});
            return d;
        });
    }

    async deleteModuleContent(id)
    {
        let proceed = await Dialog.confirm({
            title : localize("WH.Initialization.DeleteModuleContent"),
            content : game.i18n.format("WH.Initialization.DeleteModuleContentPrompt", {id}),
            yes : () => {return true;},
            no : () => {return false;},
        });
        if (proceed)
        {
            ui.notifications.notify(this.data.module.title + ": " + localize("WH.Initialization.DeletingScenes"));
            let moduleScenes = game.scenes.filter(doc => doc.flags?.source == id);
            CONFIG.Scene.documentClass.deleteDocuments(moduleScenes.map(doc => doc.id));

            ui.notifications.notify(this.data.module.title + ": " + localize("WH.Initialization.DeletingActors"));
            let moduleActors = game.actors.filter(doc => doc.flags?.source == id && !doc.hasPlayerOwner);
            CONFIG.Actor.documentClass.deleteDocuments(moduleActors.map(doc => doc.id));

            ui.notifications.notify(this.data.module.title + ": " + localize("WH.Initialization.DeletingItems"));
            let moduleItems = game.items.filter(doc => doc.flags?.source == id);
            CONFIG.Item.documentClass.deleteDocuments(moduleItems.map(doc => doc.id));

            ui.notifications.notify(this.data.module.title + ": " + localize("WH.Initialization.DeletingJournals"));
            let moduleJournals = game.journal.filter(doc => doc.flags?.source == id);
            CONFIG.JournalEntry.documentClass.deleteDocuments(moduleJournals.map(doc => doc.id));

            ui.notifications.notify(this.data.module.title + ": " + localize("WH.Initialization.DeletingTables"));
            let moduleTables = game.tables.filter(doc => doc.flags?.source == id);
            CONFIG.RollTable.documentClass.deleteDocuments(moduleTables.map(doc => doc.id));

            ui.notifications.notify(this.data.module.title + ": " + localize("WH.Initialization.DeletingFolders"));
            let moduleFolders = game.folders.filter(doc => doc.flags?.source == id);
            CONFIG.Folder.documentClass.deleteDocuments(moduleFolders.map(doc => doc.id));
        }
    }
}


class ModuleDocumentResolver extends FormApplication
{
    static get defaultOptions() 
    {
        const options = super.defaultOptions;
        options.resizable = true;
        options.height = 600;
        options.width = 400;
        options.template = "modules/warhammer-lib/templates/modules/document-resolver.hbs";
        options.classes.push("document-resolver");
        options.title = localize("WH.ResolveDuplicates");
        return options;
    }


    _updateObject(ev, formData)
    {   
        this.options.resolve(this.object.filter(i => formData[i.id]));
    }
}