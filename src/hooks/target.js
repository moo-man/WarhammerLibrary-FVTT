import WarhammerRollDialog from "../apps/roll-dialog";

/**
 *
 */
export default function () 
{
    Hooks.on("targetToken", WarhammerRollDialog.updateActiveDialogTargets);
}