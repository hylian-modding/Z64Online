import { EVENT_ARR_SIZE, INF_ARR_SIZE, ITEM_FLAG_ARR_SIZE, SCARECROW_ARR_SIZE, SCENE_ARR_SIZE, SKULLTULA_ARR_SIZE } from '@Z64Online/oot/OotOnline';
import {ITunics, IBoots, IQuestStatus } from 'Z64Lib/API/OoT/OOTAPI';
import { Magic, ISwords, IShields} from 'Z64Lib/API/Common/Z64API';
import { IKeyRing } from '../../common/save/IKeyRing';
import { IOOTInventorySync, IOOTSyncSave } from '../../common/types/OotAliases';
import { OotOnlineStorageBase } from './OotOnlineStorageBase';

export class OotOnlineStorage extends OotOnlineStorageBase {
  networkPlayerInstances: any = {};
  players: any = {};
  worlds: Array<OotOnlineSave_Server> = [];
}

export interface IOOTSyncSaveServer extends IOOTSyncSave {
  isOotR: boolean;
  isVanilla: boolean;
  hasFastBunHood: boolean;
  isMultiworld: boolean;
  hasPotsanity: boolean;
  PotsanityFlagSize: number;
}

class OOTSyncSaveServer implements IOOTSyncSaveServer {
  isOotR: boolean = false;
  hasFastBunHood: boolean = false;
  isMultiworld: boolean = false;
  isVanilla: boolean = false;
  inventory!: IOOTInventorySync;
  dungeon_items: Buffer = Buffer.alloc(0x14);
  triforcePieces: number = 0;
  death_counter: number = 0;
  heart_containers: number = 0;
  magic_meter_size!: Magic;
  swords!: ISwords;
  shields!: IShields;
  tunics!: ITunics;
  boots!: IBoots;
  questStatus!: IQuestStatus;
  magic_beans_purchased: number = 0;
  poe_collector_score: number = 0;
  permSceneData: Buffer = Buffer.alloc(SCENE_ARR_SIZE);
  eventFlags: Buffer = Buffer.alloc(EVENT_ARR_SIZE);
  itemFlags: Buffer = Buffer.alloc(ITEM_FLAG_ARR_SIZE);
  infTable: Buffer = Buffer.alloc(INF_ARR_SIZE);
  skulltulaFlags: Buffer = Buffer.alloc(SKULLTULA_ARR_SIZE);
  scarecrowsSongChildFlag: boolean = false;
  scarecrowsSong: Buffer = Buffer.alloc(SCARECROW_ARR_SIZE);
  checksum: number = 0;
  hasPotsanity: boolean = false;
  PotsanityFlagSize: number = -1;
  collectible_override_flags: Buffer = Buffer.alloc(1);
}

class OOTKeyRingServer implements IKeyRing {
  keys: Buffer = Buffer.alloc(0x14);
}

export class OotOnlineSave_Server {
  saveGameSetup = false;
  save: IOOTSyncSaveServer = new OOTSyncSaveServer();
  keys: IKeyRing = new OOTKeyRingServer();
}