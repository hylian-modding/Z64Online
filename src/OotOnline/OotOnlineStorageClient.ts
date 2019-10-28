import { OotOnlineStorageBase } from './OotOnlineStorageBase';
import { InventoryItem } from 'modloader64_api/OOT/OOTAPI';

export class OotOnlineStorageClient extends OotOnlineStorageBase {
  autoSaveHash = '!';
  needs_update = false;
  first_time_sync = true;
  lastKnownSkullCount = -1;
  bottleCache: InventoryItem[] = [
    InventoryItem.NONE,
    InventoryItem.NONE,
    InventoryItem.NONE,
    InventoryItem.NONE,
  ];
  childModel: Buffer = Buffer.alloc(1);
  adultModel: Buffer = Buffer.alloc(1);

  keys_need_update = false;
  force_overwrite = false;
}
