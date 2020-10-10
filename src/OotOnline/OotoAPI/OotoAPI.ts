import { IPacketHeader, INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { bus } from 'modloader64_api/EventHandler';
import { OotOnlineStorageClient } from '@OotOnline/OotOnlineStorageClient';
import { Puppet } from '@OotOnline/data/linkPuppet/Puppet';
import { Age } from 'modloader64_api/OOT/OOTAPI';

export enum OotOnlineEvents {
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
  CUSTOM_MODEL_OVERRIDE_ADULT = 'OotOnline:OverrideCustomModelAdult',
  CUSTOM_MODEL_OVERRIDE_CHILD = 'OotOnline:OverrideCustomModelChild',
  ON_INVENTORY_UPDATE = 'OotOnline:OnInventoryUpdate',
  ON_EXTERNAL_ACTOR_SYNC_LOAD = 'OotOnline:OnExternalActorSyncLoad',
  ON_REGISTER_EMOTE = 'OotOnline:OnRegisterEmote',
  ON_LOAD_SOUND_PACK = "OotOnline:OnLoadSoundPack",
  ON_REMOTE_SOUND_PACK = "OotOnline:OnRemoteSoundPack",
  ON_REMOTE_PLAY_SOUND = "OotOnline:OnRemotePlaySound",
  CUSTOM_MODEL_LOAD_BUFFER_ADULT = "OotOnline:ApplyCustomModelAdultBuffer",
  CUSTOM_MODEL_LOAD_BUFFER_CHILD = "OotOnline:ApplyCustomModelChildBuffer",
  ALLOCATE_MODEL_BLOCK = "OotOnline:AllocateModelBlock",
  FORCE_LOAD_MODEL_BLOCK = "OotOnline:ForceLoadModelBlock"
}

export class RemoteSoundPlayRequest{

  player: INetworkPlayer;
  puppet: any;
  sound_id: number;
  isCanceled: boolean = false;

  constructor(player: INetworkPlayer, puppet: any, sound_id: number){
    this.player = player;
    this.puppet = puppet;
    this.sound_id = sound_id;
  }
}

export interface OotOnline_Emote {
  name: string;
  buf: Buffer;
  sound?: Buffer;
  builtIn?: boolean;
}

export class OotOnline_PlayerScene {
  player: INetworkPlayer;
  lobby: string;
  scene: number;

  constructor(player: INetworkPlayer, lobby: string, scene: number) {
    this.player = player;
    this.scene = scene;
    this.lobby = lobby;
  }
}

export interface IOotOnlineHelpers {
  sendPacketToPlayersInScene(packet: IPacketHeader): void;
  getClientStorage(): OotOnlineStorageClient | null;
}

export function OotOnlineAPI_EnableGhostMode() {
  bus.emit(OotOnlineEvents.GHOST_MODE, {});
}

export interface PuppetQuery{
  puppet: Puppet | undefined;
  player: INetworkPlayer;
}

export function OotOnlineAPI_QueryPuppet(player: INetworkPlayer): PuppetQuery{
  let evt: PuppetQuery = {puppet: undefined, player} as PuppetQuery;
  bus.emit(OotOnlineEvents.PLAYER_PUPPET_QUERY, evt);
  return evt;
}

export class OotOnline_ModelAllocation{
  model: Buffer;
  age: Age;
  slot!: number;
  pointer!: number;

  constructor(model: Buffer, age: Age){
    this.model = model;
    this.age = age;
  }
}