import {
  Packet
} from 'modloader64_api/ModLoaderDefaultImpls';
import {
  AgeOrForm,
} from 'Z64Lib/API/Common/Z64API';

import { INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { IKeyRing } from '@Z64Online/common/save/IKeyRing';
import { Scene } from '../types/Types';
import { RemoteSoundPlayRequest } from '../api/Z64API';

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

export class Z64O_BottleUpdatePacket extends Packet {
  slot: number;
  contents: number;

  constructor(slot: number, contents: number, lobby: string) {
    super('Z64O_BottleUpdatePacket', 'Z64Online', lobby, true);
    this.slot = slot;
    this.contents = contents;
  }
}

export class Z64O_ModelPacket extends Packet {

  hashes: string[];

  constructor(lobby: string, hashes: string[]) {
    super("Z64O_ModelPacket", "Z64Online", lobby);
    this.hashes = hashes;
  }

}

export class Z64_GiveModelPacket extends Packet {

  target: INetworkPlayer;

  constructor(lobby: string, player: INetworkPlayer) {
    super('Z64OnlineLib_GiveModelPacket', 'Z64Online', lobby, true);
    this.target = player;
  }
}

export class Z64_EquipmentPakPacket extends Packet {
  ids: Array<string> = [];
  age: AgeOrForm;

  constructor(age: AgeOrForm, lobby: string) {
    super('Z64OnlineLib_EquipmentPakPacket', 'Z64Online', lobby, true);
    this.age = age;
  }
}

export class Z64O_RomFlagsPacket extends Packet {
  isRando: boolean;
  isVanilla: boolean;
  hasFastBunHood: boolean;
  hasPotsanity: boolean;
  potsanityFlagSize: number;

  constructor(lobby: string, isRando: boolean, isVanilla: boolean, hasFastBunHood: boolean, hasPotsanity: boolean, potsanityFlagSize: number) {
    super('Z64O_RomFlagsPacket', 'Z64Online', lobby, false);
    this.isRando = isRando;
    this.hasFastBunHood = hasFastBunHood;
    this.isVanilla = isVanilla;
    this.hasPotsanity = hasPotsanity;
    this.potsanityFlagSize = potsanityFlagSize;
  }
}

export class Z64O_ErrorPacket extends Packet {

  message: string;

  constructor(msg: string, lobby: string) {
    super('Z64O_ErrorPacket', 'Z64Online', lobby, false);
    this.message = msg;
  }

}

export class Z64O_EmoteLoadPacket extends Packet {
  id: string;

  constructor(id: string, lobby: string) {
    super('Z64O_EmoteLoadPacket', 'Z64Online', lobby, true);
    this.id = id;
  }
}

export class Z64O_EmoteRequestPacket extends Packet {
  constructor(lobby: string) {
    super('Z64O_EmoteRequestPacket', 'Z64Online', lobby, true);
  }
}

export class Z64O_EmotePlayPacket extends Packet {
  req: RemoteSoundPlayRequest;

  constructor(req: RemoteSoundPlayRequest, lobby: string) {
    super('Z64O_EmotePlayPacket', 'Z64Online', lobby, true);
    this.req = req;
  }
}

export class Z64O_PuppetPacket extends Packet{
  update: Buffer;

  constructor(lobby: string, update: Buffer){
    super('Z64O_PuppetPacket', 'Z64Online', lobby, false);
    this.update = update;
  }
}