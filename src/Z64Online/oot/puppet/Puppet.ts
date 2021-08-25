import { IOOTCore, Scene } from 'Z64Lib/API/OOT/OOTAPI';
import { PuppetData } from './PuppetData';
import { INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { bus } from 'modloader64_api/EventHandler';
import { Z64OnlineEvents } from '../../common/api/Z64API';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import Vector3 from 'modloader64_api/math/Vector3';
import { HorseData } from './HorseData';
import { IPuppet } from '@Z64Online/common/puppet/IPuppet';
import { IOotOClientside } from '@Z64Online/oot/save/IOotOClientside';
import { IActor } from 'Z64Lib/API/Common/IActor';
import { AgeOrForm, IOvlPayloadResult } from 'Z64Lib/API/Common/Z64API';

export class Puppet implements IPuppet {
  player: INetworkPlayer;
  id: string;
  data: PuppetData;
  isSpawned = false;
  isSpawning = false;
  isShoveled = false;
  scene: Scene;
  core: IOOTCore;
  void!: Vector3;
  ModLoader: IModLoaderAPI;
  horse: HorseData | undefined;
  horseSpawning: boolean = false;
  parent: IOotOClientside;
  modelPointer: number = 0;

  constructor(
    player: INetworkPlayer,
    core: IOOTCore,
    pointer: number,
    ModLoader: IModLoaderAPI,
    parent: IOotOClientside
  ) {
    this.player = player;
    this.data = new PuppetData(this, pointer, ModLoader);
    this.scene = 81;
    this.ModLoader = ModLoader;
    this.core = core;
    this.id = this.ModLoader.utils.getUUID();
    this.parent = parent;
  }

  get age(): AgeOrForm {
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
    console.log("FUCK1");
    if (!this.isSpawned && !this.isSpawning) {
      bus.emit(Z64OnlineEvents.PLAYER_PUPPET_PRESPAWN, this);
      this.isSpawning = true;
      this.data.pointer = 0x0;
      console.log("FUCK2");
      (this.parent.getClientStorage()!.overlayCache["puppet.ovl"] as IOvlPayloadResult).spawnActorRXY_Z(this.age, this.modelPointer, 0, new Vector3(8192, -2048, 8192), this.modelPointer + 0x800).then((actor: IActor) => {
        this.data.pointer = actor.pointer;
        this.doNotDespawnMe(this.data.pointer);
        this.void = this.ModLoader.math.rdramReadV3(this.data.pointer + 0x24);
        this.isSpawned = true;
        this.isSpawning = false;
        bus.emit(Z64OnlineEvents.PLAYER_PUPPET_SPAWNED, this);
        console.log("FUCK3");
      });
    }
    console.log(this.player.uuid + " puppet pointer: " + this.data.pointer);
  }

  processIncomingPuppetData(data: PuppetData) {
    if (this.isSpawned && !this.isShoveled) {
      this.data.ageLastFrame = this.age;
      let keys = Object.keys(data);
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        (this.data as any)[key] = (data as any)[key];
      }
      if (this.data.ageLastFrame !== this.age) {
        bus.emit(Z64OnlineEvents.PUPPET_AGE_CHANGED, this);
      }
    }
  }

  processIncomingHorseData(data: HorseData) {
    if (this.horse === undefined && !this.horseSpawning) {
      this.horseSpawning = true;
      (this.parent.getClientStorage()!.overlayCache["horse-3.ovl"] as IOvlPayloadResult).spawn(0x0, new Vector3(8192, -2048, 8192), new Vector3(0, 0, 0)).then((actor: IActor) => {
        this.horse = new HorseData(actor.pointer, this, this.core);
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
        if (this.horse !== undefined) {
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
        if (this.horse !== undefined) {
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
