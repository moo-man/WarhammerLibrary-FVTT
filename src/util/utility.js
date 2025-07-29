
/**
 *@returns {object} Returns the config object for the system
 */
export function systemConfig() 
{
    switch(game.system.id)
    {
    case "wrath-and-glory":
        return game.wng.config;
    case "age-of-sigmar-soulbound":
        return game.aos.config;
    case "whtow" : 
        return game.oldworld.config;
    default:
        return game[game.system.id].config;
    }
}

/**
 *
 * @param message
 * @param force
 * @param args
 * @param options
 */
export function log(message, force=false, args, options={}) 
{
    if (CONFIG.debug.warhammer || force)
    {
        let format = foundry.utils.deepClone(systemConfig().logFormat);
        format[0] = format[0].replace("@MESSAGE", message);
        if (options.groupCollapsed)
        {
            console.groupCollapsed(...format, args || "");
        }
        else 
        {
            console.log(...format, args || "");
        }
    }
}


/**
 *
 * @param message
 * @param force
 * @param args
 */
export function error(message, force=false, args) 
{
    if (CONFIG.debug.warhammer || force)
    {
        let format = foundry.utils.deepClone(systemConfig().logFormat);
        format[0] = format[0].replace("@MESSAGE", message);
        console.error(...format, args || "");
    }
}



/**
 * @param {string} string string to be localized
 * @returns {string} localized string
 */
export function localize(string)
{
    return game.i18n.localize(string);
}

/**
 * @param {string} string string to be localized
 * @param {object} args data for localization
 * @returns {string} localized string
 */
export function format(string, args)
{
    return game.i18n.format(string, args);
}

/**
 * Finds the first key that matches the value provided
 * @param {*} value value being test 
 * @param {*} obj object being searched
 * @param {*} options options for the search
 * @param {*} options.caseInsensitive compare value without considering case
 * @returns {string|undefined} The key found, if any
 */
export function findKey(value, obj, options = {}) 
{
    if (!value || !obj)
    {return undefined;}

    if (options.caseInsensitive) 
    {
        for (let key in obj) 
        {
            if (obj[key].toLowerCase() == value.toLowerCase())
            {return key;}
        }
    }
    else 
    {
        for (let key in obj) 
        {
            if (obj[key] == value)
            {return key;}
        }
    }
    return undefined;
}

/**
 * This function tests whether an existing ID is already present in the collection that the document is being created in
 * If there is no conflict in ID, keep the ID 
 * @param {string} id The ID being tested
 * @param {Document} document The document the id belongs to
 * @returns {boolean} whether or not to keep the id
 */
export function keepID(document) 
{
    try 
    {
        let compendium = !!document.pack;
        let world = !compendium;
        let collection;

        if (compendium) 
        {
            let pack = game.packs.get(document.pack);
            collection = pack.index;
        }
        else if (world)
        {collection = document.collection;}

        if (collection.has(document.id)) 
        {
            ui.notifications.notify(`${game.i18n.format("WH.Error.ID", {name: document.name})}`);
            return false;
        }
        else {return true;}
    }
    catch (e) 
    {
        console.error(e);
        return false;
    }
}

/**
 *
 * @param id
 * @param type
 */
export function findItemId(id="", type) 
{
    if (id.includes("."))
    {return fromUuid(id);}

    if (game.items.has(id))
    {return game.items.get(id);};

    let packs = game.packs.contents;
    for (let pack of packs) 
    {
        if (pack.index.has(id)) 
        {
            return pack.getDocument(id);
        }
    }
}

// Given a ID, find the compendium UUID
/**
 *
 * @param id
 */
export function findUuid(id) 
{
    let packs = game.packs.contents;
    for (let pack of packs) 
    {
        if (pack.index.has(id)) 
        {
            return pack.index.get(id).uuid;
        }
    }
}

/**
 * Find the owner of a document, prioritizing non-GM users 
 * @param {object} document Document whose owner is being found
 * @returns {User} Owning user found
 */
export function getActiveDocumentOwner(document) 
{
    if (!document)
    {
        return null;
    }
    // let document = fromUuidSync(uuid);
    if (document.documentName == "Item" && document.isOwned) 
    {
        document = document.actor;
    }
    let activePlayers = game.users.contents.filter(u => u.active && u.role <= 2); // Not assistant or GM 
    let owningUser;

    // First, prioritize if any user has this document as their assigned character
    owningUser = activePlayers.find(u => u.character?.id == document.id);

    // If not found, find the first non-GM user that can update this document
    if (!owningUser) 
    {
        owningUser = activePlayers.find(u => document.testUserPermission(u, "OWNER"));
    }

    // If still no owning user, simply find the first GM
    if (!owningUser) 
    {
        owningUser = game.users.contents.filter(u => u.active).find(u => u.isGM);
    }
    
    return owningUser;
}

/**
 *
 * @param allowPlayerTargets
 */
export function targetedOrAssignedActors(allowPlayerTargets=false)
{
    let targets = Array.from(game.user.targets);
    if (game.user.isGM)
    {
        if (targets.length)
        {
            return targets.map(i => i.actor).filter(a => a);
        }
        else 
        {
            ui.notifications.error("WH.Error.NoTargetedActors", {localize: true});
        }
    }
    else 
    {
        if (allowPlayerTargets && targets.length)
        {
            return targets.map(i => i.actor).filter(a => a);
        }
        else if (game.user.character)
        {
            return [game.user.character];
        }
        else 
        {
            ui.notifications.error("WH.Error.NoActorAssigned", {localize: true});
        }
    }
    return [];
}

/**
 *
 */
export function targetsWithFallback()
{
    let targets = Array.from(game.user.targets);
    if (targets.length)
    {
        return targets.map(i => i.actor);
    }
    else 
    {
        return canvas.tokens.controlled.map(i => i.actor);
    }
}

export function selectedWithFallback()
{
    let actors = canvas.tokens.controlled.map(i => i.actor).filter(i => i);
    if (actors.length)
    {
        return actors;
    }
    else if (game.user.character)
    {
        return [game.user.character];
    }
    else 
    {
        return [];
    }
}

/**
 *
 * @param ms
 */
export async function sleep(ms) 
{
    await new Promise(resolve => setTimeout(resolve, ms));
}

// Add the source of a compendium link
// e.g. Compendium.wfrp4e-core -> (WFRP4e Core Rulebook) tooltip
/**
 *
 * @param html
 */
export function addLinkSources(html)
{
    html.querySelectorAll(".content-link").forEach(element => 
    {
        let uuid = element.dataset.uuid;
        let tooltip = element.dataset.tooltipText || "";
        if (uuid)
        {
            let moduleKey = uuid.split(".")[1];
            if (systemConfig().premiumModules[moduleKey])
            {
                if (!tooltip)
                {
                    tooltip = `${foundry.utils.parseUuid(uuid).type} (${systemConfig().premiumModules[moduleKey]})`;
                }
                else 
                {
                    tooltip += ` (${systemConfig().premiumModules[moduleKey]})`;
                }
            }
        }

        element.dataset.tooltipText = tooltip;

    });
}

// Since popout tokens display very small in HTML, try to replace them
/**
 *
 * @param html
 */
export function replacePopoutTokens(html) 
{
    // Try to replace popout tokens in chat
    let images = html.querySelectorAll('img:not(.profile)'); // This is required to prevent saving the absolute actor image path
    images.forEach(async element => 
    {
        element.src = replacePopoutPath(element.src);
    });
}

/**
 *
 * @param path
 */
export function replacePopoutPath(path) 
{
    if (path.includes("tokens/popout/")) 
    { 
        log("Replacing popout token: " + path);
    }
    return path.replace("tokens/popout/", "tokens/");
};

/**
 *
 * @param type
 * @param loadingLabel
 * @param index
 * @param indexFields
 */
export async function findAllItems(type, loadingLabel = "", index=false, indexFields=[]) 
{
    let items = game.items.contents.filter(i => i.type == type);

    let packCounter = 0;
    let packs = [...game.packs];
    let indexedItems = [];
    for (let p of packs) 
    {
        if (loadingLabel)
        {
            packCounter++;
            foundry.applications.ui.SceneNavigation.displayProgressBar({label: loadingLabel, pct: (packCounter / packs.length)*100 });
        }
        indexedItems = indexedItems.concat((await p.getIndex({fields: indexFields})).filter(i => i.type == type)); 
    }

    if (!index)
    {
        items = items.concat(await Promise.all(indexedItems.map(i => fromUuid(i.uuid))));
        return items.sort((a, b) => a.name > b.name ? 1 : -1);
    }
    else 
    {
        return indexedItems.concat(items);
    }
}

/**
 * Sort the provided object by its values or by an inner sortKey.
 * @param {object} obj                 The object to sort.
 * @param {string|Function} [sortKey]  An inner key upon which to sort or sorting function.
 * @returns {object}                   A copy of the original object that has been sorted.
 */
export function sortObjectEntries(obj, sortKey) 
{
    let sorted = Object.entries(obj);

    const sort = (lhs, rhs) => foundry.utils.getType(lhs) === "string" ? lhs.localeCompare(rhs, game.i18n.lang) : lhs - rhs;

    if ( foundry.utils.getType(sortKey) === "function" ) {sorted = sorted.sort((lhs, rhs) => sortKey(lhs[1], rhs[1]));}
    else if ( sortKey ) {sorted = sorted.sort((lhs, rhs) => sort(lhs[1][sortKey], rhs[1][sortKey]));}
    else {sorted = sorted.sort((lhs, rhs) => sort(lhs[1], rhs[1]));}

    return Object.fromEntries(sorted);
}

/**
 * Returns TYPES of documentClass sorted by their localized label.
 * @param {Document} documentClass
 * @returns {string[]}
 */
export function getSortedTypes(documentClass) 
{
    return documentClass.TYPES.sort((a, b) =>
        game.i18n.localize(CONFIG[documentClass.documentName].typeLabels[a]).localeCompare(game.i18n.localize(CONFIG[documentClass.documentName].typeLabels[b]))
    );
}

/**
 * Get the package associated with the given UUID, if any.
 * @param {string} uuid  The UUID.
 * @returns {ClientPackage|null}
 */
export function getPackage(uuid) 
{
    if (!uuid) {return null;}

    const pack = foundry.utils.parseUuid(uuid)?.collection?.metadata;

    switch (pack?.packageType) 
    {
    case "module":
        return game.modules.get(pack.packageName);
    case "system":
        return game.system;
    case "world":
        return game.world;
    }

    return null;
}

/**
 * Get the compendium's name associated with the given UUID, if any.
 * @param {string} uuid  The UUID.
 * @returns {string|ull}
 */
export function getCompendiumName(uuid) 
{
    if (!uuid) {return null;}

    const label = foundry.utils.parseUuid(uuid)?.collection?.metadata?.label;

    return label ?? null;
}

/**
 *
 */
export function registerPremiumModuleInitialization()
{
    for(let module in systemConfig().premiumModules)
    {
        if (game.modules.get(module)?.active)
        {
            game.settings.register(module, "initialized", {
                name: "Initialization",
                scope: "world",
                config: false,
                default: false,
                type: Boolean
            });
        }
    }

}