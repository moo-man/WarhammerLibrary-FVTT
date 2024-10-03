/* eslint-disable no-undef */

import WarhammerScript from "./system/script";
import ItemDialog from "./apps/item-dialog";
import ValueDialog from "./apps/value-dialog";
import WarhammerScriptConfig from "./apps/script-config";
import WarhammerActiveEffect from "./document/effect";
import WarhammerBugReport from "./modules/bug-report";
import WarhammerRollDialog from "./apps/roll-dialog";
import WarhammerActiveEffectConfig from "./sheets/effect";
import WarhammerEffectScriptConfig from "./apps/effect-script-config";
import { WarhammerActiveEffectModel } from "./model/effect";
import { WarhammerActor } from "./document/actor";
import { WarhammerItem } from "./document/item";
import { BaseWarhammerModel } from "./model/base";
import { BaseWarhammerActorModel } from "./model/actor";
import { BaseWarhammerItemModel } from "./model/item";
import defaultWarhammerConfig from "./system/config";
import hooks from "./hooks/hooks";
import { SocketHandlers } from "./util/socket-handlers";
import TokenHelpers from "./util/token-helpers";
import { WarhammerTestBase } from "./system/test";
import AreaTemplate from "./util/area-template";
import WarhammerChatListeners from "./util/chat-listeners";
import { WarhammerTestMessageModel } from "./model/message";
import WarhammerModuleInitializer from "./modules/module-initialization";
import { WarhammerActorSheet } from "./sheets/actor";
import { WarhammerItemSheet } from "./sheets/item";
import overrides from "./util/overrides";
import { findAllItems, findItemId, findKey, getActiveDocumentOwner, log, replacePopoutPath, replacePopoutTokens, sleep } from "./util/utility";
import { ListModel } from "./model/components/list";
import { DocumentReferenceListModel, DocumentReferenceModel } from "./model/components/reference";
import WarhammerActorSheetV2 from "./sheets/v2/actor";
import WarhammerContextMenu from "./apps/context-menu";
hooks();
overrides();

// This prevents namespace conflicts when files destructure foundry.utils
// Can be removed in v13
mergeObject = foundry.utils.mergeObject;
setProperty = foundry.utils.setProperty;
getProperty = foundry.utils.getProperty;
hasProperty = foundry.utils.hasProperty;
deepClone = foundry.utils.deepClone;
isNewerVersion = foundry.utils.isNewerVersion;
diffObject = foundry.utils.isNewerVersion;
isEmpty = foundry.utils.isEmpty;

warhammer = {};

warhammer.utility = {
    log,
    findKey,
    getActiveDocumentOwner,
    findAllItems,
    findItemId,
    replacePopoutTokens,
    replacePopoutPath,
    sleep
};

warhammer.apps = {
    WarhammerScript,
    ItemDialog,
    ValueDialog,
    WarhammerScriptConfig,
    WarhammerBugReport,
    WarhammerRollDialog,
    WarhammerActiveEffectConfig,
    WarhammerEffectScriptConfig,
    WarhammerContextMenu,
    SocketHandlers,
    defaultWarhammerConfig,
    TokenHelpers,
    WarhammerTestBase,
    AreaTemplate,
    WarhammerChatListeners,
    WarhammerModuleInitializer,
    WarhammerActorSheet,
    WarhammerItemSheet,
    WarhammerActorSheetV2
};

warhammer.models = {
    BaseWarhammerModel,
    BaseWarhammerActorModel,
    BaseWarhammerItemModel,
    ListModel,
    DocumentReferenceModel,
    DocumentReferenceListModel,
    WarhammerActiveEffectModel,
    WarhammerTestMessageModel,
    WarhammerActiveEffect

};

warhammer.documents = {
    WarhammerActor,
    WarhammerItem,
};

globalThis.warhammer = warhammer;