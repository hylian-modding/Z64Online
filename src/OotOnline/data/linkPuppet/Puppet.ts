import { Age, IOOTCore, IOvlPayloadResult } from 'modloader64_api/OOT/OOTAPI';
import { PuppetData } from './PuppetData';
import { INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { Command } from 'modloader64_api/OOT/ICommandBuffer';
import { bus } from 'modloader64_api/EventHandler';
import { OotOnlineEvents, IOotOnlineHelpers } from '../../OotoAPI/OotoAPI';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { IPuppet } from '../../OotoAPI/IPuppet';
import Vector3 from 'modloader64_api/math/Vector3';
import { HorseData } from './HorseData';
import fs from 'fs';
import path from 'path';
import { IActor } from 'modloader64_api/OOT/IActor';

const DEADBEEF_OFFSET: number = 0x288;

export class Puppet implements IPuppet {
  player: INetworkPlayer;
  id: string;
  data: PuppetData;
  isSpawned = false;
  isSpawning = false;
  isShoveled = false;
  scene: number;
  age: Age;
  core: IOOTCore;
  void!: Vector3;
  ModLoader: IModLoaderAPI;
  horse!: HorseData;
  parent: IOotOnlineHelpers;

  constructor(
    player: INetworkPlayer,
    core: IOOTCore,
    pointer: number,
    ModLoader: IModLoaderAPI,
    parent: IOotOnlineHelpers
  ) {
    this.player = player;
    this.data = new PuppetData(pointer, ModLoader, core);
    this.scene = 81;
    this.age = 1;
    this.ModLoader = ModLoader;
    this.core = core;
    this.id = this.ModLoader.utils.getUUID();
    this.parent = parent;
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
      this.isSpawning = true;
      this.data.pointer = 0x0;
      bus.emit(OotOnlineEvents.PLAYER_PUPPET_PRESPAWN, this);
      (this.parent.clientStorage.overlayCache["link_no_pvp.ovl"] as IOvlPayloadResult).spawn((this.parent.clientStorage.overlayCache["link_no_pvp.ovl"] as IOvlPayloadResult), (success: boolean, result: number)=>{
        if (success) {
          this.data.pointer = result & 0x00ffffff;
          this.doNotDespawnMe(this.data.pointer);
          if (this.hasAttachedHorse()) {
            let horse: number = this.getAttachedHorse();
            this.doNotDespawnMe(horse);
            this.horse = new HorseData(this.core.link, this, this.core);
          }
          bus.emit(OotOnlineEvents.PLAYER_PUPPET_SPAWNED, this);
          this.void = this.ModLoader.math.rdramReadV3(this.data.pointer + 0x24);
          this.isSpawned = true;
          this.isSpawning = false;
        }
        return {};
      });
    }
  }

  processIncomingPuppetData(data: PuppetData) {
    if (this.isSpawned && !this.isShoveled) {
      if (this.ModLoader.emulator.rdramRead32(this.data.pointer + DEADBEEF_OFFSET) === 0xDEADBEEF) {
        Object.keys(data).forEach((key: string) => {
          (this.data as any)[key] = (data as any)[key];
        });
      } else {
        this.ModLoader.logger.error("Rogue puppet detected. Destroying...");
        bus.emit("OotOnline:RoguePuppet", this);
      }
    }
  }

  processIncomingHorseData(data: HorseData) {
    if (this.isSpawned && !this.isShoveled && this.horse !== undefined) {
      Object.keys(data).forEach((key: string) => {
        (this.horse as any)[key] = (data as any)[key];
      });
    }
  }

  shovel() {
    if (this.isSpawned) {
      if (this.data.pointer > 0) {
        if (this.ModLoader.emulator.rdramRead32(this.data.pointer + DEADBEEF_OFFSET) === 0xDEADBEEF) {
          if (this.getAttachedHorse() > 0) {
            let horse: number = this.getAttachedHorse();
            this.ModLoader.math.rdramWriteV3(horse + 0x24, this.void);
          }
          this.ModLoader.math.rdramWriteV3(this.data.pointer + 0x24, this.void);
        }
        this.ModLoader.logger.debug('Puppet ' + this.id + ' shoveled.');
        this.isShoveled = true;
      }
    }
  }

  despawn() {
    if (this.isSpawned) {
      if (this.data.pointer > 0) {
        if (this.ModLoader.emulator.rdramRead32(this.data.pointer + DEADBEEF_OFFSET) === 0xDEADBEEF) {
          if (this.getAttachedHorse() > 0) {
            let horse: number = this.getAttachedHorse();
            this.ModLoader.emulator.rdramWrite32(horse + 0x130, 0x0);
            this.ModLoader.emulator.rdramWrite32(horse + 0x134, 0x0);
          }
          this.ModLoader.emulator.rdramWrite32(this.data.pointer + 0x130, 0x0);
          this.ModLoader.emulator.rdramWrite32(this.data.pointer + 0x134, 0x0);
          this.data.pointer = 0;
        }
      }
      this.isSpawned = false;
      this.isShoveled = false;
      this.ModLoader.logger.debug('Puppet ' + this.id + ' despawned.');
      bus.emit(OotOnlineEvents.PLAYER_PUPPET_DESPAWNED, this);
    }
  }

  getAttachedHorse(): number {
    return this.ModLoader.emulator.dereferencePointer(this.data.pointer + 0x011C);
  }

  hasAttachedHorse(): boolean {
    return this.ModLoader.emulator.rdramRead32(this.data.pointer + 0x011C) > 0;
  }
}
