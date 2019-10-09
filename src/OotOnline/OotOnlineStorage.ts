import { EquipmentSave, InventorySave, QuestSave } from './data/OotoSaveData';
import { EquestrianStorage } from './data/eponaPuppet/EquestrianStorage';
import { SCENE_ARR_SIZE, EVENT_ARR_SIZE, ITEM_FLAG_ARR_SIZE, INF_ARR_SIZE, SKULLTULA_ARR_SIZE } from './OotOnline';

export class OotOnlineStorage {
  networkPlayerInstances: any = {};
  players: any = {};
  inventoryStorage: InventorySave = new InventorySave();
  equipmentStorage: EquipmentSave = new EquipmentSave();
  questStorage: QuestSave = new QuestSave();
  sceneStorage: Buffer = Buffer.alloc(SCENE_ARR_SIZE);
  saveGameSetup = false;
  eventStorage: Buffer = Buffer.alloc(EVENT_ARR_SIZE);
  itemFlagStorage: Buffer = Buffer.alloc(ITEM_FLAG_ARR_SIZE);
  infStorage: Buffer = Buffer.alloc(INF_ARR_SIZE);
  skulltulaStorage: Buffer = Buffer.alloc(SKULLTULA_ARR_SIZE);
  horses: EquestrianStorage = new EquestrianStorage();
}
