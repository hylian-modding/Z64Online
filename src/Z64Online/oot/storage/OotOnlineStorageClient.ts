import { OotOnlineStorageBase } from './OotOnlineStorageBase';
import { InventoryItem } from 'Z64Lib/API/OOT/OOTAPI';

export class OotOnlineStorageClient extends OotOnlineStorageBase {
  world: number = 0;
  autoSaveHash = '!';
  keySaveHash = "!";
  lastbeans = 0;
  lastPushHash = "!";
  lastKnownSkullCount = -1;
  bottleCache: InventoryItem[] = [
    InventoryItem.NONE,
    InventoryItem.NONE,
    InventoryItem.NONE,
    InventoryItem.NONE,
  ];
  equipmentHashes: Array<string> = [];
  overlayCache: any = {};
  localization: any = {};
  scene_keys: any = {};
  first_time_sync = false;
  playerModelCache: any = {};
  lastKnownSaveName: string = "Link";
}
