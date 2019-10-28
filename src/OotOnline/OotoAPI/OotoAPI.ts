import { IPacketHeader, INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { bus } from 'modloader64_api/EventHandler';

export enum OotOnlineEvents {
  PLAYER_PUPPET_PRESPAWN = '',
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
  ON_INVENTORY_UPDATE = 'OotOnline:OnInventoryUpdate',
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
}

export function OotOnlineAPI_EnableGhostMode() {
  bus.emit(OotOnlineEvents.GHOST_MODE, {});
}

export class Ooto_CustomModelMetadata {
  model: string;
  repoints: string;

  constructor(model: string, repoints: string) {
    this.model = model;
    this.repoints = repoints;
  }
}
