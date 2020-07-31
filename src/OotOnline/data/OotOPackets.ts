import {
  Packet,
  packetHelper,
  UDPPacket,
} from 'modloader64_api/ModLoaderDefaultImpls';
import { PuppetData } from './linkPuppet/PuppetData';
import {
  Age,
  InventoryItem,
} from 'modloader64_api/OOT/OOTAPI';
import {
  IEquipmentSave,
  IQuestSave,
  IDungeonItemSave,
  InventorySave,
} from './OotoSaveData';
import { ActorPacketData } from './ActorHookBase';
import { HorseData } from './linkPuppet/HorseData';
import { INetworkPlayer } from 'modloader64_api/NetworkHandler';

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
  inventory: InventorySave;
  equipment: IEquipmentSave;
  quest: IQuestSave;
  dungeonItems: IDungeonItemSave;

  constructor(
    save: InventorySave,
    equipment: IEquipmentSave,
    quest: IQuestSave,
    dungeonItems: IDungeonItemSave,
    lobby: string
  ) {
    super('Ooto_SubscreenSyncPacket', 'OotOnline', lobby, false);
    this.inventory = save;
    this.equipment = equipment;
    this.quest = quest;
    this.dungeonItems = dungeonItems;
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
  subscreen: Ooto_SubscreenSyncPacket;
  flags: Ooto_ServerFlagUpdate;
  bank: Ooto_BankSyncPacket;

  constructor(
    subscreen: Ooto_SubscreenSyncPacket,
    scenes: Ooto_ServerFlagUpdate,
    bank: Ooto_BankSyncPacket,
    lobby: string
  ) {
    super('Ooto_DownloadResponsePacket', 'OotOnline', lobby, false);
    this.subscreen = subscreen;
    this.flags = scenes;
    this.bank = bank;
    packetHelper.cloneDestination(this, this.subscreen);
    packetHelper.cloneDestination(this, this.flags);
    packetHelper.cloneDestination(this, this.bank);
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
  scenes: Buffer;
  events: Buffer;
  items: Buffer;
  inf: Buffer;
  skulltulas: Buffer;

  constructor(
    scenes: Buffer,
    events: Buffer,
    items: Buffer,
    inf: Buffer,
    skulltulas: Buffer,
    lobby: string
  ) {
    super('Ooto_ClientFlagUpdate', 'OotOnline', lobby, false);
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

  constructor(
    scenes: Buffer,
    events: Buffer,
    items: Buffer,
    inf: Buffer,
    skulltulas: Buffer,
    lobby: string
  ) {
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
  scene: number;

  constructor(
    chests: Buffer,
    switches: Buffer,
    collect: Buffer,
    clear: Buffer,
    temp: Buffer,
    lobby: string,
    scene: number
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
  scene: number;
  room: number;

  constructor(
    data: ActorPacketData,
    scene: number,
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
  scene: number;
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
  scene: number;
  constructor(
    data: ActorPacketData,
    scene: number,
    room: number,
    lobby: string
  ) {
    super('Ooto_SpawnActorPacket', 'OotOnline', lobby, true);
    this.actorData = data;
    this.scene = scene;
    this.room = room;
  }
}

export class Ooto_AllocateModelPacket extends Packet {
  model: Buffer;
  age: Age;
  hash: string;

  constructor(model: Buffer, age: Age, lobby: string, hash: string) {
    super('Ooto_AllocateModelPacket', 'OotOnline', lobby, true);
    this.model = model;
    this.age = age;
    this.hash = hash;
  }
}

export class OotO_ModifyModelPacket extends Packet{
  mod: Buffer;
  offset: number;
  age: Age;

  constructor(lobby: string, mod: Buffer, offset: number, age: Age){
    super('OotO_ModifyModelPacket', 'OotOnline', lobby, false);
    this.mod = mod;
    this.offset = offset;
    this.age = age;
  }
}

export class OotO_GiveModelPacket extends Packet {

  target: INetworkPlayer;

  constructor(lobby: string, player: INetworkPlayer) {
    super('OotO_GiveModelPacket', 'OotOnline', lobby, true);
    this.target = player;
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

export class Ooto_IconAllocatePacket extends Packet {
  icon: Buffer;
  age: Age;
  hash: string;

  constructor(buf: Buffer, age: Age, lobby: string, hash: string) {
    super('Ooto_IconAllocatePacket', 'OotOnline', lobby, true);
    this.icon = buf;
    this.age = age;
    this.hash = hash;
  }
}

export class Ooto_SceneGUIPacket extends Packet {
  scene: number;
  age: Age;
  iconAdult!: string;
  iconChild!: string;

  constructor(
    scene: number,
    age: Age,
    lobby: string,
    iconAdult?: Buffer,
    iconChild?: Buffer
  ) {
    super('Ooto_SceneGUIPacket', 'OotOnline', lobby, false);
    this.scene = scene;
    this.age = age;
    if (iconAdult !== undefined) {
      this.iconAdult = iconAdult.toString('base64');
    }
    if (iconChild !== undefined) {
      this.iconChild = iconChild.toString('base64');
    }
  }

  setAdultIcon(iconAdult: Buffer) {
    this.iconAdult = iconAdult.toString('base64');
  }

  setChildIcon(iconChild: Buffer) {
    this.iconChild = iconChild.toString('base64');
  }
}

export class OotO_isRandoPacket extends Packet {

  isRando: boolean = true;

  constructor(lobby: string) {
    super("OotO_isRandoPacket", "OotOnline", lobby, false);
  }
}