export default {
    badgeInfo : {
        img : "",
        notes : "",
        issues : "",
        wiki : "",
        discord : "https://discord.gg/GrMcdeDHh8"
    },

    scriptTriggers : {
        manual : "WH.Trigger.Manual",
        immediate : "WH.Trigger.Immediate",
        dialog : "WH.Trigger.Dialog",
        onCreate : "WH.Trigger.OnCreate",
    
        prepareBaseData : "WH.Trigger.PrepareBaseData",
        prePrepareDerivedData : "WH.Trigger.PrePrepareDerivedData",
        prepareDerivedData : "WH.Trigger.PrepareDerivedData",
    
        prepareOwnedItemBaseData : "WH.Trigger.PrepareOwnedItemBaseData",
        prePrepareOwnedItemDerivedData : "WH.Trigger.PrePrepareOwnedItemDerivedData",
        prepareOwnedItemDerivedData : "WH.Trigger.PrepareOwnedItemDerivedData",
    
        prepareOwnedItems : "WH.Trigger.PrepareOwnedItems",
        prepareOwnedData : "WH.Trigger.PrepareOwnedData",
    
        preApplyDamage : "WH.Trigger.PreApplyDamage",
        applyDamage : "WH.Trigger.ApplyDamage",
        preTakeDamage : "WH.Trigger.PreTakeDamage",
        takeDamage : "WH.Trigger.TakeDamage",
    
        createToken : "WH.Trigger.CreateToken",
        createItem : "WH.Trigger.CreateItem",
        preUpdateDocument : "WH.Trigger.PreUpdateDocument",
        updateDocument : "WH.Trigger.UpdateDocument",
    
        createCondition : "WH.Trigger.CreateCondition",

        deleteEffect : "WH.Trigger.DeleteEffect",
    
        startRound : "WH.Trigger.StartRound",
        endRound : "WH.Trigger.EndRound",
        startTurn : "WH.Trigger.StartTurn",
        endTurn : "WH.Trigger.EndTurn",
        updateCombat  : "WH.Trigger.UpdateCombat",
        startCombat  : "WH.Trigger.StartCombat",
        endCombat  : "WH.Trigger.EndCombat"
    },

    syncTriggers : ["prepareBaseData",
        "prePrepareDerivedData",
        "prepareDerivedData",
        "prepareOwnedItemBaseData",
        "prePrepareOwnedItemDerivedData",
        "prepareOwnedItemDerivedData",
        "prepareOwnedItems",
        "prepareOwnedData"],     
    
    triggerMapping : {

    },

    traitOrder : [], 

    getZoneTraitEffects : (region) => 
    {
        return [];
    },

    placeholderItemData : {
        
    },

    transferDocumentTypes : {
        "Actor" : "Actor",
        "Item" : "Item"
    },

    
    filterValues : {

    }

};