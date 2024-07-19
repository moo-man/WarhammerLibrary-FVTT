export default {
    scriptTriggers : {
        manual : "WH.Trigger.Manual",
        immediate : "WH.Trigger.Immediate",
        dialog : "WH.Trigger.Dialog",
        onCreate : "WH.Trigger.OnCreate",
    
        prepareBaseData : "WH.Trigger.PrepareBaseData",
        prePrepareDerivedData : "WH.Trigger.PrePrepareDerivedData",
        postPrepareDerivedData : "WH.Trigger.PostPrepareDerivedData",
    
        prepareOwnedItemBaseData : "WH.Trigger.PrepareOwnedItemBaseData",
        prePrepareOwnedItemDerivedData : "WH.Trigger.PrePrepareOwnedItemDerivedData",
        postPrepareOwnedItemDerivedData : "WH.Trigger.PostPrepareOwnedItemDerivedData",
    
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
        updateCombat  : "WH.UpdateCombat"
    },

    syncTriggers : ["prepareBaseData",
        "prePrepareDerivedData",
        "postPrepareDerivedData",
        "prepareOwnedItemBaseData",
        "prePrepareOwnedItemDerivedData",
        "postPrepareOwnedItemDerivedData",
        "prepareOwnedItems",
        "prepareOwnedData"],        
};