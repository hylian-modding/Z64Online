import uuid from 'uuid';
import { ILink, ISaveContext, Age } from 'modloader64_api/OOT/OOTAPI';
import IMemory from 'modloader64_api/IMemory';
import { PuppetData } from './PuppetData';
import { INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { ICommandBuffer, Command } from 'modloader64_api/OOT/ICommandBuffer';
import { bus } from 'modloader64_api/EventHandler';
import { OotOnlineEvents } from '../../OotoAPI/OotoAPI';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';

export class Puppet {
  player: INetworkPlayer;
  id: string;
  data: PuppetData;
  commandBuffer: ICommandBuffer;
  emulator: IMemory;
  isSpawned = false;
  isSpawning = false;
  isShoveled = false;
  scene: number;
  age: Age;
  link: ILink;
  void!: Buffer;
  ModLoader: IModLoaderAPI;

  constructor(
    player: INetworkPlayer,
    link: ILink,
    save: ISaveContext,
    emulator: IMemory,
    pointer: number,
    commandBuffer: ICommandBuffer,
    ModLoader: IModLoaderAPI
  ) {
    this.player = player;
    this.id = uuid.v4();
    this.commandBuffer = commandBuffer;
    this.data = new PuppetData(pointer, emulator, link, save);
    this.emulator = emulator;
    this.scene = 81;
    this.age = 1;
    this.link = link;
    this.ModLoader = ModLoader;
  }

  debug_movePuppetToPlayer() {
    let t = JSON.stringify(this.data);
    let copy = JSON.parse(t);
    Object.keys(copy).forEach((key: string) => {
      (this.data as any)[key] = copy[key];
    });
  }

  doNotDespawnMe() {
    this.emulator.rdramWrite8(this.data.pointer + 0x3, 0xff);
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
      this.commandBuffer.runCommand(
        Command.SPAWN_ACTOR,
        0x80600140,
        (success: boolean, result: number) => {
          if (success) {
            console.log(result.toString(16));
            this.data.pointer = result & 0x00ffffff;
            console.log('Puppet spawned!');
            console.log(this.data.pointer.toString(16));
            bus.emit(OotOnlineEvents.PLAYER_PUPPET_SPAWNED, this);
            this.void = this.emulator.rdramReadBuffer(
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
      this.doNotDespawnMe();
      Object.keys(data).forEach((key: string) => {
        (this.data as any)[key] = (data as any)[key];
      });
    }
  }

  shovel() {
    if (this.isSpawned) {
      if (this.data.pointer > 0) {
        this.emulator.rdramWriteBuffer(this.data.pointer + 0x24, this.void);
        console.log('Puppet ' + this.id + ' shoveled.');
        this.isShoveled = true;
      }
    }
  }

  despawn() {
    if (this.isSpawned) {
      if (this.data.pointer > 0) {
        this.emulator.rdramWrite32(this.data.pointer + 0x130, 0x0);
        this.emulator.rdramWrite32(this.data.pointer + 0x134, 0x0);
      }
      this.isSpawned = false;
      this.isShoveled = false;
      console.log('Puppet ' + this.id + ' despawned.');
      bus.emit(OotOnlineEvents.PLAYER_PUPPET_DESPAWNED, this);
    }
  }
}
