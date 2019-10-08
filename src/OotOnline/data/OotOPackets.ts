import {
  Packet,
  packetHelper,
  UDPPacket,
} from 'modloader64_api/ModLoaderDefaultImpls';
import { IPuppetData, PuppetData } from './linkPuppet/PuppetData';
import { Age, IInventoryFields } from 'modloader64_api/OOT/OOTAPI';
import { IEquipmentSave, IQuestSave } from './OotoSaveData';
import { ActorPacketData } from './ActorHookBase';
import { IPosition } from 'modloader64_api/OOT/IPosition';
import { IRotation } from 'modloader64_api/OOT/IRotation';
import { EquestrianData } from './eponaPuppet/EquestrianData';
import { EponaData } from './eponaPuppet/EponaData';

export class Ooto_PuppetPacket extends UDPPacket {
  data: IPuppetData;

  constructor(puppetData: PuppetData) {
    super('Ooto_PuppetPacket', 'OotOnline', false);
    this.data = puppetData;
  }
}

export class Ooto_ScenePacket extends Packet {
  scene: number;
  age: Age;

  constructor(scene: number, age: Age) {
    super('Ooto_ScenePacket', 'OotOnline', true);
    this.scene = scene;
    this.age = age;
  }
}

export class Ooto_SceneRequestPacket extends Packet {
  constructor() {
    super('Ooto_SceneRequestPacket', 'OotOnline', true);
  }
}

export class Ooto_SubscreenSyncPacket extends Packet {
  inventory: IInventoryFields;
  equipment: IEquipmentSave;
  quest: IQuestSave;

  constructor(
    save: IInventoryFields,
    equipment: IEquipmentSave,
    quest: IQuestSave
  ) {
    super('Ooto_SubscreenSyncPacket', 'OotOnline', false);
    this.inventory = save;
    this.equipment = equipment;
    this.quest = quest;
  }
}

export class Ooto_DownloadResponsePacket extends Packet {
  subscreen: Ooto_SubscreenSyncPacket;
  flags: Ooto_ServerFlagUpdate;

  constructor(
    subscreen: Ooto_SubscreenSyncPacket,
    scenes: Ooto_ServerFlagUpdate
  ) {
    super('Ooto_DownloadResponsePacket', 'OotOnline', false);
    this.subscreen = subscreen;
    this.flags = scenes;
    packetHelper.cloneDestination(this, this.flags);
    packetHelper.cloneDestination(this, this.flags);
  }
}

export class Ooto_DownloadResponsePacket2 extends Packet {
  constructor() {
    super('Ooto_DownloadResponsePacket2', 'OotOnline', false);
  }
}

export class Ooto_DownloadRequestPacket extends Packet {
  constructor() {
    super('Ooto_DownloadRequestPacket', 'OotOnline', false);
  }
}

export class Ooto_ClientFlagUpdate extends Packet {
  scenes: any;
  events: any;
  items: any;
  inf: any;
  skulltulas: any;

  constructor(scenes: any, events: any, items: any, inf: any, skulltulas: any) {
    super('Ooto_ClientFlagUpdate', 'OotOnline', false);
    this.scenes = scenes;
    this.events = events;
    this.items = items;
    this.inf = inf;
    this.skulltulas = skulltulas;
  }
}

export class Ooto_ServerFlagUpdate extends Packet {
  scenes: Buffer;
  events: Buffer;
  items: Buffer;
  inf: Buffer;
  skulltulas: Buffer;

  constructor(scenes: Buffer, events: Buffer, items: Buffer, inf: Buffer, skulltulas: Buffer) {
    super('Ooto_ServerFlagUpdate', 'OotOnline', false);
    this.scenes = scenes;
    this.events = events;
    this.items = items;
    this.inf = inf;
    this.skulltulas = skulltulas;
  }
}

export class Ooto_ClientSceneContextUpdate extends Packet {
  chests: Buffer;
  switches: Buffer;
  collect: Buffer;
  clear: Buffer;
  temp: Buffer;

  constructor(
    chests: Buffer,
    switches: Buffer,
    collect: Buffer,
    clear: Buffer,
    temp: Buffer
  ) {
    super('Ooto_ClientSceneContextUpdate', 'OotOnline', false);
    this.chests = chests;
    this.switches = switches;
    this.collect = collect;
    this.clear = clear;
    this.temp = temp;
  }
}

export class Ooto_ActorPacket extends Packet {
  actorData: ActorPacketData;
  scene: number;
  room: number;

  constructor(data: ActorPacketData, scene: number, room: number) {
    super('Ooto_ActorPacket', 'OotOnline', true);
    this.actorData = data;
    this.scene = scene;
    this.room = room;
  }
}

export class Ooto_ActorDeadPacket extends Packet {
  actorUUID: string;
  scene: number;
  room: number;

  constructor(aid: string, scene: number, room: number) {
    super('Ooto_ActorDeadPacket', 'OotOnline', true);
    this.actorUUID = aid;
    this.scene = scene;
    this.room = room;
  }
}

export class Ooto_EquestrianRegisterPacket extends Packet {
  scene: number;
  pos: IPosition;
  rot: IRotation;

  constructor(scene: number, pos: IPosition, rot: IRotation) {
    super('Ooto_EquestrianRegisterPacket', 'OotOnline', false);
    this.scene = scene;
    this.pos = pos;
    this.rot = rot;
  }
}

export class Ooto_EquestrianPuppetListPacket extends Packet {
  data: any;

  constructor(d: any) {
    super('Ooto_EquestrianPuppetListPacket', 'OotOnline', false);
    this.data = d;
  }
}

export class Ooto_EquestrianTickPacket extends UDPPacket {
  edata: EponaData;

  constructor(edata: EponaData) {
    super('Ooto_EquestrianTickPacket', 'OotOnline', false);
    this.edata = edata;
  }
}

export class Ooto_EquestrianTickServerPacket extends Packet {
  data: EquestrianData;

  constructor(data: EquestrianData) {
    super('Ooto_EquestrianTickServerPacket', 'OotOnline', false);
    this.data = data;
  }
}

export class Ooto_SpawnActorPacket extends Packet {
  actorData: ActorPacketData;
  scene: number;
  constructor(data: ActorPacketData, scene: number) {
    super('Ooto_SpawnActorPacket', 'OotOnline', true);
    this.actorData = data;
    this.scene = scene;
  }
}

export class Ooto_EquestrianNukeServerPacket extends Packet{
  horse_to_remove: string;

  constructor(horse_to_remove: string){
    super("Ooto_EquestrianNukeServerPacket", 'OotOnline', false);
    this.horse_to_remove = horse_to_remove;
  }
}