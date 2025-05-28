import { localize, log } from "../util/utility";


export class WarhammerModuleContentHandler
{

    constructor(module)
    {
        this.module = module;
    }

    rootFolders = {};

    //#region initialization
    async initialize() 
    {
        let packList = this.module.flags.initializationPacks;

        if (this.hasExistingInitialization(packList))
        {
            if (!(await foundry.applications.api.DialogV2.confirm({content : "Existing Documents have been found from a previous initialization. Initializing again may prompt you to choose between keeping the current imported versions or replacing them from this initialization. Do you wish to continue?"})))
            {
                return;
            }
        }

        for (let pack of packList.map(p => game.packs.get(p))) 
        {
            await this.createFolders(pack);
            let documents = await pack.getDocuments();
            try 
            {
                switch (documents[0].documentName) 
                {
                case "Actor":
                    ui.notifications.notify(this.module.title + ": Initializing Actors");
                    await this.createOrUpdateDocuments(documents, game.actors);
                    break;
                case "Item":
                    ui.notifications.notify(this.module.title + ": Initializing Items");
                    await this.createOrUpdateDocuments(documents, game.items);
                    break;
                case "JournalEntry":
                    ui.notifications.notify(this.module.title + ": Initializing Journals");
                    await this.createOrUpdateDocuments(documents, game.journal);
                    break;
                case "RollTable":
                    ui.notifications.notify(this.module.title + ": Initializing Tables");
                    await this.createOrUpdateDocuments(documents, game.tables);
                    break;
                case "Scene":
                    ui.notifications.notify(this.module.title + ": Initializing Scenes");
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

    hasExistingInitialization(packs)
    {
        for(let pack of packs.map(p => game.packs.get(p))) 
        {
            if (game[globalThis[pack.metadata.type].collectionName].contents.find(doc => doc.getFlag("warhammer-lib", "source") == this.module.id))
            {
                return true;
            }
        }
        return false;
    }

    createFolders(pack)
    {
        let root = game.modules.get(pack.metadata.packageName).flags.folder;
        root.type = pack.metadata.type;
        root._id = foundry.utils.randomID();
        root.flags = {"warhammer-lib" : {source : this.module.id}};
        let packFolders = pack.folders.contents.map(f => f.toObject());
        for(let f of packFolders)
        {
            if (!f.folder)
            {
                f.folder = root._id;
            }
            foundry.utils.setProperty(f.flags, "warhammer-lib.source", this.module.id);
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
            ui.notifications.notify(`Updated existing document ${doc.name}`);
        }
    }

    _addData(documents)
    {
        return documents.map(d => 
        {
            if (!d.folder)
            {
                d.updateSource({folder : this.rootFolders[d.pack], flags : {"warhammer-lib" : {source : this.module.id}}});
            }
            d.updateSource({flags : {"warhammer-lib" : {source : this.module.id}}});
            return d;
        });
    }

    //#endregion

    //#region deleting
    async delete()
    {
        ui.notifications.notify(this.module.title + ": Deleting Scenes");
        let moduleScenes = game.scenes.filter(doc => doc.flags?.["warhammer-lib"]?.source == this.module.id);
        CONFIG.Scene.documentClass.deleteDocuments(moduleScenes.map(doc => doc.id));

        ui.notifications.notify(this.module.title + ": Deleting Actors");
        let moduleActors = game.actors.filter(doc => doc.flags?.["warhammer-lib"]?.source == this.module.id && !doc.hasPlayerOwner);
        CONFIG.Actor.documentClass.deleteDocuments(moduleActors.map(doc => doc.id));

        ui.notifications.notify(this.module.title + ": Deleting Items");
        let moduleItems = game.items.filter(doc => doc.flags?.["warhammer-lib"]?.source == this.module.id);
        CONFIG.Item.documentClass.deleteDocuments(moduleItems.map(doc => doc.id));

        ui.notifications.notify(this.module.title + ": Deleting Journals");
        let moduleJournals = game.journal.filter(doc => doc.flags?.["warhammer-lib"]?.source == this.module.id);
        CONFIG.JournalEntry.documentClass.deleteDocuments(moduleJournals.map(doc => doc.id));

        ui.notifications.notify(this.module.title + ": Deleting Tables");
        let moduleTables = game.tables.filter(doc => doc.flags?.["warhammer-lib"]?.source == this.module.id);
        CONFIG.RollTable.documentClass.deleteDocuments(moduleTables.map(doc => doc.id));

        ui.notifications.notify(this.module.title + ": Deleting Folders");
        let moduleFolders = game.folders.filter(doc => doc.flags?.["warhammer-lib"]?.source == this.module.id);
        CONFIG.Folder.documentClass.deleteDocuments(moduleFolders.map(doc => doc.id));
    }
    //#endregion

    //#region updating 
    async update(settings)
    {
        let documents = await this._getDocuments();
        this.count = {created : 0, updated : 0};
        for(let type in settings)
        {
            if (type != "excludeNameChange" && settings[type])
            {
                await this._updateDocuments(documents[type], settings);
            }
        }
        ui.notifications.notify(`${game.i18n.format("UPDATER.Notification", { created: this.count.created,  updated: this.count.updated,  name: this.module.id, version: this.module.version })}`);
    }

    async _updateDocuments(documents, settings)
    {
        if (!documents.length)
        {return;}
        let toCreate = [];
        let toDelete = [];
        let documentClass;

        let topFolder = this.module.flags.folder;

        // For each document that would be initialized by this module, if it exists in this world 
        // and isn't owned by a player (and should be changed according to excludeNameChange), update it
        // if it doesn't exist in the world, import it
        for (let document of documents)
        {
            if (document?.hasPlayerOwner)
            {
                continue;
            }

            if (!documentClass)
            {
                documentClass = CONFIG[document.documentName].documentClass;
            }
            if (game[document.collectionName].has(document.id))
            {
                let existingDoc = game[document.collectionName].get(document.id);
                if (!settings.excludeNameChange || (settings.excludeNameChange && document.name == existingDoc.name))
                {
                    let folder = existingDoc.folder;
                    let ownership = existingDoc.ownership;
                    toDelete.push(existingDoc.id);
                    let newDoc = document.toObject();
                    newDoc.folder = folder;
                    newDoc.ownership = ownership;
                    toCreate.push(newDoc);
                    log(`Updated Document ${document.name}`);
                    this.count.updated++;
                }
            }
            else 
            {
                let newDoc = document.toObject();

                let docFolder = game.folders.find(f => f.name == topFolder.name && f.type == document.documentName);
                if (docFolder && !newDoc.folder)
                {
                    newDoc.folder = docFolder.id;
                }

                toCreate.push(newDoc);
                log(`Imported Document ${document.name}`);
                this.count.created++;
            }
        }
        await documentClass.deleteDocuments(toDelete);
        let created = await documentClass.createDocuments(toCreate);
    }

    /**
     * 
     * @returns Collection of documents that would be initialized by this module
     */
    async _getDocuments()
    {
        let module = this.module;
        let packs = module.flags.initializationPacks.map(i => game.packs.get(i));
        let documents = {
            actors : [],
            journals : [],
            items : [],
            scenes : [],
            tables : [],
            macros : []
        };
        for (let pack of packs)
        {
            let docs = await pack.getDocuments();
            switch (pack.metadata.type)
            {
            case "Actor": documents.actors = documents.actors.concat(docs);
                break;
            case "JournalEntry": documents.journals = documents.journals.concat(docs);
                break;
            case "Item": documents.items = documents.items.concat(docs);
                break;
            case "RollTable": documents.tables = documents.tables.concat(docs);
                break;
            case "Scene": documents.scenes = documents.scenes.concat(docs);
                break;
            case "Macro": documents.macros = documents.macros.concat(docs);
                break;
            }
        }
        return documents;
    }
    //#endregion
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