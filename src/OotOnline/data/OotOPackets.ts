import {
  Packet,
  packetHelper,
  UDPPacket,
} from 'modloader64_api/ModLoaderDefaultImpls';
import { IPuppetData, PuppetData } from './linkPuppet/PuppetData';
import { Age, IInventoryFields } from 'modloader64_api/OOT/OOTAPI';
import { IEquipmentSave, IQuestSave, IDungeonItemSave, IKeySaveContainer } from './OotoSaveData';
import { ActorPacketData } from './ActorHookBase';
import { IPosition } from 'modloader64_api/OOT/IPosition';
import { IRotation } from 'modloader64_api/OOT/IRotation';
import { EquestrianData } from './eponaPuppet/EquestrianData';
import { EponaData } from './eponaPuppet/EponaData';

export class Ooto_PuppetPacket extends UDPPacket {
  data: IPuppetData;

  constructor(puppetData: PuppetData, lobby: string) {
    super('Ooto_PuppetPacket', 'OotOnline', lobby, false);
    this.data = puppetData;
  }
}

export class Ooto_ScenePacket extends Packet {
  scene: number;
  age: Age;

  constructor(lobby: string, scene: number, age: Age) {
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

export class Ooto_SubscreenSyncPacket extends Packet {
  inventory: IInventoryFields;
  equipment: IEquipmentSave;
  quest: IQuestSave;
  dungeonItems: IDungeonItemSave;
  smallKeys: IKeySaveContainer;

  constructor(
    save: IInventoryFields,
    equipment: IEquipmentSave,
    quest: IQuestSave,
    dungeonItems: IDungeonItemSave,
    smallKeys: IKeySaveContainer,
    lobby: string
  ) {
    super('Ooto_SubscreenSyncPacket', 'OotOnline', lobby, false);
    this.inventory = save;
    this.equipment = equipment;
    this.quest = quest;
    this.dungeonItems = dungeonItems;
    this.smallKeys = smallKeys;
  }
}

export class Ooto_DownloadResponsePacket extends Packet {
  subscreen: Ooto_SubscreenSyncPacket;
  flags: Ooto_ServerFlagUpdate;

  constructor(
    subscreen: Ooto_SubscreenSyncPacket,
    scenes: Ooto_ServerFlagUpdate,
    lobby: string
  ) {
    super('Ooto_DownloadResponsePacket', 'OotOnline', lobby, false);
    this.subscreen = subscreen;
    this.flags = scenes;
    packetHelper.cloneDestination(this, this.flags);
    packetHelper.cloneDestination(this, this.flags);
  }
}

export class Ooto_DownloadResponsePacket2 extends Packet {
  constructor(lobby: string) {
    super('Ooto_DownloadResponsePacket2', 'OotOnline', lobby, false);
  }
}

export class Ooto_DownloadRequestPacket extends Packet {
  constructor(lobby: string) {
    super('Ooto_DownloadRequestPacket', 'OotOnline', lobby, false);
  }
}

export class Ooto_ClientFlagUpdate extends Packet {
  scenes: any;
  events: any;
  items: any;
  inf: any;
  skulltulas: any;

  constructor(scenes: any, events: any, items: any, inf: any, skulltulas: any, lobby: string) {
    super('Ooto_ClientFlagUpdate', 'OotOnline',lobby, false);
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

  constructor(scenes: Buffer, events: Buffer, items: Buffer, inf: Buffer, skulltulas: Buffer, lobby: string) {
    super('Ooto_ServerFlagUpdate', 'OotOnline', lobby, false);
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
    temp: Buffer,
    lobby: string
  ) {
    super('Ooto_ClientSceneContextUpdate', 'OotOnline', lobby, false);
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

  constructor(data: ActorPacketData, scene: number, room: number, lobby: string) {
    super('Ooto_ActorPacket', 'OotOnline', lobby, true);
    this.actorData = data;
    this.scene = scene;
    this.room = room;
  }
}

export class Ooto_ActorDeadPacket extends Packet {
  actorUUID: string;
  scene: number;
  room: number;

  constructor(aid: string, scene: number, room: number, lobby: string) {
    super('Ooto_ActorDeadPacket', 'OotOnline', lobby, true);
    this.actorUUID = aid;
    this.scene = scene;
    this.room = room;
  }
}

export class Ooto_EquestrianRegisterPacket extends Packet {
  scene: number;
  pos: IPosition;
  rot: IRotation;

  constructor(scene: number, pos: IPosition, rot: IRotation, lobby: string) {
    super('Ooto_EquestrianRegisterPacket', 'OotOnline', lobby, false);
    this.scene = scene;
    this.pos = pos;
    this.rot = rot;
  }
}

export class Ooto_EquestrianPuppetListPacket extends Packet {
  data: any;

  constructor(d: any, lobby: string) {
    super('Ooto_EquestrianPuppetListPacket', 'OotOnline', lobby, false);
    this.data = d;
  }
}

export class Ooto_EquestrianTickPacket extends UDPPacket {
  edata: EponaData;

  constructor(edata: EponaData, lobby: string) {
    super('Ooto_EquestrianTickPacket', 'OotOnline', lobby, false);
    this.edata = edata;
  }
}

export class Ooto_EquestrianTickServerPacket extends Packet {
  data: EquestrianData;

  constructor(data: EquestrianData, lobby: string) {
    super('Ooto_EquestrianTickServerPacket', 'OotOnline', lobby, false);
    this.data = data;
  }
}

export class Ooto_SpawnActorPacket extends Packet {
  actorData: ActorPacketData;
  scene: number;
  constructor(data: ActorPacketData, scene: number, lobby: string) {
    super('Ooto_SpawnActorPacket', 'OotOnline', lobby, true);
    this.actorData = data;
    this.scene = scene;
  }
}

export class Ooto_EquestrianNukeServerPacket extends Packet{
  horse_to_remove: string;

  constructor(horse_to_remove: string, lobby: string){
    super("Ooto_EquestrianNukeServerPacket", 'OotOnline', lobby, false);
    this.horse_to_remove = horse_to_remove;
  }
}