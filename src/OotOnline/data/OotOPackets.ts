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

export class Ooto_PuppetPacket extends UDPPacket {
  data: PuppetData;

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

  constructor(
    scenes: any,
    events: any,
    items: any,
    inf: any,
    skulltulas: any,
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

  constructor(model: Buffer, age: Age, lobby: string) {
    super('Ooto_AllocateModelPacket', 'OotOnline', lobby, true);
    this.model = model;
    this.age = age;
  }
}

export class Ooto_DownloadAllModelsPacket extends Packet {
  models: any;

  constructor(models: any, lobby: string) {
    super('Ooto_DownloadAllModelsPacket', 'OotOnline', lobby, false);
    this.models = models;
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

  constructor(buf: Buffer, age: Age, lobby: string) {
    super('Ooto_IconAllocatePacket', 'OotOnline', lobby, true);
    this.icon = buf;
    this.age = age;
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
