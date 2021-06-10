import { IKeyRing } from './common/save/IKeyRing';
import { IOOTSyncSave } from './common/types/OotAliases';
import { OotOnlineStorageBase } from './OotOnlineStorageBase';

export class OotOnlineStorage extends OotOnlineStorageBase {
  networkPlayerInstances: any = {};
  players: any = {};
  saveGameSetup = false;
  save: IOOTSyncSave = {dungeon_items: Buffer.alloc(0x14)} as IOOTSyncSave;
  keys: IKeyRing = {keys: Buffer.alloc(0x14)} as IKeyRing;
}
