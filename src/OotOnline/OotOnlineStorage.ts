import { EquestrianStorage } from './data/eponaPuppet/EquestrianStorage';
import { OotOnlineStorageBase } from './OotOnlineStorageBase';

export class OotOnlineStorage extends OotOnlineStorageBase {
  networkPlayerInstances: any = {};
  players: any = {};
  saveGameSetup = false;
  horses: EquestrianStorage = new EquestrianStorage();
}
