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
import { findAllItems, findItemId, findKey, getActiveDocumentOwner, log, replacePopoutTokens } from "./util/utility";
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
    replacePopoutTokens
};

warhammer.apps = {
    WarhammerScript,
    ItemDialog,
    ValueDialog,
    WarhammerScriptConfig,
    WarhammerActiveEffect,
    WarhammerBugReport,
    WarhammerRollDialog,
    WarhammerActiveEffectConfig,
    WarhammerEffectScriptConfig,
    WarhammerActiveEffectModel,
    WarhammerActor,
    WarhammerItem,
    BaseWarhammerModel,
    BaseWarhammerActorModel,
    BaseWarhammerItemModel,
    SocketHandlers,
    defaultWarhammerConfig,
    TokenHelpers,
    WarhammerTestBase,
    AreaTemplate,
    WarhammerChatListeners,
    WarhammerTestMessageModel,
    WarhammerModuleInitializer,
    WarhammerActorSheet,
    WarhammerItemSheet
};

globalThis.warhammer = warhammer;