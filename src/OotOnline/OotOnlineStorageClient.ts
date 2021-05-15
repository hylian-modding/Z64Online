import { OotOnlineStorageBase } from './OotOnlineStorageBase';
import { InventoryItem } from 'modloader64_api/OOT/OOTAPI';
import { OotO_ItemGetMessagePacket } from './data/OotOPackets';

export class OotOnlineStorageClient extends OotOnlineStorageBase {
  autoSaveHash = '!';
  keySaveHash = "!";
  lastbeans = 0;
  lastPushHash = "!";
  needs_update = false;
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
  notifBuffer: Array<OotO_ItemGetMessagePacket> = [];
  playerModelCache: any = {};
}
