import { Age, IOOTCore } from 'modloader64_api/OOT/OOTAPI';
import { PuppetData } from './PuppetData';
import { INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { Command } from 'modloader64_api/OOT/ICommandBuffer';
import { bus } from 'modloader64_api/EventHandler';
import { OotOnlineEvents } from '../../OotoAPI/OotoAPI';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { IPuppet } from '../../OotoAPI/IPuppet';
import fse from 'fs-extra';
import Vector3 from 'modloader64_api/math/Vector3';

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
  reload: any;

  constructor(
    player: INetworkPlayer,
    core: IOOTCore,
    pointer: number,
    ModLoader: IModLoaderAPI
  ) {
    this.player = player;
    this.data = new PuppetData(pointer, ModLoader, core);
    this.scene = 81;
    this.age = 1;
    this.ModLoader = ModLoader;
    this.core = core;
    this.id = this.ModLoader.utils.getUUID();
  }

  debug_movePuppetToPlayer() {
    let t = JSON.stringify(this.data);
    let copy = JSON.parse(t);
    Object.keys(copy).forEach((key: string) => {
      (this.data as any)[key] = copy[key];
    });
  }

  doNotDespawnMe() {
    this.ModLoader.emulator.rdramWrite8(this.data.pointer + 0x3, 0xff);
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
      this.core.commandBuffer.runCommand(Command.SPAWN_ACTOR, 0x80600140, (success: boolean, result: number) => {
        if (success) {
          this.data.pointer = result & 0x00ffffff;
          this.doNotDespawnMe();
          bus.emit(OotOnlineEvents.PLAYER_PUPPET_SPAWNED, this);
          this.void = this.ModLoader.math.rdramReadV3(this.data.pointer + 0x24);
          this.isSpawned = true;
          this.isSpawning = false;
        }
      }
      );
    }
  }

  processIncomingPuppetData(data: PuppetData) {
    if (this.isSpawned && !this.isShoveled) {
      Object.keys(data).forEach((key: string) => {
        (this.data as any)[key] = (data as any)[key];
      });
    }
  }

  shovel() {
    if (this.isSpawned) {
      if (this.data.pointer > 0) {
        if (this.getAttachedHorse() > 0) {
          let horse: number = this.getAttachedHorse() & 0x00ffffff;
          this.ModLoader.math.rdramWriteV3(horse + 0x24, this.void);
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
        if (this.getAttachedHorse() > 0) {
          let horse: number = this.getAttachedHorse() & 0x00ffffff;
          this.ModLoader.emulator.rdramWrite32(horse + 0x130, 0x0);
          this.ModLoader.emulator.rdramWrite32(horse + 0x134, 0x0);
        }
        this.ModLoader.emulator.rdramWrite32(this.data.pointer + 0x130, 0x0);
        this.ModLoader.emulator.rdramWrite32(this.data.pointer + 0x134, 0x0);
        this.data.pointer = 0;
      }
      this.isSpawned = false;
      this.isShoveled = false;
      this.ModLoader.logger.debug('Puppet ' + this.id + ' despawned.');
      bus.emit(OotOnlineEvents.PLAYER_PUPPET_DESPAWNED, this);
      clearInterval(this.reload);
    }
  }

  getAttachedHorse(): number {
    return this.ModLoader.emulator.rdramRead32(this.data.pointer + 0x011C);
  }
}
