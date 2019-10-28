import {
  SCENE_ARR_SIZE,
  EVENT_ARR_SIZE,
  ITEM_FLAG_ARR_SIZE,
  INF_ARR_SIZE,
  SKULLTULA_ARR_SIZE,
} from './OotOnline';
import {
  IKeySave,
  KeySave,
  IDungeonItemSave,
  OotoDungeonItemContext,
  InventorySave,
  EquipmentSave,
  QuestSave,
} from './data/OotoSaveData';

export class OotOnlineStorageBase {
  constructor() {
    for (let i = 0; i < this.keyCache.length; i++) {
      this.keyCache[i] = new KeySave(i, 0xff);
    }
    console.log(
      'Initalized key storage with ' + this.keyCache.length + ' entries.'
    );
  }

  sceneStorage: Buffer = Buffer.alloc(SCENE_ARR_SIZE);
  eventStorage: Buffer = Buffer.alloc(EVENT_ARR_SIZE);
  itemFlagStorage: Buffer = Buffer.alloc(ITEM_FLAG_ARR_SIZE);
  infStorage: Buffer = Buffer.alloc(INF_ARR_SIZE);
  skulltulaStorage: Buffer = Buffer.alloc(SKULLTULA_ARR_SIZE);
  playerModelCache: any = {};
  keyCache: IKeySave[] = new Array<IKeySave>(0x14);
  dungeonItemStorage: IDungeonItemSave = new OotoDungeonItemContext();
  inventoryStorage: InventorySave = new InventorySave();
  equipmentStorage: EquipmentSave = new EquipmentSave();
  questStorage: QuestSave = new QuestSave();
}
