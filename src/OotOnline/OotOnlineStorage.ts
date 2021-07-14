import { IKeyRing } from './common/save/IKeyRing';
import { IOOTSyncSave } from './common/types/OotAliases';
import { WorldServer } from './data/worldserver/WorldServer';
import { OotOnlineStorageBase } from './OotOnlineStorageBase';

export class OotOnlineStorage extends OotOnlineStorageBase {
  networkPlayerInstances: any = {};
  players: any = {};
  players_rooms: any = {};
  worlds: Array<OotOnlineSave_Server> = [];
  worldServer: WorldServer = new WorldServer();
}

export class OotOnlineSave_Server {
  saveGameSetup = false;
  save: IOOTSyncSave = { dungeon_items: Buffer.alloc(0x14)} as IOOTSyncSave;
  keys: IKeyRing = { keys: Buffer.alloc(0x14) } as IKeyRing;
}