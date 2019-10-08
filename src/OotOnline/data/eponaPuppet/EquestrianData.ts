import { INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { IPosition } from 'modloader64_api/OOT/IPosition';
import { IRotation } from 'modloader64_api/OOT/IRotation';
import { IActor } from 'modloader64_api/OOT/IActor';
import uuid = require('uuid');

export interface EquestrianData {
  owner: INetworkPlayer;
  uuid: string;
  scene: number;
  pos: IPosition;
  rot: IRotation;
  anim: number;
  speed: number;
}

export class EquestrianData_Impl implements EquestrianData {
  owner: INetworkPlayer;
  uuid: string;
  scene: number;
  pos: IPosition;
  rot: IRotation;
  isSpawning?: boolean;
  isSpawned?: boolean;
  isShoveled?: boolean;
  actor?: IActor;
  anim: number;
  speed: number;

  constructor(
    owner: INetworkPlayer,
    scene: number,
    pos: IPosition,
    rot: IRotation,
    speed: number
  ) {
    this.uuid = uuid.v4();
    this.scene = scene;
    this.pos = pos;
    this.rot = rot;
    this.anim = 7;
    this.owner = owner;
    this.speed = speed;
  }
}
