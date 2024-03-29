import { IMMSyncSave } from "@Z64Online/common/types/MMAliases";
import { IKeyRing } from "@Z64Online/common/save/IKeyRing";
import { Z64OnlineEvents, Z64_SaveDataItemSet } from "@Z64Online/common/api/Z64API";
import { bus } from "modloader64_api/EventHandler";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { IMMCore, InventoryItem } from "Z64Lib/API/MM/MMAPI";
import { ProxySide } from "modloader64_api/SidedProxy/SidedProxy";
import { Z64O_PRIVATE_EVENTS } from "../../common/api/InternalAPI";
import { ISaveSyncData } from "@Z64Online/common/save/ISaveSyncData";
import Z64Serialize from "@Z64Online/common/storage/Z64Serialize";
import { parseFlagChanges } from "@Z64Online/common/lib/parseFlagChanges";
import { MMR_QuirkFixes } from "../compat/MMR";
import { MMOnlineStorageBase } from "../storage/MMOnlineStorageBase";
import zlib from 'zlib';
import * as API from 'Z64Lib/API/imports'

export class MMOSaveData implements ISaveSyncData {
  core!: IMMCore;
  private ModLoader: IModLoaderAPI;
  hash: string = "";
  constructor(core: IMMCore, ModLoader: IModLoaderAPI) {
    this.core = core;
    this.ModLoader = ModLoader;
  }

  private generateWrapper(): IMMSyncSave {
    let obj: any = {};
    let keys = [
      'inventory', 'map_visible', 'map_visited', 'minimap_flags', 'heart_containers', 'magic_meter_size', 'magic', 'swords', 'shields',
      'questStatus', 'checksum', 'owlStatues', 'double_defense', 'magicBeanCount', 'dungeon_items', 'stray', 'skull', 'bank',
      'lottery_numbers_day1', 'lottery_numbers_day2', 'lottery_numbers_day3', 'spider_house_mask_order', 'bomber_code'
    ];

    obj = JSON.parse(JSON.stringify(this.core.save));
    //obj['permSceneData'] = this.core.save.permSceneData;
    //obj['infTable'] = this.core.save.infTable;
    //obj['weekEventFlags'] = this.core.save.weekEventFlags;
    //obj['dungeon_items'] = this.core.save.dungeonItemManager.getRawBuffer();

    let obj2: any = {};

    for (let i = 0; i < keys.length; i++) {
      obj2[keys[i]] = obj[keys[i]];
    }
    return obj2 as IMMSyncSave;
  }

  createKeyRing(): IKeyRing {
    let obj = { keys: this.core.save.keyManager.getRawKeyBuffer() } as IKeyRing;
    return obj;
  }

  processKeyRing(settings: any, keys: IKeyRing, storage: IKeyRing, side: ProxySide) {
    for (let i = 0; i < keys.keys.byteLength; i++) {
      if (side === ProxySide.CLIENT) {
        if (this.isNotEqual(keys.keys[i], this.core.save.keyManager.getKeyCountForIndex(i))) {
          this.core.save.keyManager.setKeyCountByIndex(i, keys.keys[i]);
          this.ModLoader.privateBus.emit(Z64O_PRIVATE_EVENTS.UPDATE_KEY_HASH, {});
          bus.emit(Z64OnlineEvents.SAVE_DATA_ITEM_SET, new Z64_SaveDataItemSet(i.toString(), keys.keys[i]));
        }
      } else {
        if (this.isNotEqual(keys.keys[i], storage.keys[i])) {
          storage.keys[i] = keys.keys[i];
        }
      }
    }
  }

  processKeyRing_OVERWRITE(settings: any, keys: IKeyRing, storage: IKeyRing, side: ProxySide) {
    for (let i = 0; i < keys.keys.byteLength; i++) {
      if (side === ProxySide.CLIENT) {
        this.core.save.keyManager.setKeyCountByIndex(i, keys.keys[i]);
        this.ModLoader.privateBus.emit(Z64O_PRIVATE_EVENTS.UPDATE_KEY_HASH, {});
      }
    }
  }

  createSave(): Buffer {
    let obj = this.generateWrapper();
    let buf = Z64Serialize.serializeSync(obj);
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

  forceOverrideSave(settings: any, save: Buffer, storage: IMMSyncSave, side: ProxySide) {
    try {
      this.ModLoader.privateBus.emit(Z64O_PRIVATE_EVENTS.LOCK_ITEM_NOTIFICATIONS, {});
      let obj: IMMSyncSave = Z64Serialize.deserializeSync(save);

      storage.heart_containers = obj.heart_containers;
      storage.questStatus.heartPieceCount = obj.questStatus.heartPieceCount;
      storage.magic_meter_size = obj.magic_meter_size;

      storage.inventory.magicBeansCount = obj.inventory.magicBeansCount;

      storage.minimap_flags = obj.minimap_flags;
      storage.map_visible = obj.map_visible;
      storage.map_visited = obj.map_visited;
      storage.double_defense = obj.double_defense;

      //Misc
      storage.bank = obj.bank;
      storage.lottery_numbers_day1 = obj.lottery_numbers_day1;
      storage.lottery_numbers_day2 = obj.lottery_numbers_day2;
      storage.lottery_numbers_day3 = obj.lottery_numbers_day3;
      storage.bomber_code = obj.bomber_code;
      storage.spider_house_mask_order = obj.spider_house_mask_order;

      let old_swordLevel = storage.swords.swordLevel;
      this.processMixedLoop_OVERWRITE(obj.swords, storage.swords, ['kokiriSword', 'masterSword', 'giantKnife', 'biggoronSword']);
      this.processMixedLoop_OVERWRITE(obj.shields, storage.shields, ['dekuShield', 'hylianShield', 'mirrorShield']);
      if ((settings as MMOnlineStorageBase).MM_IS_FAIRY) {
        this.processMixedLoop_OVERWRITE(obj.stray, storage.stray, []);
        storage.stray.strayClockTown = obj.stray.strayClockTown;
      }
      this.processMixedLoop_OVERWRITE(obj.questStatus, storage.questStatus, []);
      this.processMixedLoop_OVERWRITE(obj.inventory, storage.inventory, []);
      this.processBoolLoop_OVERWRITE(obj.owlStatues, storage.owlStatues);

      if (old_swordLevel !== storage.swords.swordLevel) {
        bus.emit(Z64OnlineEvents.SWORD_NEEDS_UPDATE, {});
      }
      if (side === ProxySide.CLIENT) {
        this.core.save.dungeonItemManager.setRawBuffer(obj.dungeon_items);
      }
    } catch (err: any) {
      console.log(err.stack);
    }
  }

  isMask(item: InventoryItem) {

  }

  mergeSave(settings: any, save: Buffer, storage: IMMSyncSave, side: ProxySide, syncMasks: boolean = true): Promise<boolean> {
    return new Promise((accept, reject) => {
      Z64Serialize.deserialize(save).then((obj: IMMSyncSave) => {
        // Another title screen safety check.
        if (obj.checksum === 0) {
          console.log("mergeSave failure")
          return;
        }
        if (obj.heart_containers > storage.heart_containers && obj.heart_containers <= 20) {
          storage.heart_containers = obj.heart_containers;
          bus.emit(Z64OnlineEvents.GAINED_HEART_CONTAINER, {});
        }
        if (storage.heart_containers > 20) {
          storage.heart_containers = 20;
        }

        if (obj.magic_meter_size > storage.magic_meter_size) {
          storage.magic_meter_size = obj.magic_meter_size;
        }
        else if (obj.magic_meter_size === 0 && storage.magic_meter_size === 1) {
          if (obj.magic == 0x60) {
            storage.magic_meter_size = 2;
          }
        }
        if (obj.inventory.magicBeansCount !== storage.inventory.magicBeansCount) {
          storage.inventory.magicBeansCount = obj.inventory.magicBeansCount;
        }

        let old_swordLevel = storage.swords.swordLevel;
        this.processMixedLoop(obj.swords, storage.swords, []);
        this.processMixedLoop(obj.shields, storage.shields, []);
        if ((settings as MMOnlineStorageBase).MM_IS_FAIRY) {
          //console.log(obj.stray)
          this.processMixedLoop(obj.stray, storage.stray, []);
        }
        if ((settings as MMOnlineStorageBase).MM_IS_SKULL) {
          //console.log(obj.skull)
          this.processMixedLoop(obj.skull, storage.skull, []);
        }
        this.processMixedLoop(obj.questStatus, storage.questStatus, ['heartPieceCount']);
        this.processBoolLoop(obj.owlStatues, storage.owlStatues);

        //Maps
        let minimap_flags = storage.minimap_flags;
        let map_visible = storage.map_visible;
        let map_visited = storage.map_visited;
        parseFlagChanges(obj.minimap_flags, minimap_flags);
        parseFlagChanges(obj.map_visible, map_visible);
        parseFlagChanges(obj.map_visited, map_visited);
        storage.minimap_flags = minimap_flags;
        storage.map_visible = map_visible;
        storage.map_visited = map_visited;

        //Misc
        if (storage.bank !== obj.bank) storage.bank = obj.bank;
        if (storage.lottery_numbers_day1 !== obj.lottery_numbers_day1) storage.lottery_numbers_day1 = obj.lottery_numbers_day1;
        if (storage.lottery_numbers_day2 !== obj.lottery_numbers_day2) storage.lottery_numbers_day2 = obj.lottery_numbers_day2;
        if (storage.lottery_numbers_day3 !== obj.lottery_numbers_day3) storage.lottery_numbers_day3 = obj.lottery_numbers_day3;
        if (storage.bomber_code !== obj.bomber_code) storage.bomber_code = obj.bomber_code;
        if (storage.spider_house_mask_order !== obj.spider_house_mask_order) storage.spider_house_mask_order = obj.spider_house_mask_order;


        if (old_swordLevel !== storage.swords.swordLevel) {
          bus.emit(Z64OnlineEvents.SWORD_NEEDS_UPDATE, storage.swords.swordLevel);
        }

        if ((settings as MMOnlineStorageBase).MM_IS_TIME) {
          if (obj.inventory.FIELD_QUEST_ITEM_1 !== storage.inventory.FIELD_QUEST_ITEM_1) storage.inventory.FIELD_QUEST_ITEM_1 = obj.inventory.FIELD_QUEST_ITEM_1;
          if (obj.inventory.FIELD_QUEST_ITEM_2 !== storage.inventory.FIELD_QUEST_ITEM_2) storage.inventory.FIELD_QUEST_ITEM_2 = obj.inventory.FIELD_QUEST_ITEM_2;
          if (obj.inventory.FIELD_QUEST_ITEM_3 !== storage.inventory.FIELD_QUEST_ITEM_3) storage.inventory.FIELD_QUEST_ITEM_3 = obj.inventory.FIELD_QUEST_ITEM_3;
        }
        if (obj.inventory.FIELD_BOTTLE1 !== InventoryItem.NONE && storage.inventory.FIELD_BOTTLE1 === InventoryItem.NONE) storage.inventory.FIELD_BOTTLE1 = obj.inventory.FIELD_BOTTLE1;
        if (obj.inventory.FIELD_BOTTLE2 !== InventoryItem.NONE && storage.inventory.FIELD_BOTTLE2 === InventoryItem.NONE) storage.inventory.FIELD_BOTTLE2 = obj.inventory.FIELD_BOTTLE2;
        if (obj.inventory.FIELD_BOTTLE3 !== InventoryItem.NONE && storage.inventory.FIELD_BOTTLE3 === InventoryItem.NONE) storage.inventory.FIELD_BOTTLE3 = obj.inventory.FIELD_BOTTLE3;
        if (obj.inventory.FIELD_BOTTLE4 !== InventoryItem.NONE && storage.inventory.FIELD_BOTTLE4 === InventoryItem.NONE) storage.inventory.FIELD_BOTTLE4 = obj.inventory.FIELD_BOTTLE4;
        if (obj.inventory.FIELD_BOTTLE5 !== InventoryItem.NONE && storage.inventory.FIELD_BOTTLE5 === InventoryItem.NONE) storage.inventory.FIELD_BOTTLE5 = obj.inventory.FIELD_BOTTLE5;
        if (obj.inventory.FIELD_BOTTLE6 !== InventoryItem.NONE && storage.inventory.FIELD_BOTTLE6 === InventoryItem.NONE) storage.inventory.FIELD_BOTTLE6 = obj.inventory.FIELD_BOTTLE6;

        this.processMixedLoop(obj.inventory, storage.inventory, ["FIELD_BOTTLE1", "FIELD_BOTTLE2", "FIELD_BOTTLE3", "FIELD_BOTTLE4", "FIELD_BOTTLE5", "FIELD_BOTTLE6", "bank"]);

        if (storage.questStatus.heartPieceCount < obj.questStatus.heartPieceCount && obj.questStatus.heartPieceCount < 4) {
          storage.questStatus.heartPieceCount = obj.questStatus.heartPieceCount;
          bus.emit(Z64OnlineEvents.GAINED_PIECE_OF_HEART, {});
        } else if (obj.questStatus.heartPieceCount > 3) {
          storage.questStatus.heartPieceCount = 0;
          bus.emit(Z64OnlineEvents.GAINED_PIECE_OF_HEART, {});
        } else if (storage.questStatus.heartPieceCount >= 3 && obj.questStatus.heartPieceCount === 0) {
          storage.questStatus.heartPieceCount = 0;
          bus.emit(Z64OnlineEvents.GAINED_PIECE_OF_HEART, {});
        }

        if (storage.double_defense < obj.double_defense) {
          storage.double_defense = obj.double_defense;
        }

        //if (side === ProxySide.CLIENT) {
        //  let cur = this.core.save.dungeonItemManager.getRawBuffer();
        //  parseFlagChanges(obj.dungeon_items, cur);
        //  this.core.save.dungeonItemManager.setRawBuffer(cur);
        //  bus.emit(Z64OnlineEvents.ON_INVENTORY_UPDATE, {});
        //} else {
        //  parseFlagChanges(obj.dungeon_items, storage.dungeon_items);
        //}
        accept(true);
      }).catch((err: string) => {
        console.log(err);
        reject(false);
      });
    });
  }

  applySave(settings: any, save: Buffer) {
    this.mergeSave(settings, save, this.core.save as any, ProxySide.CLIENT);
  }

}

//-----------------------------------------------------
// Photo
//-----------------------------------------------------


export interface IPhotoSave extends API.MM.IPhoto {
}

export class PhotoSave implements IPhotoSave {
  pictograph_photoChunk!: Buffer;
  pictograph_spec = 0x0;
  pictograph_quality = 0x0;
  pictograph_unk = 0x0;
  timestamp: number = Date.now();
  hash: string = "";
  pictograph_used: boolean = false;

  compressPhoto(): void {
    console.log("Original Size: " + this.pictograph_photoChunk.byteLength);
    this.pictograph_photoChunk = zlib.deflateSync(this.pictograph_photoChunk);
    console.log("New  Size: " + this.pictograph_photoChunk.byteLength);
  }

  decompressPhoto(): void {
    this.pictograph_photoChunk = zlib.inflateSync(this.pictograph_photoChunk);
  }

  fromPhoto(photo: PhotoSave) {
    this.pictograph_photoChunk = photo.pictograph_photoChunk;
    this.pictograph_spec = photo.pictograph_spec;
    this.pictograph_quality = photo.pictograph_quality;
    this.pictograph_unk = photo.pictograph_unk;
    this.timestamp = photo.timestamp;
    this.hash = photo.hash;
    this.pictograph_used = photo.pictograph_used;
  }
}

export function createPhotoFromContext(ModLoader: IModLoaderAPI, save: API.MM.IPhoto) {
  let data = new PhotoSave();
  data.pictograph_photoChunk = save.pictograph_photoChunk;

  data.pictograph_quality = save.pictograph_quality;
  data.pictograph_spec = save.pictograph_spec;
  data.pictograph_unk = save.pictograph_unk;
  data.pictograph_used = save.pictograph_used;

  data.hash = ModLoader.utils.hashBuffer(data.pictograph_photoChunk);
  return data;
}

export function applyPhotoToContext(
  data: PhotoSave,
  save: API.MM.IPhoto
) {
  save.pictograph_photoChunk = data.pictograph_photoChunk;
  save.pictograph_quality = data.pictograph_quality;
  save.pictograph_spec = data.pictograph_spec;
  save.pictograph_unk = data.pictograph_unk;
  save.pictograph_used = data.pictograph_used;
}

export function mergePhotoData(
  save: PhotoSave,
  incoming: PhotoSave
) {
  if (incoming.pictograph_photoChunk !== save.pictograph_photoChunk) {
    save.pictograph_photoChunk = incoming.pictograph_photoChunk;
  }
  if (incoming.pictograph_quality !== save.pictograph_quality) {
    save.pictograph_quality = incoming.pictograph_quality;
  }
  if (incoming.pictograph_spec !== save.pictograph_spec) {
    save.pictograph_spec = incoming.pictograph_spec;
  }
  if (incoming.pictograph_unk !== save.pictograph_unk) {
    save.pictograph_unk = incoming.pictograph_unk;
  }
  if (incoming.timestamp !== save.timestamp) {
    save.timestamp = incoming.timestamp;
  }
  if (incoming.hash !== save.hash) {
    save.hash = incoming.hash;
  }
  if (incoming.pictograph_used !== save.pictograph_used) {
    save.pictograph_used = incoming.pictograph_used;
  }

}