import { Z64LibSupportedGames } from "Z64Lib/API/Z64LibSupportedGames";
import { OOT_ANIM_BANK_DMA, OOT_ANIM_BANK_SIZE } from "./OotAliases";
import { DMAIndex, Game } from "./Types";

export let Z64_ANIM_BANK_DMA: DMAIndex = 0;
export let Z64_ANIM_BANK_SIZE: number = 0;
export let Z64_IS_RANDOMIZER: boolean = false;
export let Z64_GAME: Game;

export function setupOot(){
    Z64_ANIM_BANK_DMA = OOT_ANIM_BANK_DMA;
    Z64_ANIM_BANK_SIZE = OOT_ANIM_BANK_SIZE;
    Z64_GAME = Z64LibSupportedGames.OCARINA_OF_TIME;
}

export function setupMM(){
}

export function markAsRandomizer(){
    Z64_IS_RANDOMIZER = true;
}