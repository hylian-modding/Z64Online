import { OotOnlineStorageBase } from './OotOnlineStorageBase';
import { InventoryItem } from 'modloader64_api/OOT/OOTAPI';

export class OotOnlineStorageClient extends OotOnlineStorageBase {
  world: number = 0;
  isOotR: boolean = false;
  isMultiworld: boolean = false;
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
  childModel: Buffer = Buffer.alloc(1);
  adultModel: Buffer = Buffer.alloc(1);
  overlayCache: any = {};
  localization: any = {};
  scene_keys: any = {};
  first_time_sync = false;
  playerModelCache: any = {};
}
