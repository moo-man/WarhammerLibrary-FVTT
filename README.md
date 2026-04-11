# Warhammer Code Library

This code library is a module for Foundry VTT — to be used with the various Warhammer Roleplaying systems.

- [Warhammer Fantasy Roleplay 4th Edition](https://foundryvtt.com/packages/wfrp4e) – [Repo](https://github.com/moo-man/WFRP4e-FoundryVTT)
- [Warhammer Age of Sigmar: Soulbound](https://foundryvtt.com/packages/age-of-sigmar-soulbound) – [Repo](https://github.com/moo-man/AoS-Soulbound-FoundryVTT)
- [Warhammer Roleplay 40,000: Wrath & Glory](https://foundryvtt.com/packages/wrath-and-glory) – [Repo](https://github.com/moo-man/WrathAndGlory-FoundryVTT)
- [Warhammer Roleplay 40,000: Imperium Maledictum](https://foundryvtt.com/packages/impmal) – [Repo](https://github.com/moo-man/ImpMal-FoundryVTT)
- [Warhemmer: The Old World Roleplaying Game](https://foundryvtt.com/packages/whtow) – [Repo](https://github.com/moo-man/OldWorld-FoundryVTT)


## Integration

There are multiple steps to integrate this library.

### Documents

- [ ] The system's Actor Document class should extend `WarhammerActor`

- [ ] The system's Item Document class should extend `WarhammerItem`

- [ ] The system's ActiveEffect Document class should extend `WarhammerActiveEffect`

    - [ ] If the system uses Zones, the static `CONFIGURATION.zones` property on the Active Effect document should be set to true.

    - [ ] The ActiveEffect document should override the `resistEffect` function to handle custom effect avoidance properties.

### Models

- [ ] Actor Models should be descended from `BaseWarhammerActorModel`

    - [ ] `preventItemTypes` is a list of Item types not allowed on this model

    - [ ] `singletonItemPaths` is an `type` -> `system.path.to.data` object for singleton Items, or types which Actors can only have one of. The path should lead to a `SingletonItemModel`
 
- [ ] Item Models should be descended from `BaseWarhammerItemModel`

- [ ] Active EFfect Models should be descended from `WarhammerActiveEffectModel`

    - [ ] This model should also define a static `_avoidTestModel` property with a model class that extends `AvoidTestModel` 

- [ ] The Chat Message model should extend `WarhammerTestMessageModel`, the schema should be redefined as needed, an the `test` getter should be defined to recreate Test objects.

### Sheets

- [ ] Actor sheets should be descended from `WarhammerActorSheet(V2)`

- [ ] Item sheets should be descended from `WarhammerItemSheet(V2)`

- [ ] Active Effect sheets should extend `WarhammerActiveEffectConfig`

    - [ ] Systems can define `systemTemplate` to add any additional properties to the effect config (usually for ading Zone Config)

    - [ ] Define `effectKeysTemplate` the path variable (path to the template)

### Roll Dialog

### Tests

### Misc

- [ ] Set Config
```js
CONFIG.Actor.documentClass = SystemActor;
CONFIG.Item.documentClass = SystemItem;
CONFIG.ChatMessage.documentClass = SystemChatMessage;
CONFIG.ActiveEffect.documentClass = SystemEffect;
CONFIG.ActiveEffect.legacyTransferral = false;
CONFIG.ActiveEffect.dataModels["base"] = SystemActiveEffectModel
CONFIG.ChatMessage.dataModels["test"] = SystemMessageModel;

DocumentSheetConfig.registerSheet(ActiveEffect, "system", ImpmalActiveEffectConfig, {makeDefault : true});

//... Other sheets and data models

```

- [ ] Config object properties

```js
    effectScripts = {}

    logFormat = []

    rollClasses = {}

    premiumModules = {}

    triggerMapping : {}

    traitOrder : [], 

    avoidTestTemplate : "path/to/template",

    getZoneTraitEffects : (region) => 
    {
        return [];
    },

    placeholderItemData : {
        
    },
```