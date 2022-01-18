import { MMOnlineStorageBase } from './MMOnlineStorageBase';
import { InventoryItem } from 'Z64Lib/API/MM/MMAPI';
import { syncMode } from '@Z64Online/mm//MMOnline';
import PlayerSchedule from '@Z64Online/mm/save/MMOPlayerSchedule';
import { Texture } from 'modloader64_api/Sylvain/Gfx';
import { vec2, xy } from 'modloader64_api/Sylvain/vec';
import { IZ64ClientStorage } from '@Z64Online/common/storage/Z64Storage';
import { IOvlPayloadResult } from 'Z64Lib/API/Common/Z64API';

export class MMOnlineStorageClient extends MMOnlineStorageBase implements IZ64ClientStorage{
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
    InventoryItem.NONE,
    InventoryItem.NONE,
  ];
  equipmentHashes: Array<string> = [];
  overlayCache: any = {};
  puppetOvl!: IOvlPayloadResult;
  localization: any = {};
  scene_keys: any = {};
  schedules: any = {};
  schedule: PlayerSchedule = new PlayerSchedule();
  syncModeBasic = false;
  syncModeTime = false;
  last_time = 0;
  last_day = 0;
  pictoboxAlert: PictoboxPreview = new PictoboxPreview(xy(0, 0));
  flagHash: string = "";
  isMMR: boolean = false;
  isSkulltulaSync = false;
  isFairySync = false;
  isAdultSizedHuman: boolean = false;
  
  
  first_time_sync = false;
  playerModelCache: any = {};
  lastKnownSaveName: string = "Link";
}

export class PictoboxPreview {
  buf: Buffer | undefined;
  image: Texture | undefined;
  pos: vec2;
  size: vec2 = xy(160, 112);
  opacity: number = 255;

  constructor(pos: vec2) {
    this.pos = pos;
  }
}