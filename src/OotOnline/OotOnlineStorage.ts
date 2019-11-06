import { EquestrianStorage } from './data/eponaPuppet/EquestrianStorage';
import { OotOnlineStorageBase } from './OotOnlineStorageBase';

export class OotOnlineStorage extends OotOnlineStorageBase {
  networkPlayerInstances: any = {};
  players: any = {};
  horses: EquestrianStorage = new EquestrianStorage();
  saveGameSetup = false;
}
