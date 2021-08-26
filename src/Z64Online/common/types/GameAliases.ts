import { OOTManifest } from "Z64Lib/API/OoT/ModelData/OOTManfest";
import { OOT_ANIM_BANK_DMA, OOT_ANIM_BANK_SIZE } from "./OotAliases";
import { AgeOrForm, DMAIndex, Manifest } from "./Types";
import { MMManifest } from 'Z64Lib/API/MM/ModelData/MMManfest';

export let Z64_ANIM_BANK_DMA: DMAIndex = 0;
export let Z64_ANIM_BANK_SIZE: number = 0;
export let Z64_CHILD_ZOBJ_DMA: DMAIndex = 0;
export let Z64_ADULT_ZOBJ_DMA: DMAIndex = 0;
export let Z64_IS_RANDOMIZER: boolean = false;
export let Z64_CHILD: AgeOrForm;
export let Z64_ADULT: AgeOrForm;
export let Z64_TITLE_SCREEN_FORM: AgeOrForm;
// Playas stuff
export let Z64_MANIFEST: Manifest;

export function setupOot(){
    Z64_ANIM_BANK_DMA = OOT_ANIM_BANK_DMA;
    Z64_ANIM_BANK_SIZE = OOT_ANIM_BANK_SIZE;
    Z64_CHILD = AgeOrForm.CHILD;
    Z64_ADULT = AgeOrForm.ADULT;
    Z64_TITLE_SCREEN_FORM = AgeOrForm.ADULT;
    Z64_MANIFEST = new OOTManifest();
    Z64_ADULT_ZOBJ_DMA = 502;
    Z64_CHILD_ZOBJ_DMA = 503;
}

export function setupMM(){
    Z64_ANIM_BANK_DMA = -1;
    Z64_ANIM_BANK_SIZE = -1;
    Z64_CHILD = AgeOrForm.HUMAN;
    Z64_ADULT = AgeOrForm.HUMAN;
    Z64_TITLE_SCREEN_FORM = AgeOrForm.HUMAN;
    Z64_MANIFEST = new MMManifest();
    Z64_ADULT_ZOBJ_DMA = 654;
    Z64_CHILD_ZOBJ_DMA = 654;
}

export function markAsRandomizer(){
    Z64_IS_RANDOMIZER = true;
}