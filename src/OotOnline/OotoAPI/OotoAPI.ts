import { IPacketHeader, INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { bus } from 'modloader64_api/EventHandler';
import { OotOnlineStorageClient } from '@OotOnline/OotOnlineStorageClient';

export enum OotOnlineEvents {
  PLAYER_PUPPET_PRESPAWN = 'OotOnline:onPlayerPuppetPreSpawned',
  PLAYER_PUPPET_SPAWNED = 'OotOnline:onPlayerPuppetSpawned',
  PLAYER_PUPPET_DESPAWNED = 'OotOnline:onPlayerPuppetDespawned',
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
  CUSTOM_MODEL_APPLIED_EQUIPMENT = "OotOnline:ApplyCustomEquipment",
  CUSTOM_MODEL_APPLIED_ADULT_MATRIX_SWORD_BACK = "OotOnline:CUSTOM_MODEL_APPLIED_ADULT_MATRIX_SWORD_BACK",
  CUSTOM_MODEL_APPLIED_ADULT_MATRIX_SHIELD_BACK = "OotOnline:CUSTOM_MODEL_APPLIED_ADULT_MATRIX_MATRIX_SHIELD_BACK",
  CUSTOM_MODEL_APPLIED_CHILD_MATRIX_SWORD_BACK = "OotOnline:CUSTOM_MODEL_APPLIED_CHILD_MATRIX_SWORD_BACK",
  CUSTOM_MODEL_APPLIED_CHILD_MATRIX_SHIELD_BACK = "OotOnline:CUSTOM_MODEL_APPLIED_CHILD_MATRIX_SHIELD_BACK",
  CUSTOM_MODEL_APPLIED_CHILD_MATRIX_ITEM_SHIELD = "OotOnline:CUSTOM_MODEL_APPLIED_CHILD_MATRIX_ITEM_SHIELD",
  ON_INVENTORY_UPDATE = 'OotOnline:OnInventoryUpdate',
  ON_EXTERNAL_ACTOR_SYNC_LOAD = 'OotOnline:OnExternalActorSyncLoad',
  ON_REGISTER_EMOTE = 'OotOnline:OnRegisterEmote'
}

export interface OotOnline_Emote {
  buf: Buffer;
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
  clientStorage: OotOnlineStorageClient;
}

export function OotOnlineAPI_EnableGhostMode() {
  bus.emit(OotOnlineEvents.GHOST_MODE, {});
}

export interface ICustomEquipment {
  zobj: string;
  txt: string;
}
