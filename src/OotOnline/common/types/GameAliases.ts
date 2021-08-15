import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { AgeOrForm } from "Z64Lib/API/Common/Z64API";
import { OOT_ANIM_BANK_DMA, OOT_ANIM_BANK_SIZE } from "./OotAliases";
import { AdultManifest, ChildManifest, DMAIndex, Game } from "./Types";
import { OOTAdultManifest } from "Z64Lib/API/OoT/ModelData/OOTAdultManfest";
import { OOTChildManifest } from "Z64Lib/API/OoT/ModelData/OOTChildManifest";

export let Z64_ANIM_BANK_DMA: DMAIndex = 0;
export let Z64_ANIM_BANK_SIZE: number = 0;
export let Z64_CHILD_ZOBJ_DMA: DMAIndex = 0;
export let Z64_ADULT_ZOBJ_DMA: DMAIndex = 0;
export let Z64_IS_RANDOMIZER: boolean = false;
export let Z64_GAME: Game;
export let Z64_CHILD: AgeOrForm;
export let Z64_ADULT: AgeOrForm;
export let Z64_TITLE_SCREEN_FORM: AgeOrForm;
// Playas stuff
export let Z64_ADULT_MANIFEST: AdultManifest;
export let Z64_CHILD_MANIFEST: ChildManifest;

export function setupOot(){
    Z64_ANIM_BANK_DMA = OOT_ANIM_BANK_DMA;
    Z64_ANIM_BANK_SIZE = OOT_ANIM_BANK_SIZE;
    Z64_GAME = Z64LibSupportedGames.OCARINA_OF_TIME;
    Z64_CHILD = AgeOrForm.CHILD;
    Z64_ADULT = AgeOrForm.ADULT;
    Z64_TITLE_SCREEN_FORM = AgeOrForm.ADULT;
    Z64_ADULT_MANIFEST = new OOTAdultManifest();
    Z64_CHILD_MANIFEST = new OOTChildManifest();
    Z64_ADULT_ZOBJ_DMA = 502;
    Z64_CHILD_ZOBJ_DMA = 503;
}

export function setupMM(){
}

export function markAsRandomizer(){
    Z64_IS_RANDOMIZER = true;
}