import {
  SCENE_ARR_SIZE,
  EVENT_ARR_SIZE,
  ITEM_FLAG_ARR_SIZE,
  MASK_FLAG_ARR_SIZE,
  WEEK_EVENT_ARR_SIZE,
} from '@Z64Online/mm/MMOnline';
import { IQuestStatus } from 'Z64Lib/API/MM/MMAPI';
import { Magic, ISwords, IShields } from 'Z64Lib/API/COMMON/Z64API';
import { IKeyRing } from '../../common/save/IKeyRing';
import { IMMInventorySync, IMMSyncSave } from '../../common/types/MMAliases';
//import { PuppetServerStub } from '../puppet/PuppetServerStub';
import { MMOnlineStorageBase } from './MMOnlineStorageBase';

export class MMOnlineStorage extends MMOnlineStorageBase {
  networkPlayerInstances: any = {};
  players: any = {};
  worlds: Array<MMOnlineSave_Server> = [];
  //puppetStubs: Map<string, PuppetServerStub> = new Map();
}

export interface IMMSyncSaveServer extends IMMSyncSave {
  isMMR: boolean;
  isVanilla: boolean;
}

class MMSyncSaveServer implements IMMSyncSaveServer {
  map_visible: number = 0;
  map_visited: number = 0;
  owl_statues: number = 0;
  double_defense: number = 0;
  isMMR: boolean = false;
  isVanilla: boolean = false;
  inventory!: IMMInventorySync;
  dungeon_items: Buffer = Buffer.alloc(0x14);
  heart_containers: number = 0;
  magic_meter_size!: Magic;
  swords!: ISwords;
  shields!: IShields;
  questStatus!: IQuestStatus;
  permSceneData: Buffer = Buffer.alloc(SCENE_ARR_SIZE);
  infTable: Buffer = Buffer.alloc(EVENT_ARR_SIZE);
  maskFlags: Buffer = Buffer.alloc(MASK_FLAG_ARR_SIZE);
  weekEventFlags: Buffer = Buffer.alloc(WEEK_EVENT_ARR_SIZE);
  checksum: number = 0;
}

class MMKeyRingServer implements IKeyRing {
  keys: Buffer = Buffer.alloc(0x14);
}

export class MMOnlineSave_Server {
  saveGameSetup = false;
  save: IMMSyncSaveServer = new MMSyncSaveServer();
  keys: IKeyRing = new MMKeyRingServer();
}