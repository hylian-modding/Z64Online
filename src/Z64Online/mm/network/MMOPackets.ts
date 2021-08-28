import {
  Packet,
  packetHelper,
  UDPPacket,
} from 'modloader64_api/ModLoaderDefaultImpls';
//import { PuppetData } from '../puppet/PuppetData';
import {
  AgeOrForm,
} from 'Z64Lib/API/Common/Z64API';

import {
  InventoryItem,
  Scene
} from 'Z64Lib/API/MM/MMAPI';

//import { HorseData } from '../puppet/HorseData';
import { INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { IKeyRing } from '@Z64Online/common/save/IKeyRing';

/* export class MMO_PuppetPacket extends Packet {
  data: PuppetData;
  horse_data!: HorseData;

  constructor(puppetData: PuppetData, lobby: string) {
    super('MMO_PuppetPacket', 'Z64Online', lobby, true);
    this.data = puppetData;
  }

  setHorseData(horse: HorseData) {
    this.horse_data = horse;
  }
} */

export class MMO_ScenePacket extends Packet {
  scene: Scene;
  age: AgeOrForm;

  constructor(lobby: string, scene: Scene, age: AgeOrForm) {
    super('MMO_ScenePacket', 'MMOnline', lobby, true);
    this.scene = scene;
    this.age = age;
  }
}

export class MMO_SceneRequestPacket extends Packet {
  constructor(lobby: string) {
    super('MMO_SceneRequestPacket', 'MMOnline', lobby, true);
  }
}

export class MMO_BankSyncPacket extends Packet {
  savings: number;

  constructor(saving: number, lobby: string) {
    super('MMO_BankSyncPacket', 'MMOnline', lobby, true);
    this.savings = saving;
  }
}

export class MMO_DownloadResponsePacket extends Packet {

  save?: Buffer;
  keys?: IKeyRing;
  host: boolean;

  constructor(lobby: string, host: boolean) {
    super('MMO_DownloadResponsePacket', 'MMOnline', lobby, false);
    this.host = host;
  }
}

export class MMO_DownloadRequestPacket extends Packet {

  save: Buffer;

  constructor(lobby: string, save: Buffer) {
    super('MMO_DownloadRequestPacket', 'MMOnline', lobby, false);
    this.save = save;
  }
}

export class MMO_UpdateSaveDataPacket extends Packet {

  save: Buffer;
  world: number;

  constructor(lobby: string, save: Buffer, world: number) {
    super('MMO_UpdateSaveDataPacket', 'MMOnline', lobby, false);
    this.save = save;
    this.world = world;
  }
}

export class MMO_UpdateKeyringPacket extends Packet {

  keys: IKeyRing;
  world: number;

  constructor(keys: IKeyRing, lobby: string, world: number) {
    super('MMO_UpdateKeyringPacket', 'MMOnline', lobby, false);
    this.keys = keys;
    this.world = world;
  }

}

export class MMO_ClientSceneContextUpdate extends Packet {
  chests: Buffer;
  switches: Buffer;
  collect: Buffer;
  clear: Buffer;
  temp: Buffer;
  scene: Scene;
  world: number;

  constructor(
    chests: Buffer,
    switches: Buffer,
    collect: Buffer,
    clear: Buffer,
    temp: Buffer,
    lobby: string,
    scene: Scene,
    world: number
  ) {
    super('MMO_ClientSceneContextUpdate', 'MMOnline', lobby, false);
    this.chests = chests;
    this.switches = switches;
    this.collect = collect;
    this.clear = clear;
    this.temp = temp;
    this.scene = scene;
    this.world = world;
  }
}

export class MMO_ActorDeadPacket extends Packet {
  actorUUID: string;
  scene: Scene;
  room: number;

  constructor(aid: string, scene: number, room: number, lobby: string) {
    super('MMO_ActorDeadPacket', 'MMOnline', lobby, true);
    this.actorUUID = aid;
    this.scene = scene;
    this.room = room;
  }
}

export class MMO_BottleUpdatePacket extends Packet {
  slot: number;
  contents: InventoryItem;

  constructor(slot: number, contents: InventoryItem, lobby: string) {
    super('MMO_BottleUpdatePacket', 'MMOnline', lobby, true);
    this.slot = slot;
    this.contents = contents;
  }
}

export class Z64_AllocateModelPacket extends Packet {
  age: AgeOrForm;
  hash: string;
  ageThePlayerActuallyIs: AgeOrForm;

  constructor(age: AgeOrForm, lobby: string, hash: string, actualAge: AgeOrForm) {
    super('Z64OnlineLib_AllocateModelPacket', 'Z64OnlineLib', lobby, true);
    this.age = age;
    this.hash = hash;
    this.ageThePlayerActuallyIs = actualAge;
  }
}

export class Z64_GiveModelPacket extends Packet {

  target: INetworkPlayer;

  constructor(lobby: string, player: INetworkPlayer) {
    super('Z64OnlineLib_GiveModelPacket', 'Z64OnlineLib', lobby, true);
    this.target = player;
  }
}

export class Z64_EquipmentPakPacket extends Packet {
  ids: Array<string> = [];
  age: AgeOrForm;

  constructor(age: AgeOrForm, lobby: string) {
    super('Z64OnlineLib_EquipmentPakPacket', 'Z64OnlineLib', lobby, true);
    this.age = age;
  }
}

export class MMO_RomFlagsPacket extends Packet {
  isMMR: boolean;
  isVanilla: boolean;

  constructor(lobby: string, isMMR: boolean, isVanilla: boolean) {
    super('MMO_RomFlagsPacket', 'MMO', lobby, false);
    this.isMMR = isMMR;
    this.isVanilla = isVanilla;
  }
}

export class MMO_PermFlagsPacket extends Packet{
  flags: Buffer;
  eventFlags: Buffer;

  constructor(flags: Buffer, eventFlags: Buffer, lobby: string){
    super('MMO_PermFlagsPacket', 'MMOnline', lobby, false);
    this.flags = flags;
    this.eventFlags = eventFlags;
  }
}