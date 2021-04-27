import { Z64OnlineEvents, Z64_SaveDataItemSet } from "@OotOnline/Z64API/OotoAPI";
import { bus } from "modloader64_api/EventHandler";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { InventoryItem, IOOTCore, SceneStruct } from "modloader64_api/OOT/OOTAPI";

export interface Save {
  death_counter: number;
  heart_containers: number;
  magic_meter_size: number;
  swords: Swords;
  shields: Shields;
  tunics: Tunics;
  boots: Boots;
  inventory: Inventory;
  questStatus: QuestStatus;
  magic_beans_purchased: number;
  permSceneData: Buffer;
  eventFlags: Buffer;
  itemFlags: Buffer;
  infTable: Buffer;
  skulltulaFlags: Buffer;
}

export interface Swords {
  kokiriSword: boolean;
  masterSword: boolean;
  giantKnife: boolean;
  biggoronSword: boolean;
}

export interface Shields {
  dekuShield: boolean;
  hylianShield: boolean;
  mirrorShield: boolean;
}

export interface Tunics {
  kokiriTunic: boolean;
  goronTunic: boolean;
  zoraTunic: boolean;
}

export interface Boots {
  kokiriBoots: boolean;
  ironBoots: boolean;
  hoverBoots: boolean;
}

export interface Inventory {
  dekuSticks: boolean;
  dekuNuts: boolean;
  bombs: boolean;
  bombchus: boolean;
  magicBeans: boolean;
  fairySlingshot: boolean;
  fairyBow: boolean;
  fireArrows: boolean;
  iceArrows: boolean;
  lightArrows: boolean;
  dinsFire: boolean;
  faroresWind: boolean;
  nayrusLove: boolean;
  ocarina: number;
  hookshot: number;
  boomerang: boolean;
  lensOfTruth: boolean;
  megatonHammer: boolean;
  bottle_1: number;
  bottle_2: number;
  bottle_3: number;
  bottle_4: number;
  childTradeItem: number;
  adultTradeItem: number;
  wallet: number;
  quiver: number;
  bulletBag: number;
  bombBag: number;
  dekuNutsCapacity: number;
  dekuSticksCapacity: number;
  swimming: number;
  strength: number;
  magicBeansCount: number;
}

export interface QuestStatus {
  gerudoMembershipCard: boolean;
  stoneOfAgony: boolean;
  displayGoldSkulltulas: boolean;
  goldSkulltulas: number;
  heartPieces: number;
  zeldasLullaby: boolean;
  eponasSong: boolean;
  sariasSong: boolean;
  sunsSong: boolean;
  songOfTime: boolean;
  songOfStorms: boolean;
  preludeOfLight: boolean;
  minuetOfForest: boolean;
  boleroOfFire: boolean;
  serenadeOfWater: boolean;
  nocturneOfShadow: boolean;
  requiemOfSpirit: boolean;
  lightMedallion: boolean;
  forestMedallion: boolean;
  waterMedallion: boolean;
  fireMedallion: boolean;
  spiritMedallion: boolean;
  shadowMedallion: boolean;
  kokiriEmerald: boolean;
  goronRuby: boolean;
  zoraSapphire: boolean;
}

export class OotOSaveData {

  private core: IOOTCore;
  heart_containers!: number;

  constructor(core: IOOTCore, ModLoader: IModLoaderAPI) {
    this.core = core;
  }

  private generateWrapper(): Save {
    let obj: any = {};
    let keys = [
      'death_counter',
      'heart_containers',
      'magic_meter_size',
      'swords',
      'shields',
      'tunics',
      'boots',
      'inventory',
      'questStatus',
      'magic_beans_purchased',
      "permSceneData",
      "eventFlags",
      "itemFlags",
      "infTable",
      "skulltulaFlags",
      "double_defense"
    ];
    obj = JSON.parse(JSON.stringify(this.core.save));
    obj['permSceneData'] = this.core.save.permSceneData;
    obj['eventFlags'] = this.core.save.eventFlags;
    obj['itemFlags'] = this.core.save.itemFlags;
    obj['infTable'] = this.core.save.infTable;
    obj['skulltulaFlags'] = this.core.save.skulltulaFlags;
    obj['dungeonItemManager'] = JSON.parse(JSON.stringify(this.core.save.dungeonItemManager));
    let obj2: any = {};
    for (let i = 0; i < keys.length; i++) {
      obj2[keys[i]] = obj[keys[i]];
    }
    return obj2 as Save;
  }

  createSave(): Buffer {
    let obj = this.generateWrapper();
    return Buffer.from(JSON.stringify(obj));
  }

  private processBoolLoop(obj1: any, obj2: any) {
    Object.keys(obj1).forEach((key: string) => {
      if (typeof (obj1[key]) === 'boolean') {
        if (obj1[key] === true && obj2[key] === false) {
          obj2[key] = true;
          bus.emit(Z64OnlineEvents.SAVE_DATA_ITEM_SET, new Z64_SaveDataItemSet(key, obj2[key]));
        }
      }
    });
  }

  private processMixedLoop(obj1: any, obj2: any, blacklist: Array<string>) {
    Object.keys(obj1).forEach((key: string) => {
      if (blacklist.indexOf(key) > -1) return;
      if (typeof (obj1[key]) === 'boolean') {
        if (obj1[key] === true && obj2[key] === false) {
          obj2[key] = obj1[key];
          bus.emit(Z64OnlineEvents.SAVE_DATA_ITEM_SET, new Z64_SaveDataItemSet(key, obj2[key]));
        }
      } else if (typeof (obj1[key]) === 'number') {
        if (obj1[key] > obj2[key]) {
          obj2[key] = obj1[key];
          bus.emit(Z64OnlineEvents.SAVE_DATA_ITEM_SET, new Z64_SaveDataItemSet(key, obj2[key]));
        }
      }
    });
  }

  private isGreaterThan(obj1: number, obj2: number) {
    if (obj1 === 255) obj1 = 0;
    if (obj2 === 255) obj2 = 0;
    return (obj1 > obj2);
  }

  mergeSave(save: Buffer, storage: Save) {
    let obj: Save = JSON.parse(save.toString());
    if (obj.death_counter > storage.death_counter) {
      storage.death_counter = obj.death_counter;
    }
    if (obj.heart_containers > storage.heart_containers) {
      storage.heart_containers = obj.heart_containers;
      bus.emit(Z64OnlineEvents.GAINED_PIECE_OF_HEART, {});
    }
    if (obj.magic_meter_size > storage.magic_meter_size) {
      storage.magic_meter_size = obj.magic_meter_size;
      bus.emit(Z64OnlineEvents.MAGIC_METER_INCREASED, storage.magic_meter_size);
    }
    if (obj.magic_beans_purchased > storage.magic_beans_purchased) {
      storage.magic_beans_purchased = obj.magic_beans_purchased;
    }
    if (obj.inventory.magicBeansCount !== storage.inventory.magicBeansCount) {
      storage.inventory.magicBeansCount = obj.inventory.magicBeansCount;
    }
    this.processBoolLoop(obj.swords, storage.swords);
    this.processBoolLoop(obj.shields, storage.shields);
    this.processBoolLoop(obj.tunics, storage.tunics);
    this.processBoolLoop(obj.boots, storage.boots);
    this.processMixedLoop(obj.questStatus, storage.questStatus, []);

    this.processMixedLoop(obj.inventory, storage.inventory, ["bottle_1", "bottle_2", "bottle_3", "bottle_4", "childTradeItem", "adultTradeItem"]);

    if (storage.questStatus.heartPieces >= 3 && obj.questStatus.heartPieces === 0) {
      storage.questStatus.heartPieces = 0;
    }

    if (obj.inventory.childTradeItem !== InventoryItem.SOLD_OUT) {
      if (this.isGreaterThan(obj.inventory.childTradeItem, storage.inventory.childTradeItem)) {
        storage.inventory.childTradeItem = obj.inventory.childTradeItem;
      }
    }

    if (obj.inventory.adultTradeItem !== InventoryItem.SOLD_OUT) {
      if (this.isGreaterThan(obj.inventory.adultTradeItem, storage.inventory.adultTradeItem)) {
        storage.inventory.adultTradeItem = obj.inventory.adultTradeItem;
      }
    }

    let permSceneData = storage.permSceneData;
    let eventFlags = storage.eventFlags;
    let itemFlags = storage.itemFlags;
    let infTable = storage.infTable;
    let skulltulaFlags = storage.skulltulaFlags;

    for (let i = 0; i < obj.permSceneData.byteLength; i += 0x1C) {
      let struct = new SceneStruct(obj.permSceneData.slice(i, i + 0x1C));
      let cur = new SceneStruct(permSceneData.slice(i, i + 0x1C));
      for (let j = 0; j < struct.chests.byteLength; j++) {
        if (struct.chests[j] !== cur.chests[i]) {
          cur.chests[j] |= struct.chests[j];
        }
      }
      for (let j = 0; j < struct.collectible.byteLength; j++) {
        if (struct.collectible[j] !== cur.collectible[i]) {
          cur.collectible[j] |= struct.collectible[j];
        }
      }
      for (let j = 0; j < struct.room_clear.byteLength; j++) {
        if (struct.room_clear[j] !== cur.room_clear[i]) {
          cur.room_clear[j] |= struct.room_clear[j];
        }
      }
      for (let j = 0; j < struct.switches.byteLength; j++) {
        if (struct.switches[j] !== cur.switches[i]) {
          cur.switches[j] |= struct.switches[j];
        }
      }
      for (let j = 0; j < struct.visited_floors.byteLength; j++) {
        if (struct.visited_floors[j] !== cur.visited_floors[i]) {
          cur.visited_floors[j] |= struct.visited_floors[j];
        }
      }
      for (let j = 0; j < struct.visited_rooms.byteLength; j++) {
        if (struct.visited_rooms[j] !== cur.visited_rooms[i]) {
          cur.visited_rooms[j] |= struct.visited_rooms[j];
        }
      }
      for (let j = 0; j < struct.unused.byteLength; j++) {
        if (struct.unused[j] !== cur.unused[i]) {
          cur.unused[j] = struct.unused[j];
        }
      }
    }
    for (let i = 0; i < obj.eventFlags.byteLength; i++) {
      let value = obj.eventFlags.readUInt8(i);
      if (eventFlags[i] !== value) {
        eventFlags[i] |= value;
      }
    }
    for (let i = 0; i < obj.itemFlags.byteLength; i++) {
      let value = obj.itemFlags.readUInt8(i);
      if (itemFlags[i] !== value) {
        itemFlags[i] |= value;
      }
    }
    for (let i = 0; i < obj.infTable.byteLength; i++) {
      let value = obj.infTable.readUInt8(i);
      if (infTable[i] !== value) {
        infTable[i] |= value;
      }
    }
    for (let i = 0; i < obj.skulltulaFlags.byteLength; i++) {
      let value = obj.skulltulaFlags.readUInt8(i);
      if (skulltulaFlags[i] !== value) {
        skulltulaFlags[i] |= value;
      }
    }

    storage.permSceneData = permSceneData;
    storage.eventFlags = eventFlags;
    storage.itemFlags = itemFlags;
    storage.infTable = infTable;
    storage.skulltulaFlags = skulltulaFlags;
  }

  applySave(save: Buffer) {
    this.mergeSave(save, this.core.save);
  }

}