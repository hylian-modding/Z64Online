import {
  Packet,
  packetHelper,
  UDPPacket,
} from 'modloader64_api/ModLoaderDefaultImpls';
import { PuppetData } from './linkPuppet/PuppetData';
import {
  Age,
  InventoryItem,
  Scene,
} from 'modloader64_api/OOT/OOTAPI';
import { ActorPacketData } from './ActorHookBase';
import { HorseData } from './linkPuppet/HorseData';
import { INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { IKeyRing } from '@OotOnline/common/save/IKeyRing';

export class Ooto_PuppetPacket {
  data: PuppetData;
  horse_data!: HorseData;

  constructor(puppetData: PuppetData, lobby: string) {
    this.data = puppetData;
  }

  setHorseData(horse: HorseData) {
    this.horse_data = horse;
  }
}

export class Ooto_PuppetWrapperPacket extends UDPPacket {

  data: string;

  constructor(packet: Ooto_PuppetPacket, lobby: string) {
    super('Ooto_PuppetPacket', 'OotOnline', lobby, false);
    this.data = JSON.stringify(packet);
  }
}

export class Ooto_ScenePacket extends Packet {
  scene: Scene;
  age: Age;

  constructor(lobby: string, scene: Scene, age: Age) {
    super('Ooto_ScenePacket', 'OotOnline', lobby, true);
    this.scene = scene;
    this.age = age;
  }
}

export class Ooto_SceneRequestPacket extends Packet {
  constructor(lobby: string) {
    super('Ooto_SceneRequestPacket', 'OotOnline', lobby, true);
  }
}

export class Ooto_BankSyncPacket extends Packet {
  savings: number;

  constructor(saving: number, lobby: string) {
    super('Ooto_BankSyncPacket', 'OotOnline', lobby, true);
    this.savings = saving;
  }
}

export class Ooto_DownloadResponsePacket extends Packet {

  save?: Buffer;
  keys?: IKeyRing;
  host: boolean;

  constructor(lobby: string, host: boolean) {
    super('Ooto_DownloadResponsePacket', 'OotOnline', lobby, false);
    this.host = host;
  }
}

export class Ooto_DownloadRequestPacket extends Packet {

  save: Buffer;

  constructor(lobby: string, save: Buffer) {
    super('Ooto_DownloadRequestPacket', 'OotOnline', lobby, false);
    this.save = save;
  }
}

export class OotO_UpdateSaveDataPacket extends Packet {

  save: Buffer;
  world: number;

  constructor(lobby: string, save: Buffer, world: number) {
    super('OotO_UpdateSaveDataPacket', 'OotOnline', lobby, false);
    this.save = save;
    this.world = world;
  }
}

export class OotO_UpdateKeyringPacket extends Packet {

  keys: IKeyRing;
  world: number;

  constructor(keys: IKeyRing, lobby: string, world: number) {
    super('OotO_UpdateKeyringPacket', 'OotOnline', lobby, false);
    this.keys = keys;
    this.world = world;
  }

}

export class Ooto_ClientSceneContextUpdate extends Packet {
  chests: Buffer;
  switches: Buffer;
  collect: Buffer;
  clear: Buffer;
  temp: Buffer;
  scene: Scene;

  constructor(
    chests: Buffer,
    switches: Buffer,
    collect: Buffer,
    clear: Buffer,
    temp: Buffer,
    lobby: string,
    scene: Scene
  ) {
    super('Ooto_ClientSceneContextUpdate', 'OotOnline', lobby, false);
    this.chests = chests;
    this.switches = switches;
    this.collect = collect;
    this.clear = clear;
    this.temp = temp;
    this.scene = scene;
  }
}

export class Ooto_ActorPacket extends Packet {
  actorData: ActorPacketData;
  scene: Scene;
  room: number;

  constructor(
    data: ActorPacketData,
    scene: Scene,
    room: number,
    lobby: string
  ) {
    super('Ooto_ActorPacket', 'OotOnline', lobby, true);
    this.actorData = data;
    this.scene = scene;
    this.room = room;
  }
}

export class Ooto_ActorDeadPacket extends Packet {
  actorUUID: string;
  scene: Scene;
  room: number;

  constructor(aid: string, scene: number, room: number, lobby: string) {
    super('Ooto_ActorDeadPacket', 'OotOnline', lobby, true);
    this.actorUUID = aid;
    this.scene = scene;
    this.room = room;
  }
}

export class Ooto_SpawnActorPacket extends Packet {
  actorData: ActorPacketData;
  room: number;
  scene: Scene;
  constructor(
    data: ActorPacketData,
    scene: Scene,
    room: number,
    lobby: string
  ) {
    super('Ooto_SpawnActorPacket', 'OotOnline', lobby, true);
    this.actorData = data;
    this.scene = scene;
    this.room = room;
  }
}

export class Ooto_BottleUpdatePacket extends Packet {
  slot: number;
  contents: InventoryItem;

  constructor(slot: number, contents: InventoryItem, lobby: string) {
    super('Ooto_BottleUpdatePacket', 'OotOnline', lobby, true);
    this.slot = slot;
    this.contents = contents;
  }
}

export class Z64_AllocateModelPacket extends Packet {
  model: Buffer;
  age: Age;
  hash: string;
  ageThePlayerActuallyIs: Age;

  constructor(model: Buffer, age: Age, lobby: string, hash: string, actualAge: Age) {
    super('Z64OnlineLib_AllocateModelPacket', 'Z64OnlineLib', lobby, true);
    this.model = model;
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
  zobjs: Array<Buffer> = [];
  age: Age;

  constructor(age: Age, lobby: string) {
    super('Z64OnlineLib_EquipmentPakPacket', 'Z64OnlineLib', lobby, true);
    this.age = age;
  }
}