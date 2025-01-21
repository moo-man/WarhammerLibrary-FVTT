/* eslint-disable no-undef */
import "../styles/warhammer.scss";
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
import { error, findAllItems, findItemId, findKey, findUuid, getActiveDocumentOwner, log, replacePopoutPath, replacePopoutTokens, sleep } from "./util/utility";
import { DeferredReferenceListModel, DiffReferenceListModel, DocumentReferenceListModel, ListModel } from "./model/components/list";
import WarhammerActorSheetV2 from "./sheets/v2/actor";
import WarhammerContextMenu from "./apps/context-menu";
import { SingletonItemModel } from "./model/components/singleton-item";
import WarhammerItemSheetV2 from "./sheets/v2/item";
import addSheetHelpers from "./util/sheet-helpers";
import { WarhammerZoneConfig } from "./apps/zone-config";
import WarhammerDiffEditor from "./apps/diff-editor";
import ChoiceConfigV2 from "./apps/choice-config";
import { ChoiceModel } from "./model/components/choices";
import ChoiceDecision from "./apps/choice-decision";
import { DeferredReferenceModel, DiffReferenceModel, DocumentReferenceModel } from "./model/components/reference";
import WarhammerScriptEditor from "./apps/script-editor";
import { WarhammerRollTable } from "./document/table";
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
    error,
    findKey,
    getActiveDocumentOwner,
    findAllItems,
    findItemId,
    findUuid,
    replacePopoutTokens,
    replacePopoutPath,
    addSheetHelpers,
    sleep
};

warhammer.apps = {
    WarhammerScript,
    ItemDialog,
    ValueDialog,
    WarhammerScriptConfig,
    WarhammerScriptEditor,
    WarhammerDiffEditor,
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
    WarhammerActorSheetV2,
    WarhammerItemSheetV2,
    WarhammerZoneConfig,
    ChoiceConfigV2,
    ChoiceDecision
};

warhammer.models = {
    BaseWarhammerModel,
    BaseWarhammerActorModel,
    BaseWarhammerItemModel,
    ListModel,
    SingletonItemModel,
    DocumentReferenceModel,
    DocumentReferenceListModel,
    DeferredReferenceModel,
    DeferredReferenceListModel,
    DiffReferenceModel,
    DiffReferenceListModel,
    WarhammerActiveEffectModel,
    WarhammerTestMessageModel,
    WarhammerActiveEffect,
    ChoiceModel

};

warhammer.documents = {
    WarhammerActor,
    WarhammerItem,
    WarhammerRollTable
};

globalThis.warhammer = warhammer;