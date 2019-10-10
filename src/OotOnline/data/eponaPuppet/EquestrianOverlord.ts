import { EventHandler, EventsServer, EventServerLeft } from 'modloader64_api/EventHandler';
import { IModLoaderAPI, IPlugin } from 'modloader64_api/IModLoaderAPI';
import { packetHelper } from 'modloader64_api/ModLoaderDefaultImpls';
import {
  INetworkPlayer,
  NetworkHandler,
  ServerNetworkHandler,
} from 'modloader64_api/NetworkHandler';
import { IActor } from 'modloader64_api/OOT/IActor';
import { Command } from 'modloader64_api/OOT/ICommandBuffer';
import { IPosition } from 'modloader64_api/OOT/IPosition';
import { IRotation } from 'modloader64_api/OOT/IRotation';
import { Age, IOOTCore, OotEvents } from 'modloader64_api/OOT/OOTAPI';
import {
  IOotOnlineHelpers,
  OotOnlineEvents,
  OotOnline_PlayerScene,
} from '../../OotoAPI/OotoAPI';
import {
  Ooto_EquestrianPuppetListPacket,
  Ooto_EquestrianRegisterPacket,
  Ooto_EquestrianTickPacket,
  Ooto_EquestrianTickServerPacket,
  Ooto_EquestrianNukeServerPacket,
} from '../OotOPackets';
import { EponaData } from './EponaData';
import { EquestrianData_Impl } from './EquestrianData';
import { EquestrianStorage } from './EquestrianStorage';
import { OotOnlineStorage } from '../../OotOnlineStorage';

export function convertObjPointerToId(pointer: number): number {
  switch (pointer) {
    default:
      return 7;
    case 0x06001e2c:
      return 0;
    case 0x06002470:
      return 1;
    case 0x06002c38:
      return 2;
    case 0x060032b0:
      return 3;
    case 0x06003cec:
      return 4;
    case 0x06004dec:
      return 5;
    case 0x06005584:
      return 6;
    case 0x06006d50:
      return 7;
    case 0x060075f0:
      return 8;
  }
}

class EquestrianClientStorage {
  currentHorses: any = {};
}

export class EquestrianOverlord {
  ModLoader: IModLoaderAPI;
  core: IOOTCore;
  parent: IOotOnlineHelpers;
  epona: IActor | undefined;
  void!: Buffer;

  constructor(parent: IOotOnlineHelpers, ml: IModLoaderAPI, core: IOOTCore) {
    this.ModLoader = ml;
    this.core = core;
    this.parent = parent;
  }

  // Client variable
  clientStorage: EquestrianClientStorage = new EquestrianClientStorage();

  registerHorse(
    player: INetworkPlayer,
    lobby: string,
    scene: number,
    pos: IPosition,
    rot: IRotation
  ) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(lobby, (this.parent as unknown as IPlugin)) as OotOnlineStorage;
    if (!storage.horses.playersWithHorses.hasOwnProperty(player.uuid)) {
      this.ModLoader.logger.info(
        'Registering new horse for player ' + player.nickname + '.'
      );
      let horse = new EquestrianData_Impl(player, scene, pos, rot, 0);
      storage.horses.playersWithHorses[player.uuid] = horse.uuid;
      storage.horses.horseData[horse.uuid] = horse;
    } else {
      let horse_uuid: string = storage.horses.playersWithHorses[player.uuid];
      let horse: EquestrianData_Impl = storage.horses.horseData[horse_uuid];
      horse.scene = scene;
      horse.pos = pos;
      horse.rot = rot;
      this.ModLoader.logger.info(
        'Moving horse ' + horse_uuid + ' to scene ' + scene + '.'
      );
    }
    this.ModLoader.serverSide.sendPacket(
      new Ooto_EquestrianPuppetListPacket(storage.horses.horseData, this.ModLoader.clientLobby)
    );
  }

  // Client side events.
  @EventHandler(OotEvents.ON_ACTOR_SPAWN)
  onActorSpawned(actor: IActor) {
    if (actor.actorID === 0x0014) {
      setTimeout(() => {
        this.ModLoader.clientSide.sendPacket(
          new Ooto_EquestrianRegisterPacket(
            this.core.global.scene,
            actor.position,
            actor.rotation,
            this.ModLoader.clientLobby
          )
        );
      }, 1000);
      this.ModLoader.logger.info('Epona spawned.');
      this.epona = actor;
    }
  }

  @EventHandler(OotEvents.ON_ACTOR_DESPAWN)
  onActorDespawned(actor: IActor) {
    if (actor.actorID === 0x0014) {
      this.ModLoader.logger.info('Epona despawned.');
      this.epona = undefined;
    }
  }

  @EventHandler(OotEvents.ON_LOADING_ZONE)
  onLoadingZone(evt: any) {
    Object.keys(this.clientStorage.currentHorses).forEach((uuid: string) => {
      let horse: EquestrianData_Impl = this.clientStorage.currentHorses[
        uuid
      ] as EquestrianData_Impl;
      if (horse.isSpawned) {
        if (horse.actor !== undefined) {
          if (horse.actor.exists) {
            horse.actor.destroy();
            this.ModLoader.logger.info(
              'Despawning horse puppet ' + horse.uuid + '.'
            );
          }
          horse.isSpawned = false;
          horse.isSpawning = false;
        }
      }
    });
  }

  @EventHandler(OotOnlineEvents.CLIENT_REMOTE_PLAYER_CHANGED_SCENES)
  onRemotePlayerSceneChange(evt: OotOnline_PlayerScene) {
    Object.keys(this.clientStorage.currentHorses).forEach((uuid: string) => {
      let horse: EquestrianData_Impl = this.clientStorage.currentHorses[
        uuid
      ] as EquestrianData_Impl;
      if (horse.owner.uuid === evt.player.uuid) {
        if (
          horse.actor !== undefined &&
          horse.isSpawned &&
          horse.scene === this.core.global.scene
        ) {
          horse.actor.rdramWrite8(0x1c9, 0x1);
          horse.actor.rdramWriteBit8(0x6, 0x2, false);
        }
      }
    });
  }

  @EventHandler(EventsServer.ON_LOBBY_LEAVE)
  onServerPlayerLeft(evt: EventServerLeft) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(evt.lobby, (this.parent as unknown as IPlugin)) as OotOnlineStorage;
    let horse_key: string = storage.horses.playersWithHorses[evt.player.uuid];
    delete storage.horses.playersWithHorses[evt.player.uuid];
    delete storage.horses.horseData[horse_key];
    this.ModLoader.serverSide.sendPacket(new Ooto_EquestrianNukeServerPacket(horse_key, this.ModLoader.clientLobby));
  }

  @NetworkHandler("Ooto_EquestrianNukeServerPacket")
  onHorseGlueFactory(packet: Ooto_EquestrianNukeServerPacket) {
    if (this.clientStorage.currentHorses.hasOwnProperty(packet.horse_to_remove)) {
      let horse: EquestrianData_Impl = this.clientStorage.currentHorses[
        packet.horse_to_remove
      ] as EquestrianData_Impl;
      if (horse.isSpawned) {
        if (horse.actor !== undefined) {
          if (horse.actor.exists) {
            horse.actor.destroy();
          }
        }
      }
      delete this.clientStorage.currentHorses[packet.horse_to_remove];
      this.ModLoader.logger.info("Sending horse " + packet.horse_to_remove + " to the glue factory.");
    }
  }

  // Client side packets
  @NetworkHandler('Ooto_EquestrianPuppetListPacket')
  onHorseListing(packet: Ooto_EquestrianPuppetListPacket) {
    Object.keys(packet.data).forEach((uuid: string) => {
      if (!this.clientStorage.currentHorses.hasOwnProperty(uuid)) {
        this.clientStorage.currentHorses[uuid] = packet.data[uuid];
        let horse: EquestrianData_Impl = this.clientStorage.currentHorses[uuid];
        horse.isSpawned = false;
        horse.isSpawning = false;
        horse.isShoveled = false;
      } else {
        let source: EquestrianData_Impl = packet.data[uuid];
        let horse: EquestrianData_Impl = this.clientStorage.currentHorses[uuid];
        horse.pos = source.pos;
        horse.rot = source.rot;
        horse.scene = source.scene;
      }
    });
    if (this.core.save.age === Age.CHILD) {
      return;
    }
    Object.keys(this.clientStorage.currentHorses).forEach((uuid: string) => {
      let horse: EquestrianData_Impl = this.clientStorage.currentHorses[
        uuid
      ] as EquestrianData_Impl;
      if (
        horse.scene === this.core.global.scene &&
        horse.owner.uuid !== this.ModLoader.me.uuid &&
        !horse.isSpawned &&
        !horse.isSpawning &&
        !horse.isShoveled
      ) {
        horse.isSpawning = true;
        this.core.commandBuffer.runCommand(
          Command.SPAWN_ACTOR,
          0x80600150,
          (success: boolean, result: number) => {
            if (success) {
              let pointer: number = result & 0x00FFFFFF;
              let actor: IActor = this.core.actorManager.createIActorFromPointer(
                pointer
              );
              this.void = actor.rdramReadBuffer(0x24, 0xC);
              // Got our horse.
              horse.isSpawned = true;
              horse.isSpawning = false;
              horse.isShoveled = false;
              horse.actor = actor;
              actor.position.x = horse.pos.x;
              actor.position.y = horse.pos.y;
              actor.position.z = horse.pos.z;
              actor.rotation.x = horse.rot.x;
              actor.rotation.y = horse.rot.y;
              actor.rotation.z = horse.rot.z;
              this.ModLoader.logger.info(
                'Spawning horse puppet ' + horse.uuid + '.'
              );
            }
          }
        );
      }
      if (
        horse.scene === this.core.global.scene &&
        horse.owner.uuid !== this.ModLoader.me.uuid &&
        horse.isShoveled
      ) {
        horse.isShoveled = false;
        this.ModLoader.logger.info("Resurrecting horse puppet " + horse.uuid + ".");
      }
      if (horse.scene !== this.core.global.scene && horse.isSpawned) {
        horse.isShoveled = true;
        if (horse.actor !== undefined) {
          if (horse.actor.exists) {
            this.ModLoader.logger.info(
              'Shoveling horse puppet ' + horse.uuid + '.'
            );
            horse.actor.rdramWriteBuffer(0x24, this.void);
          }
        }
      }
    });
  }

  @NetworkHandler('Ooto_EquestrianTickServerPacket')
  onGetServerHorseShit(packet: Ooto_EquestrianTickServerPacket) {
    if (this.clientStorage.currentHorses.hasOwnProperty(packet.data.uuid)) {
      let horse: EquestrianData_Impl = this.clientStorage.currentHorses[
        packet.data.uuid
      ];
      if (horse.actor !== undefined && horse.isSpawned) {
        horse.actor.position.x = packet.data.pos.x;
        horse.actor.position.y = packet.data.pos.y;
        horse.actor.position.z = packet.data.pos.z;
        horse.actor.rotation.x = packet.data.rot.x;
        horse.actor.rotation.y = packet.data.rot.y;
        horse.actor.rotation.z = packet.data.rot.z;
        horse.actor.rdramWrite8(0x1c9, 0x1);
        horse.actor.rdramWrite8(0x1c8, packet.data.anim);
        horse.actor.rdramWrite32(0x1a4, packet.data.speed);
        horse.actor.rdramWriteBit8(0x6, 0x2, true);
      }
    }
  }

  // Server side events
  @EventHandler(OotOnlineEvents.SERVER_PLAYER_CHANGED_SCENES)
  onServerSceneChange(player: OotOnline_PlayerScene) {
    // Send player horses.
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(player.lobby, (this.parent as unknown as IPlugin)) as OotOnlineStorage;
    this.ModLoader.serverSide.sendPacketToSpecificPlayer(
      new Ooto_EquestrianPuppetListPacket(storage.horses.horseData, this.ModLoader.clientLobby),
      player.player
    );
  }

  // Server side packets
  @ServerNetworkHandler('Ooto_EquestrianRegisterPacket')
  onEponaSpawned(packet: Ooto_EquestrianRegisterPacket) {
    this.registerHorse(packet.player, packet.lobby, packet.scene, packet.pos, packet.rot);
  }

  @ServerNetworkHandler('Ooto_EquestrianTickPacket')
  onEponaUpdate(packet: Ooto_EquestrianTickPacket) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(packet.lobby, (this.parent as unknown as IPlugin)) as OotOnlineStorage;
    if (storage.horses.playersWithHorses.hasOwnProperty(packet.player.uuid)) {
      let horse_uuid: string = storage.horses.playersWithHorses[
        packet.player.uuid
      ];
      let horse: EquestrianData_Impl = storage.horses.horseData[horse_uuid];
      horse.pos = packet.edata.actor.position;
      horse.rot = packet.edata.actor.rotation;
      horse.anim = packet.edata.anim;
      horse.speed = packet.edata.speed;
      let p = new Ooto_EquestrianTickServerPacket(horse, this.ModLoader.clientLobby);
      packetHelper.cloneDestination(packet, p);
      this.parent.sendPacketToPlayersInScene(p);
    }
  }

  onTick() {
    if (this.epona !== undefined) {
      this.ModLoader.clientSide.sendPacket(
        new Ooto_EquestrianTickPacket(new EponaData(this.epona), this.ModLoader.clientLobby)
      );
    }
  }
}
