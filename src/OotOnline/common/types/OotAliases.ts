import { IInventoryCounts, IInventoryFields, ISaveContext } from "modloader64_api/OOT/OOTAPI";
import { Z64LibSupportedGames } from "Z64Lib/API/Z64LibSupportedGames";
import { DMAIndex } from "./Types";

export type IOOTSaveContext = ISaveContext;
export type IOOTInventoryFields = IInventoryFields;
export type IOOTInventoryCounts = IInventoryCounts;

export interface IOOTInventorySync extends IOOTInventoryFields, Pick<IOOTInventoryCounts, 'magicBeansCount'> {
}

export interface IOOTSyncSave extends Pick<IOOTSaveContext, 'death_counter' | 'heart_containers' | 'magic_meter_size' | 'swords' | 'shields'
  | 'tunics' | 'boots' | 'questStatus' | 'magic_beans_purchased' | 'poe_collector_score' | 'permSceneData' | 'eventFlags' | 'itemFlags'
  | 'infTable' | 'skulltulaFlags' | 'scarecrowsSongChildFlag' | 'scarecrowsSong' | 'checksum'> {
  inventory: IOOTInventorySync;
  dungeon_items: Buffer;
  triforcePieces: number;
}

export const OOT_ANIM_BANK_DMA: DMAIndex = 7;
export const OOT_ANIM_BANK_SIZE: number = 0x265c30;
export const OOT_GAME: Z64LibSupportedGames = Z64LibSupportedGames.OCARINA_OF_TIME;