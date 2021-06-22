import { INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { bus } from 'modloader64_api/EventHandler';
import { ExternalAPIProvider } from 'modloader64_api/ExternalAPIProvider';
import path from 'path';
import { IPuppet } from '@OotOnline/common/puppet/IPuppet';
import { AgeorForm, Scene, Z64Tunic } from '@OotOnline/common/types/Types';

@ExternalAPIProvider("Z64API", "3.1.0", path.resolve(__dirname))
export class Z64OnlineAPIProvider {
}

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
  ON_INVENTORY_UPDATE = 'OotOnline:OnInventoryUpdate',
  ON_EXTERNAL_ACTOR_SYNC_LOAD = 'OotOnline:OnExternalActorSyncLoad',
  ON_REGISTER_EMOTE = 'OotOnline:OnRegisterEmote',
  ON_LOAD_SOUND_PACK = "OotOnline:OnLoadSoundPack",
  POST_LOADED_SOUND_LIST = "OotOnline:PostLoadedSoundList",
  ON_SELECT_SOUND_PACK = "OotOnline:OnSelectSoundPack",
  ON_REMOTE_SOUND_PACK = "OotOnline:OnRemoteSoundPack",
  ON_REMOTE_PLAY_SOUND = "OotOnline:OnRemotePlaySound",
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
  SAVE_DATA_ITEM_SET = 'OotOnline:SAVE_DATA_ITEM_SET',
  LOCAL_MODEL_CHANGE_FINISHED = "OotOnline:LOCAL_MODEL_CHANGE_FINISHED",
  CUSTOM_ANIMATION_BANK_REGISTER = "OotOnline:CUSTOM_ANIMATION_BANK_REGISTER",
  FORCE_CUSTOM_ANIMATION_BANK = "OotOnline:FORCE_CUSTOM_ANIMATION_BANK",
  CUSTOM_ANIMATION_BANK_EQUIPPED = "OotOnline:CUSTOM_ANIMATION_BANK_EQUIPPED"
}

export class Z64Online_LocalModelChangeProcessEvt {
  adult: IModelReference;
  child: IModelReference;

  constructor(adult: IModelReference, child: IModelReference) {
    this.adult = adult;
    this.child = child;
  }
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
  onTunicChanged(ref: IModelReference, tunic: Z64Tunic): IModelReference;
  onHealthChanged(max: number, health: number, ref: IModelReference): IModelReference;
  onTick(): void;
}

export function DumpRam() {
  bus.emit(Z64OnlineEvents.DEBUG_DUMP_RAM, {});
}

export class RemoteSoundPlayRequest {

  player: INetworkPlayer;
  pos: Buffer;
  sound_id: number;
  isCanceled: boolean = false;

  constructor(player: INetworkPlayer, pos: Buffer, sound_id: number) {
    this.player = player;
    this.pos = pos;
    this.sound_id = sound_id;
  }
}

export interface Z64Emote_Emote {
  name: string;
  buf: Buffer;
  sound?: Buffer;
  loops: boolean;
}

export class Z64_PlayerScene {
  player: INetworkPlayer;
  lobby: string;
  scene: Scene;

  constructor(player: INetworkPlayer, lobby: string, scene: Scene) {
    this.player = player;
    this.scene = scene;
    this.lobby = lobby;
  }
}

export function Z64OnlineAPI_EnableGhostMode() {
  bus.emit(Z64OnlineEvents.GHOST_MODE, {});
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
  age: AgeorForm;
  ref!: IModelReference;
  script: IModelScript | undefined;

  constructor(model: Buffer, age: AgeorForm) {
    this.model = model;
    this.age = age;
  }
}

export class Z64Online_EquipmentPak {
  name: string;
  data: Buffer;
  remove: boolean = false;

  constructor(name: string, data: Buffer) {
    this.name = name;
    this.data = data;
  }
}

export class Z64_SaveDataItemSet {
  key: string;
  value: boolean | number | Buffer;

  constructor(key: string, value: boolean | number | Buffer) {
    this.key = key;
    this.value = value;
  }
}

export class Z64_AnimationBank {
  name: string;
  bank: Buffer;

  constructor(name: string, bank: Buffer) {
    this.name = name;
    this.bank = bank;
  }
}

export interface PuppetQuery {
  puppet: IPuppet | undefined;
  player: INetworkPlayer;
}

export function Z64OnlineAPI_QueryPuppet(player: INetworkPlayer): PuppetQuery {
  let evt: PuppetQuery = { puppet: undefined, player } as PuppetQuery;
  bus.emit(Z64OnlineEvents.PLAYER_PUPPET_QUERY, evt);
  return evt;
}