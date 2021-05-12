import { Age, IOOTCore, IOvlPayloadResult } from 'modloader64_api/OOT/OOTAPI';
import { PuppetData } from './PuppetData';
import { INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { bus } from 'modloader64_api/EventHandler';
import { Z64OnlineEvents, IZ64OnlineHelpers, RemoteSoundPlayRequest } from '../../Z64API/OotoAPI';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import Vector3 from 'modloader64_api/math/Vector3';
import { HorseData } from './HorseData';
import fs from 'fs';

export class Puppet {
  player: INetworkPlayer;
  id: string;
  data: PuppetData;
  isSpawned = false;
  isSpawning = false;
  isShoveled = false;
  scene: number;
  core: IOOTCore;
  void!: Vector3;
  ModLoader: IModLoaderAPI;
  horse: HorseData | undefined;
  horseSpawning: boolean = false;
  parent: IZ64OnlineHelpers;

  constructor(
    player: INetworkPlayer,
    core: IOOTCore,
    pointer: number,
    ModLoader: IModLoaderAPI,
    parent: IZ64OnlineHelpers
  ) {
    this.player = player;
    this.data = new PuppetData(pointer, ModLoader);
    this.scene = 81;
    this.ModLoader = ModLoader;
    this.core = core;
    this.id = this.ModLoader.utils.getUUID();
    this.parent = parent;
  }

  get age(): Age {
    return this.data.age;
  }

  debug_movePuppetToPlayer() {
    let t = JSON.stringify(this.data);
    let copy = JSON.parse(t);
    Object.keys(copy).forEach((key: string) => {
      (this.data as any)[key] = copy[key];
    });
  }

  doNotDespawnMe(p: number) {
    this.ModLoader.emulator.rdramWrite8(p + 0x3, 0xff);
  }

  spawn() {
    if (this.isShoveled) {
      this.isShoveled = false;
      this.ModLoader.logger.debug('Puppet resurrected.');
      return;
    }
    if (!this.isSpawned && !this.isSpawning) {
      bus.emit(Z64OnlineEvents.PLAYER_PUPPET_PRESPAWN, this);
      this.isSpawning = true;
      this.data.pointer = 0x0;
      (this.parent.getClientStorage()!.overlayCache["puppet.ovl"] as IOvlPayloadResult).spawn((this.parent.getClientStorage()!.overlayCache["puppet.ovl"] as IOvlPayloadResult), (success: boolean, result: number) => {
        if (success) {
          this.data.pointer = result;
          this.doNotDespawnMe(this.data.pointer);
          this.void = this.ModLoader.math.rdramReadV3(this.data.pointer + 0x24);
          this.isSpawned = true;
          this.isSpawning = false;
          bus.emit(Z64OnlineEvents.PLAYER_PUPPET_SPAWNED, this);
        }
      });
    }
  }

  processIncomingPuppetData(data: PuppetData, remote: RemoteSoundPlayRequest) {
    if (this.isSpawned && !this.isShoveled) {
      this.data.ageLastFrame = this.age;
      Object.keys(data).forEach((key: string) => {
        if (key === "sound") {
          if (!remote.isCanceled) {
            (this.data as any)[key] = (data as any)[key];
          }
        } else {
          (this.data as any)[key] = (data as any)[key];
        }
      });
      if (this.data.ageLastFrame !== this.age) {
        bus.emit(Z64OnlineEvents.PUPPET_AGE_CHANGED, this);
      }
    }
  }

  processIncomingHorseData(data: HorseData) {
    if (this.horse === undefined && !this.horseSpawning) {
      this.horseSpawning = true;
      (this.parent.getClientStorage()?.overlayCache["horse-3.ovl"] as IOvlPayloadResult).spawn(this.parent.getClientStorage()?.overlayCache["horse-3.ovl"], (success: boolean, result: number) => {
        if (success) {
          this.horse = new HorseData(result, this, this.core);
        }
        this.horseSpawning = false;
      });
    }
    if (this.isSpawned && !this.isShoveled && this.horse !== undefined && !this.horseSpawning) {
      Object.keys(data).forEach((key: string) => {
        (this.horse as any)[key] = (data as any)[key];
      });
    }
  }

  shovel() {
    if (this.isSpawned) {
      if (this.data.pointer > 0) {
        if (this.horse !== undefined){
          this.ModLoader.math.rdramWriteV3(this.horse.pointer + 0x24, this.void);
          this.ModLoader.logger.debug(`Horse for puppet ${this.id} shoveled.`);
        }
        this.ModLoader.math.rdramWriteV3(this.data.pointer + 0x24, this.void);
        this.ModLoader.logger.debug('Puppet ' + this.id + ' shoveled.');
        this.isShoveled = true;
      }
    }
  }

  despawn() {
    if (this.isSpawned) {
      if (this.data.pointer > 0) {
        if (this.horse !== undefined){
          this.horse.puppet.rdramWrite32(0x130, 0x0);
          this.horse.puppet.rdramWrite32(0x134, 0x0);
          this.horse = undefined;
        }
        this.ModLoader.emulator.rdramWrite32(this.data.pointer + 0x130, 0x0);
        this.ModLoader.emulator.rdramWrite32(this.data.pointer + 0x134, 0x0);
        this.data.pointer = 0;
      }
      this.isSpawned = false;
      this.isShoveled = false;
      this.ModLoader.logger.debug('Puppet ' + this.id + ' despawned.');
      bus.emit(Z64OnlineEvents.PLAYER_PUPPET_DESPAWNED, this);
    }
  }


  hasAttachedHorse(): boolean {
    return this.ModLoader.emulator.rdramRead32(this.data.pointer + 0x011C) > 0;
  }
}
