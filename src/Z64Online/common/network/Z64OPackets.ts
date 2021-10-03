import {
  Packet
} from 'modloader64_api/ModLoaderDefaultImpls';
import {
  AgeOrForm,
} from 'Z64Lib/API/Common/Z64API';

import { ActorPacketData } from '../../oot/actor_systems/ActorHookBase';
import { HorseData } from '../puppet/HorseData';
import { INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { IKeyRing } from '@Z64Online/common/save/IKeyRing';
import { Scene } from '../types/Types';
import { IPuppetData } from '../puppet/IPuppetData';

export class Z64O_PuppetPacket extends Packet {
  data: {bundle: Buffer};
  horse_data!: HorseData;

  constructor(puppetData: IPuppetData, lobby: string) {
    super('Z64O_PuppetPacket', 'Z64Online', lobby, true)
    //@ts-ignore
    this.data = puppetData;
  }

  setHorseData(horse: HorseData) {
    this.horse_data = horse;
  }
}

export class Z64O_ScenePacket extends Packet {
  scene: Scene;
  age: AgeOrForm;

  constructor(lobby: string, scene: Scene, age: AgeOrForm) {
    super('Z64O_ScenePacket', 'Z64Online', lobby, true);
    this.scene = scene;
    this.age = age;
  }
}

export class Z64O_SceneRequestPacket extends Packet {
  constructor(lobby: string) {
    super('Z64O_SceneRequestPacket', 'Z64Online', lobby, true);
  }
}

export class Z64O_BankSyncPacket extends Packet {
  savings: number;

  constructor(saving: number, lobby: string) {
    super('Z64O_BankSyncPacket', 'Z64Online', lobby, true);
    this.savings = saving;
  }
}

export class Z64O_DownloadResponsePacket extends Packet {

  save?: Buffer;
  keys?: IKeyRing;
  host: boolean;

  constructor(lobby: string, host: boolean) {
    super('Z64O_DownloadResponsePacket', 'Z64Online', lobby, false);
    this.host = host;
  }
}

export class Z64O_DownloadRequestPacket extends Packet {

  save: Buffer;

  constructor(lobby: string, save: Buffer) {
    super('Z64O_DownloadRequestPacket', 'Z64Online', lobby, false);
    this.save = save;
  }
}

export class Z64O_UpdateSaveDataPacket extends Packet {

  save: Buffer;
  modData: any = {};
  world: number;

  constructor(lobby: string, save: Buffer, world: number) {
    super('Z64O_UpdateSaveDataPacket', 'Z64Online', lobby, false);
    this.save = save;
    this.world = world;
  }
}

export class Z64O_UpdateKeyringPacket extends Packet {

  keys: IKeyRing;
  world: number;

  constructor(keys: IKeyRing, lobby: string, world: number) {
    super('Z64O_UpdateKeyringPacket', 'Z64Online', lobby, false);
    this.keys = keys;
    this.world = world;
  }

}

export class Z64O_ClientSceneContextUpdate extends Packet {
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
    super('Z64O_ClientSceneContextUpdate', 'Z64Online', lobby, false);
    this.chests = chests;
    this.switches = switches;
    this.collect = collect;
    this.clear = clear;
    this.temp = temp;
    this.scene = scene;
    this.world = world;
  }
}

export class Z64O_ActorPacket extends Packet {
  actorData: ActorPacketData;
  scene: Scene;
  room: number;

  constructor(
    data: ActorPacketData,
    scene: Scene,
    room: number,
    lobby: string
  ) {
    super('Z64O_ActorPacket', 'Z64Online', lobby, true);
    this.actorData = data;
    this.scene = scene;
    this.room = room;
  }
}

export class Z64O_ActorDeadPacket extends Packet {
  actorUUID: string;
  scene: Scene;
  room: number;

  constructor(aid: string, scene: number, room: number, lobby: string) {
    super('Z64O_ActorDeadPacket', 'Z64Online', lobby, true);
    this.actorUUID = aid;
    this.scene = scene;
    this.room = room;
  }
}

export class Z64O_SpawnActorPacket extends Packet {
  actorData: ActorPacketData;
  room: number;
  scene: Scene;
  constructor(
    data: ActorPacketData,
    scene: Scene,
    room: number,
    lobby: string
  ) {
    super('Z64O_SpawnActorPacket', 'Z64Online', lobby, true);
    this.actorData = data;
    this.scene = scene;
    this.room = room;
  }
}

export class Z64O_BottleUpdatePacket extends Packet {
  slot: number;
  contents: number;

  constructor(slot: number, contents: number, lobby: string) {
    super('Z64O_BottleUpdatePacket', 'Z64Online', lobby, true);
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

export class Z64O_RomFlagsPacket extends Packet {
  isRando: boolean;
  isVanilla: boolean;
  hasFastBunHood?: boolean;
  isMultiworld?: boolean;

  constructor(lobby: string, isRando: boolean, isVanilla: boolean, hasFastBunHood?: boolean, isMultiworld?: boolean) {
    super('Z64O_RomFlagsPacket', 'Z64O', lobby, false);
    this.isRando = isRando;
    this.hasFastBunHood = hasFastBunHood;
    this.isMultiworld = isMultiworld;
    this.isVanilla = isVanilla;
  }
}

export class Z64O_ErrorPacket extends Packet{

  message: string;

  constructor(msg: string, lobby: string){
    super('Z64O_ErrorPacket', 'Z64O', lobby, false);
    this.message = msg;
  }

}