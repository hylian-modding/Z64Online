import { IInventoryCounts, IInventoryFields, ISaveContext } from "Z64Lib/API/MM/MMAPI";
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { DMAIndex } from "./Types";

export type IMMSaveContext = ISaveContext;
export type IMMInventoryFields = IInventoryFields;
export type IMMInventoryCounts = IInventoryCounts;

export interface IMMInventorySync extends IMMInventoryFields, Pick<IMMInventoryCounts, 'magicBeansCount'> {
}

export interface IMMSyncSave extends Pick<IMMSaveContext, 'map_visible' | 'map_visited' | 'heart_containers' | 'double_defense' | 'magic_meter_size' | 'swords' | 'shields'
  | 'questStatus' | 'checksum' | 'owlStatues' | 'minimap_flags' | 'stray' | 'skull' | 'bank' 
  | 'lottery_numbers_day1' | 'lottery_numbers_day2' | 'lottery_numbers_day3' | 'spider_house_mask_order' | 'bomber_code'> {
  inventory: IMMInventorySync;
  dungeon_items: Buffer;
}

export const MM_ANIM_BANK_DMA: DMAIndex = 7;
export const MM_ANIM_BANK_SIZE: number = 0x2F9DA0;
export const MM_GAME: Z64LibSupportedGames = Z64LibSupportedGames.MAJORAS_MASK;