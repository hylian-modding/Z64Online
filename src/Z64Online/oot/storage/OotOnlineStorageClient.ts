import { OotOnlineStorageBase } from './OotOnlineStorageBase';
import { InventoryItem } from 'Z64Lib/API/OoT/OOTAPI';
import { IOvlPayloadResult } from 'Z64Lib/API/Common/Z64API';
import { IZ64ClientStorage } from '@Z64Online/common/storage/Z64Storage';

export class OotOnlineStorageClient extends OotOnlineStorageBase implements IZ64ClientStorage {
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
  puppetOvl!: IOvlPayloadResult;
  localization: any = {};
  scene_keys: any = {};
  first_time_sync = false;
  playerModelCache: any = {};
  lastKnownSaveName: string = "Link";
}
