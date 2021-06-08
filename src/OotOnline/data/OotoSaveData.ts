import { parseFlagChanges } from "@OotOnline/parseFlagChanges";
import { Z64OnlineEvents, Z64_SaveDataItemSet } from "@OotOnline/Z64API/OotoAPI";
import { bus } from "modloader64_api/EventHandler";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { IInventoryCounts, IInventoryFields, InventoryItem, IOOTCore, ISaveContext, SceneStruct } from "modloader64_api/OOT/OOTAPI";
import { ProxySide } from "modloader64_api/SidedProxy/SidedProxy";
import { OOTO_PRIVATE_EVENTS } from "./InternalAPI";

export interface Save extends Pick<ISaveContext, 'death_counter' | 'heart_containers' | 'magic_meter_size' | 'swords' | 'shields'
  | 'tunics' | 'boots' | 'questStatus' | 'magic_beans_purchased' | 'poe_collector_score' | 'permSceneData' | 'eventFlags' | 'itemFlags' | 'infTable' | 'skulltulaFlags'> {
  inventory: Inventory;
  dungeon_items: Buffer;
}

export interface KeyRing {
  keys: Buffer;
}

export interface Inventory extends IInventoryFields, Pick<IInventoryCounts, 'magicBeansCount'> {
}

export class OotOSaveData {

  private core: IOOTCore;
  private ModLoader: IModLoaderAPI;
  hash: string = "";

  constructor(core: IOOTCore, ModLoader: IModLoaderAPI) {
    this.core = core;
    this.ModLoader = ModLoader;
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
      'poe_collector_score',
      "permSceneData",
      "eventFlags",
      "itemFlags",
      "infTable",
      "skulltulaFlags",
      "double_defense",
      "dungeon_items"
    ];
    obj = JSON.parse(JSON.stringify(this.core.save));
    obj['permSceneData'] = this.core.save.permSceneData;
    obj['eventFlags'] = this.core.save.eventFlags;
    obj['itemFlags'] = this.core.save.itemFlags;
    obj['infTable'] = this.core.save.infTable;
    obj['skulltulaFlags'] = this.core.save.skulltulaFlags;
    obj['dungeon_items'] = this.core.save.dungeonItemManager.getRawBuffer();
    obj["inventory"]["magicBeansCount"] = this.core.save.inventory.magicBeansCount;
    let obj2: any = {};
    for (let i = 0; i < keys.length; i++) {
      obj2[keys[i]] = obj[keys[i]];
    }
    return obj2 as Save;
  }

  createKeyRing(): KeyRing {
    let obj = { keys: this.core.save.keyManager.getRawKeyBuffer() } as KeyRing;
    return obj;
  }

  processKeyRing(keys: KeyRing, storage: KeyRing, side: ProxySide) {
    for (let i = 0; i < keys.keys.byteLength; i++) {
      if (side === ProxySide.CLIENT) {
        if (this.isNotEqual(keys.keys[i], this.core.save.keyManager.getKeyCountForIndex(i))) {
          this.core.save.keyManager.setKeyCountByIndex(i, keys.keys[i]);
          this.ModLoader.privateBus.emit(OOTO_PRIVATE_EVENTS.UPDATE_KEY_HASH, {});
          bus.emit(Z64OnlineEvents.SAVE_DATA_ITEM_SET, new Z64_SaveDataItemSet(i.toString(), keys.keys[i]));
        }
      } else {
        if (this.isNotEqual(keys.keys[i], storage.keys[i])) {
          storage.keys[i] = keys.keys[i];
        }
      }
    }
  }

  processKeyRing_OVERWRITE(keys: KeyRing, storage: KeyRing, side: ProxySide) {
    for (let i = 0; i < keys.keys.byteLength; i++) {
      if (side === ProxySide.CLIENT) {
        this.core.save.keyManager.setKeyCountByIndex(i, keys.keys[i]);
        this.ModLoader.privateBus.emit(OOTO_PRIVATE_EVENTS.UPDATE_KEY_HASH, {});
      }
    }
  }

  createSave(): Buffer {
    let obj = this.generateWrapper();
    let buf = Buffer.from(JSON.stringify(obj));
    this.hash = this.ModLoader.utils.hashBuffer(buf);
    return buf;
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

  private processBoolLoop_OVERWRITE(obj1: any, obj2: any) {
    Object.keys(obj1).forEach((key: string) => {
      if (typeof (obj1[key]) === 'boolean') {
        obj2[key] = obj1[key];
      }
    });
  }

  private processMixedLoop_OVERWRITE(obj1: any, obj2: any, blacklist: Array<string>) {
    Object.keys(obj1).forEach((key: string) => {
      if (blacklist.indexOf(key) > -1) return;
      if (typeof (obj1[key]) === 'boolean') {
        obj2[key] = obj1[key];
      } else if (typeof (obj1[key]) === 'number') {
        obj2[key] = obj1[key];
      }
    });
  }

  private isGreaterThan(obj1: number, obj2: number) {
    if (obj1 === 255) obj1 = 0;
    if (obj2 === 255) obj2 = 0;
    return (obj1 > obj2);
  }

  private isNotEqual(obj1: number, obj2: number) {
    if (obj1 === 255) obj1 = 0;
    if (obj2 === 255) obj2 = 0;
    return (obj1 !== obj2);
  }

  forceOverrideSave(save: Buffer, storage: Save, side: ProxySide) {
    this.ModLoader.privateBus.emit(OOTO_PRIVATE_EVENTS.LOCK_ITEM_NOTIFICATIONS, {});
    let obj: Save = JSON.parse(save.toString());

    storage.death_counter = obj.death_counter;
    storage.heart_containers = obj.heart_containers;
    storage.magic_meter_size = obj.magic_meter_size;
    storage.magic_beans_purchased = obj.magic_beans_purchased;
    storage.inventory.magicBeansCount = obj.inventory.magicBeansCount;
    storage.poe_collector_score = obj.poe_collector_score;

    this.processBoolLoop_OVERWRITE(obj.swords, storage.swords);
    this.processBoolLoop_OVERWRITE(obj.shields, storage.shields);
    this.processBoolLoop_OVERWRITE(obj.tunics, storage.tunics);
    this.processBoolLoop_OVERWRITE(obj.boots, storage.boots);
    this.processMixedLoop_OVERWRITE(obj.questStatus, storage.questStatus, []);

    storage.inventory.bottle_1 = obj.inventory.bottle_1;
    storage.inventory.bottle_2 = obj.inventory.bottle_2;
    storage.inventory.bottle_3 = obj.inventory.bottle_3;
    storage.inventory.bottle_4 = obj.inventory.bottle_4;

    this.processMixedLoop_OVERWRITE(obj.inventory, storage.inventory, ["bottle_1", "bottle_2", "bottle_3", "bottle_4", "childTradeItem", "adultTradeItem"]);

    storage.inventory.childTradeItem = obj.inventory.childTradeItem;
    storage.inventory.adultTradeItem = obj.inventory.adultTradeItem;

    storage.poe_collector_score = obj.poe_collector_score;

    storage.permSceneData = obj.permSceneData;
    storage.eventFlags = obj.eventFlags;
    storage.itemFlags = obj.itemFlags;
    storage.infTable = obj.infTable;
    storage.skulltulaFlags = obj.skulltulaFlags;

    if (side === ProxySide.CLIENT) {
      this.core.save.dungeonItemManager.setRawBuffer(obj.dungeon_items);
    }
  }

  mergeSave(save: Buffer, storage: Save, side: ProxySide) {
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
    if (obj.poe_collector_score > storage.poe_collector_score) {
      storage.poe_collector_score = obj.poe_collector_score;
    }
    this.processBoolLoop(obj.swords, storage.swords);
    this.processBoolLoop(obj.shields, storage.shields);
    this.processBoolLoop(obj.tunics, storage.tunics);
    this.processBoolLoop(obj.boots, storage.boots);
    this.processMixedLoop(obj.questStatus, storage.questStatus, []);

    if (obj.inventory.bottle_1 === InventoryItem.NONE && storage.inventory.bottle_1 !== InventoryItem.NONE) {
      obj.inventory.bottle_1 = storage.inventory.bottle_1;
    }

    if (obj.inventory.bottle_2 === InventoryItem.NONE && storage.inventory.bottle_2 !== InventoryItem.NONE) {
      obj.inventory.bottle_2 = storage.inventory.bottle_2;
    }

    if (obj.inventory.bottle_3 === InventoryItem.NONE && storage.inventory.bottle_3 !== InventoryItem.NONE) {
      obj.inventory.bottle_3 = storage.inventory.bottle_3;
    }

    if (obj.inventory.bottle_4 === InventoryItem.NONE && storage.inventory.bottle_4 !== InventoryItem.NONE) {
      obj.inventory.bottle_4 = storage.inventory.bottle_4;
    }

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

    if (side === ProxySide.CLIENT) {
      let cur = this.core.save.dungeonItemManager.getRawBuffer();
      parseFlagChanges(obj.dungeon_items, cur);
      this.core.save.dungeonItemManager.setRawBuffer(cur);
      bus.emit(Z64OnlineEvents.ON_INVENTORY_UPDATE, {});
    } else {
      parseFlagChanges(obj.dungeon_items, storage.dungeon_items);
    }
  }

  applySave(save: Buffer) {
    this.mergeSave(save, this.core.save as any, ProxySide.CLIENT);
  }

}