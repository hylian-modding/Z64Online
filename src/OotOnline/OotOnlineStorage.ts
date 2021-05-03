import { KeyRing, Save } from './data/OotoSaveData';
import { OotOnlineStorageBase } from './OotOnlineStorageBase';

export class OotOnlineStorage extends OotOnlineStorageBase {
  networkPlayerInstances: any = {};
  players: any = {};
  saveGameSetup = false;
  save: Save = {dungeon_items: Buffer.alloc(0x14)} as Save;
  keys: KeyRing = {keys: Buffer.alloc(0x14)} as KeyRing;
}
