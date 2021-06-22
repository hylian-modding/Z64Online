import { INetworkPlayer, IPacketHeader } from 'modloader64_api/NetworkHandler';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { bus } from 'modloader64_api/EventHandler';
import { Z64OnlineEvents, } from '@OotOnline/common/api/Z64API';
import { IPuppetOverlordServer, IPuppetOverlordClient } from '@OotOnline/common/puppet/IPuppetOverlord';
import { IPuppet } from '@OotOnline/common/puppet/IPuppet';
import { AgeorForm, Core, Scene } from '@OotOnline/common/types/Types';

export abstract class PuppetOverlordServer implements IPuppetOverlordServer {
  abstract onPuppetData_server(packet: IPacketHeader): void;
}

export abstract class PuppetOverlordClient implements IPuppetOverlordClient {
  puppets: Map<string, IPuppet> = new Map<string, IPuppet>();
  awaiting_spawn: IPuppet[] = new Array<IPuppet>();
  fakeClientPuppet!: IPuppet;
  amIAlone = true;
  playersAwaitingPuppets: INetworkPlayer[] = new Array<
    INetworkPlayer
  >();
  queuedSpawn: boolean = false;
  ModLoader!: IModLoaderAPI;
  core!: Core;

  get current_scene() {
    return this.fakeClientPuppet.scene;
  }

  localPlayerLoadingZone() {
    this.puppets.forEach(
      (value: IPuppet, key: string, map: Map<string, IPuppet>) => {
        value.despawn();
      }
    );
    this.awaiting_spawn.splice(0, this.awaiting_spawn.length);
    bus.emit(Z64OnlineEvents.PUPPETS_CLEAR, {});
  }

  localPlayerChangingScenes(entering_scene: Scene, age: AgeorForm) {
    this.awaiting_spawn.splice(0, this.awaiting_spawn.length);
    this.fakeClientPuppet.scene = entering_scene;
  }

  registerPuppet(player: INetworkPlayer) {
    this.ModLoader.logger.info(
      'Player ' + player.nickname + ' awaiting puppet assignment.'
    );
    this.playersAwaitingPuppets.push(player);
  }

  unregisterPuppet(player: INetworkPlayer) {
    if (this.puppets.has(player.uuid)) {
      let ipuppet: IPuppet = this.puppets.get(player.uuid)!;
      ipuppet.despawn();
      this.puppets.delete(player.uuid);
    }
    if (this.playersAwaitingPuppets.length > 0) {
      let index = -1;
      for (let i = 0; i < this.playersAwaitingPuppets.length; i++) {
        if (this.playersAwaitingPuppets[i].uuid === player.uuid) {
          index = i;
          break;
        }
      }
      if (index > -1) {
        this.playersAwaitingPuppets.splice(index, 1);
      }
    }
  }

  changePuppetScene(player: INetworkPlayer, entering_scene: Scene) {
    if (this.puppets.has(player.uuid)) {
      let puppet = this.puppets.get(player.uuid)!;
      puppet.scene = entering_scene;
      this.ModLoader.logger.info(
        'Puppet ' + puppet.id + ' moved to scene ' + puppet.scene
      );
      if (this.fakeClientPuppet.scene === puppet.scene) {
        this.ModLoader.logger.info(
          'Queueing puppet ' + puppet.id + ' for immediate spawning.'
        );
        this.awaiting_spawn.push(puppet);
      }
    } else {
      this.ModLoader.logger.info('No puppet found for player ' + player.nickname + '.');
    }
  }

  processAwaitingSpawns() {
    if (this.awaiting_spawn.length > 0 && !this.queuedSpawn) {
      let puppet: IPuppet = this.awaiting_spawn.shift() as IPuppet;
      puppet.spawn();
    }
  }

  lookForMissingOrStrandedPuppets() {
    let check = false;
    this.puppets.forEach(
      (value: IPuppet, key: string, map: Map<string, IPuppet>) => {
        if (value.scene === this.fakeClientPuppet.scene) {
          if (!value.isSpawned && this.awaiting_spawn.indexOf(value) === -1) {
            this.awaiting_spawn.push(value);
          }
          check = true;
        }
        if (
          value.scene !== this.fakeClientPuppet.scene &&
          value.isSpawned &&
          !value.isShoveled
        ) {
          value.shovel();
        }
      }
    );
    if (check) {
      this.amIAlone = false;
    } else {
      this.amIAlone = true;
    }
  }

  abstract sendPuppetPacket();
  abstract processPuppetPacket(packet: IPacketHeader);
  abstract processNewPlayers();
}