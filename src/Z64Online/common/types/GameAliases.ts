import { OOTManifest } from "Z64Lib/API/OoT/ModelData/OOTManfest";
import { OOT_ANIM_BANK_DMA, OOT_ANIM_BANK_SIZE } from "./OotAliases";
import { AgeOrForm, DMAIndex, Manifest } from "./Types";
import { MMManifest } from 'Z64Lib/API/MM/ModelData/MMManfest';
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { Z64_GAME } from "Z64Lib/src/Common/types/GameAliases";
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";

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
export let Z64_OBJECT_TABLE_RAM: number = 0;
export let Z64_PLAYER_PROXY: Buffer;

export function setupOot(){
    Z64_ANIM_BANK_DMA = OOT_ANIM_BANK_DMA;
    Z64_ANIM_BANK_SIZE = OOT_ANIM_BANK_SIZE;
    Z64_CHILD = AgeOrForm.CHILD;
    Z64_ADULT = AgeOrForm.ADULT;
    Z64_TITLE_SCREEN_FORM = AgeOrForm.ADULT;
    Z64_MANIFEST = new OOTManifest();
    Z64_ADULT_ZOBJ_DMA = 502;
    Z64_CHILD_ZOBJ_DMA = 503;
    Z64_OBJECT_TABLE_RAM = 0x801D9C44;
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
    Z64_OBJECT_TABLE_RAM = 0x803FE8A8;
}

export function markAsRandomizer(){
    Z64_IS_RANDOMIZER = true;
}

export function setPlayerProxy(buf: Buffer){
    Z64_PLAYER_PROXY = buf;
}

export function getAgeOrForm(core: IZ64Main): AgeOrForm{
    return core.OOT !== undefined ? core.OOT!.save.age : core.MM!.save.form;
}

export function getChildID(): AgeOrForm{
    return Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME ? AgeOrForm.CHILD : AgeOrForm.HUMAN
}

export function getAdultID(): AgeOrForm{
    return Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME ? AgeOrForm.ADULT : AgeOrForm.HUMAN
}