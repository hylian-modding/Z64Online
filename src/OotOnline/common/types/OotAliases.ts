import { IInventoryCounts, IInventoryFields, ISaveContext } from "modloader64_api/OOT/OOTAPI";

export type IOOTSaveContext = ISaveContext;
export type IOOTInventoryFields = IInventoryFields;
export type IOOTInventoryCounts = IInventoryCounts;

export interface IOOTInventorySync extends IOOTInventoryFields, Pick<IOOTInventoryCounts, 'magicBeansCount'> {
}

export interface IOOTSyncSave extends Pick<IOOTSaveContext, 'death_counter' | 'heart_containers' | 'magic_meter_size' | 'swords' | 'shields'
  | 'tunics' | 'boots' | 'questStatus' | 'magic_beans_purchased' | 'poe_collector_score' | 'permSceneData' | 'eventFlags' | 'itemFlags' | 'infTable' | 'skulltulaFlags'> {
  inventory: IOOTInventorySync;
  dungeon_items: Buffer;
}