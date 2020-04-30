import { OotOnlineStorageBase } from './OotOnlineStorageBase';
import { InventoryItem } from 'modloader64_api/OOT/OOTAPI';

export class OotOnlineStorageClient extends OotOnlineStorageBase {
  autoSaveHash = '!';
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
  equipmentModel: Buffer = Buffer.alloc(1);
  adultIcon: Buffer = Buffer.alloc(1);
  childIcon: Buffer = Buffer.alloc(1);
  overlayCache: any = {};
  localization: any = {};
  scene_keys: any = {};
  first_time_sync = false;
}
