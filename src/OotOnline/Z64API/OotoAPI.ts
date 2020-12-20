import { IPacketHeader, INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { bus } from 'modloader64_api/EventHandler';
import { OotOnlineStorageClient } from '@OotOnline/OotOnlineStorageClient';
import { Puppet } from '@OotOnline/data/linkPuppet/Puppet';
import { Age } from 'modloader64_api/OOT/OOTAPI';
import { Packet } from 'modloader64_api/ModLoaderDefaultImpls';

export enum Z64OnlineEvents {
  PLAYER_PUPPET_PRESPAWN = 'OotOnline:onPlayerPuppetPreSpawned',
  PLAYER_PUPPET_SPAWNED = 'OotOnline:onPlayerPuppetSpawned',
  PLAYER_PUPPET_DESPAWNED = 'OotOnline:onPlayerPuppetDespawned',
  PLAYER_PUPPET_QUERY = "OotOnline:PlayerPuppetQuery",
  SERVER_PLAYER_CHANGED_SCENES = 'OotOnline:onServerPlayerChangedScenes',
  CLIENT_REMOTE_PLAYER_CHANGED_SCENES = 'OotOnline:onRemotePlayerChangedScenes',
  GHOST_MODE = 'OotOnline:EnableGhostMode',
  GAINED_HEART_CONTAINER = 'OotOnline:GainedHeartContainer',
  GAINED_PIECE_OF_HEART = 'OotOnline:GainedPieceOfHeart',
  MAGIC_METER_INCREASED = 'OotOnline:GainedMagicMeter',
  CUSTOM_MODEL_APPLIED_ADULT = 'OotOnline:ApplyCustomModelAdult',
  CUSTOM_MODEL_APPLIED_CHILD = 'OotOnline:ApplyCustomModelChild',
  CUSTOM_MODEL_APPLIED_ANIMATIONS = 'OotOnline:ApplyCustomAnims',
  CUSTOM_MODEL_APPLIED_ICON_ADULT = 'OotOnline:ApplyCustomIconAdult',
  CUSTOM_MODEL_APPLIED_ICON_CHILD = 'OotOnline:ApplyCustomIconChild',
  ON_INVENTORY_UPDATE = 'OotOnline:OnInventoryUpdate',
  ON_EXTERNAL_ACTOR_SYNC_LOAD = 'OotOnline:OnExternalActorSyncLoad',
  ON_REGISTER_EMOTE = 'OotOnline:OnRegisterEmote',
  ON_LOAD_SOUND_PACK = "OotOnline:OnLoadSoundPack",
  ON_REMOTE_SOUND_PACK = "OotOnline:OnRemoteSoundPack",
  ON_REMOTE_PLAY_SOUND = "OotOnline:OnRemotePlaySound",
  CUSTOM_MODEL_LOAD_BUFFER_ADULT = "OotOnline:ApplyCustomModelAdultBuffer",
  CUSTOM_MODEL_LOAD_BUFFER_CHILD = "OotOnline:ApplyCustomModelChildBuffer",
  ALLOCATE_MODEL_BLOCK = "OotOnline:AllocateModelBlock",
  FORCE_LOAD_MODEL_BLOCK = "OotOnline:ForceLoadModelBlock",
  CHANGE_CUSTOM_MODEL_ADULT_GAMEPLAY = "OotOnline:ChangeCustomModelAdultGamePlay",
  CHANGE_CUSTOM_MODEL_CHILD_GAMEPLAY = "OotOnline:ChangeCustomModelChildGamePlay",
  FORCE_PUPPET_RESPAWN_IMMEDIATE = "OotOnline:ForcePuppetRespawnImmediate",
  POST_LOADED_MODELS_LIST = "OotOnline:PostLoadedModelsList",
  LOAD_EQUIPMENT_BUFFER = "OotOnline:LoadEquipmentBuffer",
  LOAD_EQUIPMENT_PAK = "OotOnline:LoadEquipmentPak",
  REFRESH_EQUIPMENT = "OotOnline:RefreshEquipment",
  CLEAR_EQUIPMENT = "OotOnline:ClearEquipment"
}

export class RemoteSoundPlayRequest {

  player: INetworkPlayer;
  puppet: any;
  sound_id: number;
  isCanceled: boolean = false;

  constructor(player: INetworkPlayer, puppet: any, sound_id: number) {
    this.player = player;
    this.puppet = puppet;
    this.sound_id = sound_id;
  }
}

export interface Z64Emote_Emote {
  name: string;
  buf: Buffer;
  sound?: Buffer;
  builtIn?: boolean;
}

export class Z64_PlayerScene {
  player: INetworkPlayer;
  lobby: string;
  scene: number;

  constructor(player: INetworkPlayer, lobby: string, scene: number) {
    this.player = player;
    this.scene = scene;
    this.lobby = lobby;
  }
}

export interface IZ64OnlineHelpers {
  sendPacketToPlayersInScene(packet: IPacketHeader): void;
  getClientStorage(): OotOnlineStorageClient | null;
}

export function Z64OnlineAPI_EnableGhostMode() {
  bus.emit(Z64OnlineEvents.GHOST_MODE, {});
}

export interface PuppetQuery {
  puppet: Puppet | undefined;
  player: INetworkPlayer;
}

export function Z64OnlineAPI_QueryPuppet(player: INetworkPlayer): PuppetQuery {
  let evt: PuppetQuery = { puppet: undefined, player } as PuppetQuery;
  bus.emit(Z64OnlineEvents.PLAYER_PUPPET_QUERY, evt);
  return evt;
}

export class Z64Online_ModelAllocation {
  model: Buffer;
  age: Age;
  slot!: number;
  pointer!: number;
  rom!: number;

  constructor(model: Buffer, age: Age) {
    this.model = model;
    this.age = age;
  }
}

export class Z64Online_EquipmentPak {
  name: string;
  data: Buffer;

  constructor(name: string, data: Buffer) {
    this.name = name;
    this.data = data;
  }
}

export class Z64_AllocateModelPacket extends Packet {
  model: Buffer;
  age: Age;
  hash: string;

  constructor(model: Buffer, age: Age, lobby: string, hash: string) {
    super('Z64OnlineLib_AllocateModelPacket', 'Z64OnlineLib', lobby, true);
    this.model = model;
    this.age = age;
    this.hash = hash;
  }
}

export class Z64_ModifyModelPacket extends Packet {
  mod: Buffer;
  offset: number;
  age: Age;

  constructor(lobby: string, mod: Buffer, offset: number, age: Age) {
    super('Z64OnlineLib_ModifyModelPacket', 'Z64OnlineLib', lobby, false);
    this.mod = mod;
    this.offset = offset;
    this.age = age;
  }
}

export class Z64_GiveModelPacket extends Packet {

  target: INetworkPlayer;

  constructor(lobby: string, player: INetworkPlayer) {
    super('Z64OnlineLib_GiveModelPacket', 'Z64OnlineLib', lobby, true);
    this.target = player;
  }
}

export class Z64_IconAllocatePacket extends Packet {
  icon: Buffer;
  age: Age;
  hash: string;

  constructor(buf: Buffer, age: Age, lobby: string, hash: string) {
    super('Z64OnlineLib_IconAllocatePacket', 'Z64OnlineLib', lobby, true);
    this.icon = buf;
    this.age = age;
    this.hash = hash;
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