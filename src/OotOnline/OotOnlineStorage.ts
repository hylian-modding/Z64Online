import {
  EquipmentSave,
  InventorySave,
  QuestSave,
  IDungeonItemSave,
  OotoDungeonItemContext,
} from './data/OotoSaveData';
import { EquestrianStorage } from './data/eponaPuppet/EquestrianStorage';
import { OotOnlineStorageBase } from './OotOnlineStorageBase';

export class OotOnlineStorage extends OotOnlineStorageBase {
  networkPlayerInstances: any = {};
  players: any = {};
  inventoryStorage: InventorySave = new InventorySave();
  equipmentStorage: EquipmentSave = new EquipmentSave();
  questStorage: QuestSave = new QuestSave();
  saveGameSetup = false;
  horses: EquestrianStorage = new EquestrianStorage();
  dungeonItemStorage: IDungeonItemSave = new OotoDungeonItemContext();
}
