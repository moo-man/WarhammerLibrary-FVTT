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
        game.socket.on(`system.${game.system.id}`, data => 
        {
            this[data.type]({...data.payload}, data.userId);
        });
    }

    static call(type, payload, userId)
    {
        game.socket.emit(`system.${game.system.id}`, {type, payload, userId});
    }

    static updateActor({speaker, update}={})
    {
        if (game.user.isGM)
        {
            return CONFIG.ChatMessage.documentClass.getSpeakerActor(speaker)?.update(update);
        }
    }

    static updateMessage({id, data}={})
    {
        if (game.user.isGM)
        {
            return game.messages.get(id)?.update(data);
        }
    }

    static updateDrawing({uuid, data}={})
    {
        if (game.user.isGM)
        {
            return fromUuidSync(uuid).update(data);
        }
    }

    static applyEffect({effectUuids, effectData, actorUuid, messageId}, userId)
    {
        if (game.user.id == userId)
        {
            return fromUuidSync(actorUuid)?.applyEffect({effectUuids, effectData, messageId});
        }  
    }

    static applyZoneEffect({effectUuids, effectData, regionUuid, messageId}, userId)
    {
        if (game.user.id == userId)
        {
            return ZoneHelpers.applyEffectToZone({effectUuids, effectData}, fromUuidSync(regionUuid), messageId);
        }  
    }

    static createActor(data) 
    {
        if (game.user.id == game.users.activeGM?.id)
        {
            let id = data.fromId;
            let actorData = data.actor;
            // Give ownership to requesting actor
            actorData.ownership = {
                default: 0,
                [id]: 3
            };
            return Actor.implementation.create(actorData, {keepId : true});
        }
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
    static executeOnOwner(document, type, payload)
    {
        let ownerUser = getActiveDocumentOwner(document);
        if (game.user.id == ownerUser.id)
        {
            return this[type](payload);
        }
        // ui.notifications.notify(game.i18n.format("WH.SendingSocketRequest", {name : ownerUser.name}));
        this.call(type, payload, ownerUser.id);
    }

}