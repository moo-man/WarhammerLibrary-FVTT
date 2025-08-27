import { getActiveDocumentOwner } from "./utility";
import ZoneHelpers from "./zone-helpers";

export class SocketHandlers
{
    /**
     * @param {object} handlers handlers to be added in addition to the ones already provided
     */
    static register(handlers)
    {
        Object.assign(this, handlers);
        CONFIG.queries[`${game.system.id}.updateActor`] = (queryData, {timeout}) => { return this.updateActor(queryData); };
        CONFIG.queries[`${game.system.id}.updateMessage`] = (queryData, {timeout}) => { return this.updateMessage(queryData); };
        CONFIG.queries[`${game.system.id}.updateDrawing`] = (queryData, {timeout}) => { return this.updateDrawing(queryData); };
        CONFIG.queries[`${game.system.id}.applyEffect`] = (queryData, {timeout, userId}) => { return this.applyEffect(queryData, userId); };
        CONFIG.queries[`${game.system.id}.applyZoneEffect`] = (queryData, {timeout, userId}) => { return this.applyZoneEffect(queryData, userId); };
        CONFIG.queries[`${game.system.id}.createActor`] = (queryData, {timeout}) => { return this.createActor(queryData); };
    }

    static async call(type, payload, userId)
    {
        let result = [];
        let users = [];
        if (userId == "GM")
        {
            users.push(game.users.activeGM);
        }
        else if (userId == "ALL")
        {
            users = game.users.filter(u => u.active);
        }
        else if (userId)
        {
            const user = game.users.get(userId);
            users.push(user);
        }
        for (const user of users)
        {
            if (user.id == game.user.id)
            {
                result.push(this[type]({ ...payload }) ?? 0);
            }
            else
            {
                result.push(user.query(`${game.system.id}.${type}`, payload) ?? 0);
            }
        }
        return await Promise.all(result);
    }

    static async updateActor({speaker, update}={})
    {
        let result = null;
        if (game.user.isGM)
        {
            result = await CONFIG.ChatMessage.documentClass.getSpeakerActor(speaker)?.update(update);
        }
        return result;
    }

    static async updateMessage({id, data}={})
    {
        let result = null;
        if (game.user.isGM)
        {
            result = await game.messages.get(id)?.update(data);
        }
        return result;
    }

    static async updateDrawing({uuid, data}={})
    {
        let result = null;
        if (game.user.isGM)
        {
            result = await fromUuidSync(uuid).update(data);
        }
        return result;
    }

    static async applyEffect({effectUuids, effectData, actorUuid, messageId})
    {
        const result = await fromUuidSync(actorUuid)?.applyEffect({effectUuids, effectData, messageId});
        return result;
    }

    static async applyZoneEffect({effectUuids, effectData, regionUuid, messageId})
    {
        const result = await ZoneHelpers.applyEffectToZone({effectUuids, effectData}, fromUuidSync(regionUuid), messageId);
        return result;
    }

    static async createActor(data) 
    {
        let result = null;
        if (game.user.id == game.users.activeGM?.id)
        {
            let id = data.fromId;
            let actorData = data.actor;
            // Give ownership to requesting actor
            actorData.ownership = {
                default: 0,
                [id]: 3
            };
            result = await Actor.implementation.create(actorData, {keepId : true});
        }
        return result;
    }

    /**
     * Not used by sockets directly, but is called when a socket handler should be executed by
     * the specific user which owns a document. Usually used to invoke tests from other users
     * for their assigned Actor. 
     * @param {Document} document Document on which to test if the user is owner or not
     * @param {string} type Type of socket handler
     * @param {object} payload Data for socket handler, should generally include document UUID 
     * @returns {any} If owner, returns socket operation performed
     */
    static async executeOnOwner(document, type, payload)
    {
        let ownerUser = getActiveDocumentOwner(document);
        if (game.user.id == ownerUser.id)
        {
            return await this[type](payload);
        }
        return await this.call(type, payload, ownerUser.id);
    }

}