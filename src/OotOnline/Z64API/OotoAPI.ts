import { IPacketHeader, INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { bus } from 'modloader64_api/EventHandler';
import { OotOnlineStorageClient } from '@OotOnline/OotOnlineStorageClient';
import { Puppet } from '@OotOnline/data/linkPuppet/Puppet';
import { Age, Tunic } from 'modloader64_api/OOT/OOTAPI';
import { Packet } from 'modloader64_api/ModLoaderDefaultImpls';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';

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
  CUSTOM_MODEL_APPLIED_ADULT = 'OotOnline:ApplyCustomModelAdult', // deprecated - use CUSTOM_MODEL_LOAD_ADULT
  CUSTOM_MODEL_APPLIED_CHILD = 'OotOnline:ApplyCustomModelChild', // deprecated - use CUSTOM_MODEL_LOAD_CHILD
  CUSTOM_MODEL_APPLIED_ANIMATIONS = 'OotOnline:ApplyCustomAnims',
  CUSTOM_MODEL_APPLIED_ICON_ADULT = 'OotOnline:ApplyCustomIconAdult',
  CUSTOM_MODEL_APPLIED_ICON_CHILD = 'OotOnline:ApplyCustomIconChild',
  ON_INVENTORY_UPDATE = 'OotOnline:OnInventoryUpdate',
  ON_EXTERNAL_ACTOR_SYNC_LOAD = 'OotOnline:OnExternalActorSyncLoad',
  ON_REGISTER_EMOTE = 'OotOnline:OnRegisterEmote',
  ON_LOAD_SOUND_PACK = "OotOnline:OnLoadSoundPack",
  POST_LOADED_SOUND_LIST = "OotOnline:PostLoadedSoundList",
  ON_SELECT_SOUND_PACK = "OotOnline:OnSelectSoundPack",
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
  CLEAR_EQUIPMENT = "OotOnline:ClearEquipment",
  EQUIPMENT_ZOBJ_LOADED = "OotOnline:EqZobjLoad",
  EQUIPMENT_LOAD_START = "OotOnline:EqZobjLoadStart",
  EQUIPMENT_LOAD_END = "OotOnline:EqZobjLoadEnd",
  DEBUG_DUMP_RAM = "OotOnline:DumpRam",
  PUPPETS_CLEAR = "OotOnline:PuppetsClear",
  ON_MODEL_MANAGER_READY = "OotOnline:ON_MODEL_MANAGER_READY",
  CUSTOM_MODEL_LOAD_ADULT = "OotOnline:CUSTOM_MODEL_LOAD_ADULT",
  CUSTOM_MODEL_LOAD_CHILD = "OotOnline:CUSTOM_MODEL_LOAD_CHILD",
  PUPPET_AGE_CHANGED = 'OotOnline:PUPPET_AGE_CHANGED',
  SAVE_DATA_ITEM_SET = 'OotOnline:SAVE_DATA_ITEM_SET'
}

export function registerModel(model: Buffer, noautoGC: boolean = false): IModelReference {
  let evt = new Z64Online_ModelAllocation(model, 0x69);
  bus.emit(Z64OnlineEvents.ALLOCATE_MODEL_BLOCK, evt);
  evt.ref.isPlayerModel = !noautoGC;
  return evt.ref;
}

export interface IModelScript {
  onModelEquipped(): void;
  onModelRemoved(): void;
  onSceneChange(scene: number, ref: IModelReference): IModelReference;
  onDay(ref: IModelReference): IModelReference;
  onNight(ref: IModelReference): IModelReference;
  onTunicChanged(ref: IModelReference, tunic: Tunic): IModelReference;
  onHealthChanged(max: number, health: number, ref: IModelReference): IModelReference;
  onTick(): void;
}

export function DumpRam() {
  bus.emit(Z64OnlineEvents.DEBUG_DUMP_RAM, {});
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
  loops: boolean;
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

export interface IModelReference {
  hash: string;
  pointer: number;
  isDead: boolean;
  isPlayerModel: boolean;
  isLoaded: boolean;
  loadModel(): boolean;
  unregister(): boolean;
  script: IModelScript | undefined;
}

export class Z64Online_ModelAllocation {
  name: string = "";
  model: Buffer;
  age: Age;
  ref!: IModelReference;
  script!: IModelScript;

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

export class Z64_SaveDataItemSet{
  key: string;
  value: boolean | number;

  constructor(key: string, value: boolean | number){
    this.key = key;
    this.value = value;
  }
}