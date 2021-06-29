import { IOOTSyncSave } from "@OotOnline/common/types/OotAliases";
import { IKeyRing } from "@OotOnline/common/save/IKeyRing";
import { parseFlagChanges } from "@OotOnline/common/lib/parseFlagChanges";
import { Z64OnlineEvents, Z64_SaveDataItemSet } from "@OotOnline/Z64API/OotoAPI";
import { bus } from "modloader64_api/EventHandler";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { InventoryItem, IOOTCore, SceneStruct, ScarecrowSongNoteStruct } from "modloader64_api/OOT/OOTAPI";
import { ProxySide } from "modloader64_api/SidedProxy/SidedProxy";
import { OOTO_PRIVATE_EVENTS } from "./InternalAPI";
import { ISaveSyncData } from "@OotOnline/common/save/ISaveSyncData";
import { TriforceHuntHelper } from "@OotOnline/compat/OotR";
import { IOOTSyncSaveServer } from "@OotOnline/OotOnlineStorage";
import bitwise from 'bitwise';

const USELESS_MASK: Array<InventoryItem> = [InventoryItem.GERUDO_MASK, InventoryItem.ZORA_MASK, InventoryItem.GORON_MASK];
const ALL_MASKS: Array<InventoryItem> = [InventoryItem.KEATON_MASK, InventoryItem.SKULL_MASK, InventoryItem.SPOOKY_MASK, InventoryItem.BUNNY_HOOD, InventoryItem.MASK_OF_TRUTH, InventoryItem.GERUDO_MASK, InventoryItem.ZORA_MASK, InventoryItem.GORON_MASK];

export class OotOSaveData implements ISaveSyncData {

  private core: IOOTCore;
  private ModLoader: IModLoaderAPI;
  hash: string = "";

  constructor(core: IOOTCore, ModLoader: IModLoaderAPI) {
    this.core = core;
    this.ModLoader = ModLoader;
  }

  private generateWrapper(): IOOTSyncSave {
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
      "dungeon_items",
      "triforcePieces",
      'scarecrowsSongChildFlag',
      "scarecrowsSong",
      'checksum'
    ];
    obj = JSON.parse(JSON.stringify(this.core.save));
    obj['permSceneData'] = this.core.save.permSceneData;
    obj['eventFlags'] = this.core.save.eventFlags;
    obj['itemFlags'] = this.core.save.itemFlags;
    obj['infTable'] = this.core.save.infTable;
    obj['skulltulaFlags'] = this.core.save.skulltulaFlags;
    obj['dungeon_items'] = this.core.save.dungeonItemManager.getRawBuffer();
    obj['scarecrowsSongChildFlag'] = this.core.save.scarecrowsSongChildFlag;
    obj['scarecrowsSong'] = this.core.save.scarecrowsSong;
    obj["inventory"]["magicBeansCount"] = this.core.save.inventory.magicBeansCount;
    obj["triforcePieces"] = TriforceHuntHelper.getTriforcePieces(this.ModLoader);
    let obj2: any = {};
    for (let i = 0; i < keys.length; i++) {
      obj2[keys[i]] = obj[keys[i]];
    }
    return obj2 as IOOTSyncSave;
  }

  createKeyRing(): IKeyRing {
    let obj = { keys: this.core.save.keyManager.getRawKeyBuffer() } as IKeyRing;
    return obj;
  }

  processKeyRing(keys: IKeyRing, storage: IKeyRing, side: ProxySide) {
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

  processKeyRing_OVERWRITE(keys: IKeyRing, storage: IKeyRing, side: ProxySide) {
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

  forceOverrideSave(save: Buffer, storage: IOOTSyncSave, side: ProxySide) {
    try {
      this.ModLoader.privateBus.emit(OOTO_PRIVATE_EVENTS.LOCK_ITEM_NOTIFICATIONS, {});
      let obj: IOOTSyncSave = JSON.parse(save.toString());

      storage.death_counter = obj.death_counter;
      storage.heart_containers = obj.heart_containers;
      storage.magic_meter_size = obj.magic_meter_size;
      storage.magic_beans_purchased = obj.magic_beans_purchased;
      storage.inventory.magicBeansCount = obj.inventory.magicBeansCount;

      this.processBoolLoop_OVERWRITE(obj.swords, storage.swords);
      this.processBoolLoop_OVERWRITE(obj.shields, storage.shields);
      this.processBoolLoop_OVERWRITE(obj.tunics, storage.tunics);
      this.processBoolLoop_OVERWRITE(obj.boots, storage.boots);
      this.processMixedLoop_OVERWRITE(obj.questStatus, storage.questStatus, []);
      this.processMixedLoop_OVERWRITE(obj.inventory, storage.inventory, []);

      storage.poe_collector_score = obj.poe_collector_score;

      storage.permSceneData = obj.permSceneData;
      storage.eventFlags = obj.eventFlags;
      storage.itemFlags = obj.itemFlags;
      storage.infTable = obj.infTable;
      storage.skulltulaFlags = obj.skulltulaFlags;
      storage.scarecrowsSongChildFlag = obj.scarecrowsSongChildFlag;
      storage.scarecrowsSong = obj.scarecrowsSong;

      if (side === ProxySide.CLIENT) {
        this.core.save.dungeonItemManager.setRawBuffer(obj.dungeon_items);
        TriforceHuntHelper.setTriforcePieces(this.ModLoader, obj.triforcePieces);
      }
    } catch (err) {
      console.log(err.stack);
    }
  }

  isMask(item: InventoryItem) {

  }

  mergeSave(save: Buffer, storage: IOOTSyncSave, side: ProxySide, syncMasks: boolean = true) {
    try {
      let obj: IOOTSyncSave = JSON.parse(save.toString());

      // Another title screen safety check.
      if (obj.checksum === 0) {
        return;
      }

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
  
      if (obj.inventory.bottle_1 !== InventoryItem.NONE && storage.inventory.bottle_1 === InventoryItem.NONE) {
        storage.inventory.bottle_1 = obj.inventory.bottle_1;
      }
  
      if (obj.inventory.bottle_2 !== InventoryItem.NONE && storage.inventory.bottle_2 === InventoryItem.NONE) {
        storage.inventory.bottle_2 = obj.inventory.bottle_2;
      }
  
      if (obj.inventory.bottle_3 !== InventoryItem.NONE && storage.inventory.bottle_3 === InventoryItem.NONE) {
        storage.inventory.bottle_3 = obj.inventory.bottle_3;
      }
  
      if (obj.inventory.bottle_4 !== InventoryItem.NONE && storage.inventory.bottle_4 === InventoryItem.NONE) {
        storage.inventory.bottle_4 = obj.inventory.bottle_4;
      }

      this.processMixedLoop(obj.inventory, storage.inventory, ["bottle_1", "bottle_2", "bottle_3", "bottle_4", "childTradeItem", "adultTradeItem"]);

      if (storage.questStatus.heartPieces >= 3 && obj.questStatus.heartPieces === 0) {
        storage.questStatus.heartPieces = 0;
      }

      if (obj.inventory.childTradeItem !== InventoryItem.SOLD_OUT) {
        let shouldSync = true;
        if (ALL_MASKS.indexOf(obj.inventory.childTradeItem) > -1) {
          if (!syncMasks) {
            shouldSync = false;
          }
          if (USELESS_MASK.indexOf(obj.inventory.childTradeItem) > -1) {
            shouldSync = false;
          }
        }
        if (shouldSync) {
          if (this.isGreaterThan(obj.inventory.childTradeItem, storage.inventory.childTradeItem)) {
            storage.inventory.childTradeItem = obj.inventory.childTradeItem;
          }
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
      let scarecrowsSong = storage.scarecrowsSong;

      let backupTriforcePieces: number | undefined;

      if (side === ProxySide.CLIENT) {
        backupTriforcePieces = TriforceHuntHelper.getTriforcePieces(this.ModLoader);
      }

      for (let i = 0; i < obj.permSceneData.byteLength; i += 0x1C) {
        let struct = new SceneStruct(obj.permSceneData.slice(i, i + 0x1C));
        let cur = new SceneStruct(permSceneData.slice(i, i + 0x1C));
        for (let j = 0; j < struct.chests.byteLength; j++) {
          if (struct.chests[j] !== cur.chests[j]) {
            cur.chests[j] |= struct.chests[j];
          }
        }
        for (let j = 0; j < struct.collectible.byteLength; j++) {
          if (struct.collectible[j] !== cur.collectible[j]) {
            cur.collectible[j] |= struct.collectible[j];
          }
        }
        for (let j = 0; j < struct.room_clear.byteLength; j++) {
          if (struct.room_clear[j] !== cur.room_clear[j]) {
            cur.room_clear[j] |= struct.room_clear[j];
          }
        }
        for (let j = 0; j < struct.switches.byteLength; j++) {
          if (struct.switches[j] !== cur.switches[j]) {
            cur.switches[j] |= struct.switches[j];
          }
        }
        for (let j = 0; j < struct.visited_floors.byteLength; j++) {
          if (struct.visited_floors[j] !== cur.visited_floors[j]) {
            cur.visited_floors[j] |= struct.visited_floors[j];
          }
        }
        for (let j = 0; j < struct.visited_rooms.byteLength; j++) {
          if (struct.visited_rooms[j] !== cur.visited_rooms[j]) {
            cur.visited_rooms[j] |= struct.visited_rooms[j];
          }
        }
        for (let j = 0; j < struct.unused.byteLength; j++) {
          if (struct.unused[j] !== cur.unused[j]) {
            cur.unused[j] |= struct.unused[j];
          }
        }
      }
      for (let i = 0; i < obj.eventFlags.byteLength; i++) {
        let value = obj.eventFlags.readUInt8(i);
        if (eventFlags[i] !== value) {
          eventFlags[i] |= value;
        }
      }
      if (obj.eventFlags[18] > storage.eventFlags[18]) {
        bus.emit(Z64OnlineEvents.SAVE_DATA_ITEM_SET, new Z64_SaveDataItemSet('scarecrowsSongAdultFlag', obj.scarecrowsSong));
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
      if (obj.scarecrowsSongChildFlag > storage.scarecrowsSongChildFlag) {
        storage.scarecrowsSongChildFlag = obj.scarecrowsSongChildFlag;
        bus.emit(Z64OnlineEvents.SAVE_DATA_ITEM_SET, new Z64_SaveDataItemSet('scarecrowsSongChildFlag', obj.scarecrowsSong));
      }
      if (Object.values(obj.scarecrowsSong).some(v => v !== 0 && v !== null && typeof v !== "undefined") && !Object.values(scarecrowsSong).some(v => v !== 0 && v !== null && typeof v !== "undefined")) {
        for (let i = 0; i < obj.scarecrowsSong.byteLength; i += 0x8) {
          let struct = new ScarecrowSongNoteStruct(obj.scarecrowsSong.slice(i, i + 0x8));
          let cur = new ScarecrowSongNoteStruct(scarecrowsSong.slice(i, i + 0x8));
          for (let j = 0; j < struct.note.byteLength; j++) {
            if (struct.note[j] !== cur.note[j]) {
              cur.note[j] = struct.note[j];
            }
          }
          for (let j = 0; j < struct.unused.byteLength; j++) {
            if (struct.unused[j] !== cur.unused[j]) {
              cur.unused[j] = struct.unused[j];
            }
          }
          for (let j = 0; j < struct.duration.byteLength; j++) {
            if (struct.duration[j] !== cur.duration[j]) {
              if (j == 0 && struct.duration[j] > 0) { // Cap note/silence duration to 16 seconds?
                struct.duration[j] = 0;
              }
              if (j == 1 && struct.duration[j] > 16) {
                struct.duration[j] = 16;
              }
              cur.duration[j] = struct.duration[j];
            }
          }
          for (let j = 0; j < struct.volume.byteLength; j++) {
            if (struct.volume[j] !== cur.volume[j]) {
              cur.volume[j] = struct.volume[j];
            }
          }
          for (let j = 0; j < struct.vibrato.byteLength; j++) {
            if (struct.vibrato[j] !== cur.vibrato[j]) {
              cur.vibrato[j] = struct.vibrato[j];
            }
          }
          for (let j = 0; j < struct.pitch.byteLength; j++) {
            if (struct.pitch[j] !== cur.pitch[j]) {
              cur.pitch[j] = struct.pitch[j];
            }
          }
          for (let j = 0; j < struct.special.byteLength; j++) {
            if (struct.special[j] !== cur.special[j]) {
              cur.special[j] = struct.special[j];
            }
          }
        }
      }

      if (side === ProxySide.SERVER) {
        let _save = (storage as IOOTSyncSaveServer);
        if (_save.isVanilla || _save.isOotR) {
          // Correct water temple flags.
          let struct = new SceneStruct(obj.permSceneData.slice(5 * 0x1C, (5 * 0x1C) + 0x1C));
          let byte = struct.switches.readUInt8(3);
          let struct2 = new SceneStruct(storage.permSceneData.slice(5 * 0x1C, (5 * 0x1C) + 0x1C));
          struct2.switches.writeUInt8(byte, 3);
        }
      }

      if (storage.heart_containers > 20){
        storage.heart_containers = 20;
      }
  
      storage.permSceneData = permSceneData;
      storage.eventFlags = eventFlags;
      storage.itemFlags = itemFlags;
      storage.infTable = infTable;
      storage.skulltulaFlags = skulltulaFlags;
      storage.scarecrowsSong = scarecrowsSong;

      if (side === ProxySide.CLIENT) {
        let cur = this.core.save.dungeonItemManager.getRawBuffer();
        parseFlagChanges(obj.dungeon_items, cur);
        this.core.save.dungeonItemManager.setRawBuffer(cur);
        TriforceHuntHelper.setTriforcePieces(this.ModLoader, backupTriforcePieces!);
        if (TriforceHuntHelper.getTriforcePieces(this.ModLoader) < obj.triforcePieces) {
          TriforceHuntHelper.setTriforcePieces(this.ModLoader, obj.triforcePieces);
        }
        bus.emit(Z64OnlineEvents.ON_INVENTORY_UPDATE, {});
      } else {
        parseFlagChanges(obj.dungeon_items, storage.dungeon_items);
        if (obj.triforcePieces > storage.triforcePieces) {
          storage.triforcePieces = obj.triforcePieces;
        }
      }
    } catch (err) {
      console.log(err.stack);
    }

  }

  applySave(save: Buffer, syncMasks: boolean = true) {
    this.mergeSave(save, this.core.save as any, ProxySide.CLIENT, syncMasks);
  }

}