import uuid from 'uuid';
import { Age, IOOTCore } from 'modloader64_api/OOT/OOTAPI';
import { PuppetData } from './PuppetData';
import { INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { Command } from 'modloader64_api/OOT/ICommandBuffer';
import { bus } from 'modloader64_api/EventHandler';
import { OotOnlineEvents } from '../../OotoAPI/OotoAPI';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { IPuppet } from '../../OotoAPI/IPuppet';

export class Puppet implements IPuppet{
  player: INetworkPlayer;
  id: string;
  data: PuppetData;
  isSpawned = false;
  isSpawning = false;
  isShoveled = false;
  scene: number;
  age: Age;
  core: IOOTCore;
  void!: Buffer;
  ModLoader: IModLoaderAPI;

  constructor(
    player: INetworkPlayer,
    core: IOOTCore,
    pointer: number,
    ModLoader: IModLoaderAPI
  ) {
    this.player = player;
    this.id = uuid.v4();
    this.data = new PuppetData(pointer, ModLoader, core);
    this.scene = 81;
    this.age = 1;
    this.ModLoader = ModLoader;
    this.core = core;
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
      console.log('Puppet resurrected.');
      return;
    }
    if (!this.isSpawned && !this.isSpawning) {
      this.isSpawning = true;
      this.data.pointer = 0x0;
      bus.emit(OotOnlineEvents.PLAYER_PUPPET_PRESPAWN, this);
      this.core.commandBuffer.runCommand(
        Command.SPAWN_ACTOR,
        0x80600140,
        (success: boolean, result: number) => {
          if (success) {
            console.log(result.toString(16));
            this.data.pointer = result & 0x00ffffff;
            console.log('Puppet spawned!');
            console.log(this.data.pointer.toString(16));
            this.doNotDespawnMe();
            bus.emit(OotOnlineEvents.PLAYER_PUPPET_SPAWNED, this);
            this.void = this.ModLoader.emulator.rdramReadBuffer(
              this.data.pointer + 0x24,
              0xc
            );
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
        this.ModLoader.emulator.rdramWriteBuffer(this.data.pointer + 0x24, this.void);
        console.log('Puppet ' + this.id + ' shoveled.');
        this.isShoveled = true;
      }
    }
  }

  despawn() {
    if (this.isSpawned) {
      if (this.data.pointer > 0) {
        this.ModLoader.emulator.rdramWrite32(this.data.pointer + 0x130, 0x0);
        this.ModLoader.emulator.rdramWrite32(this.data.pointer + 0x134, 0x0);
        this.data.pointer = 0;
      }
      this.isSpawned = false;
      this.isShoveled = false;
      console.log('Puppet ' + this.id + ' despawned.');
      bus.emit(OotOnlineEvents.PLAYER_PUPPET_DESPAWNED, this);
    }
  }
}
