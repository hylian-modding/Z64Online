import { IActor } from 'modloader64_api/OOT/IActor';
import { EventHandler } from 'modloader64_api/EventHandler';
import { OotEvents, IOOTCore, LinkState } from 'modloader64_api/OOT/OOTAPI';
import {
  ActorHookBase,
  ActorHookProcessor,
  ActorPacketData,
  ActorPacketData_Impl,
  HookInfo,
} from './ActorHookBase';
import fs from 'fs';
import path from 'path';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import {
  Ooto_ActorPacket,
  Ooto_ActorDeadPacket,
  Ooto_SpawnActorPacket,
} from './OotOPackets';
import {
  NetworkHandler,
  ServerNetworkHandler,
} from 'modloader64_api/NetworkHandler';
import IMemory from 'modloader64_api/IMemory';
import { Command } from 'modloader64_api/OOT/ICommandBuffer';
import { v4 } from 'uuid';
import { IOotOnlineHelpers } from '../OotoAPI/OotoAPI';

// Actor Hooking Stuff

const BOMB_ID = 0x0010;
const BOMBCHU_ID = 0x00da;

export class ActorHookingManager {
  actorHookMap: Map<number, ActorHookBase> = new Map<number, ActorHookBase>();
  actorHookTicks: Map<string, ActorHookProcessor> = new Map<
    string,
    ActorHookProcessor
  >();
  // Bombs
  bombsLocal: Map<string, IActor> = new Map<string, IActor>();
  bombsRemote: Map<string, IActor> = new Map<string, IActor>();
  bombProcessor!: ActorHookProcessor;
  // Chus
  chusLocal: Map<string, IActor> = new Map<string, IActor>();
  chusRemote: Map<string, IActor> = new Map<string, IActor>();
  chuProcessor!: ActorHookProcessor;

  modloader: IModLoaderAPI;
  core: IOOTCore;
  parent: IOotOnlineHelpers;

  constructor(
    modloader: IModLoaderAPI,
    core: IOOTCore,
    parent: IOotOnlineHelpers
  ) {
    this.modloader = modloader;
    let dir = path.join(__dirname, 'actors');
    fs.readdirSync(dir).forEach((file: string) => {
      let parse = path.parse(file);
      if (parse.ext === '.js') {
        let hook: ActorHookBase = require(path.join(dir, file));
        this.actorHookMap.set(hook.actorID, hook);
        console.log('Loaded hook data for ' + parse.name + '.');
      }
    });
    this.core = core;
    this.parent = parent;
  }

  onPostInit() {
    let bombs = new ActorHookBase();
    bombs.actorID = BOMB_ID;
    bombs.hooks.push(new HookInfo(0x1e8, 0x4));
    bombs.hooks.push(new HookInfo(0x118, 0x4));
    this.bombProcessor = new ActorHookProcessor(
      this.core.actorManager.createIActorFromPointer(0x0),
      bombs,
      this.modloader,
      this.core
    );

    let chus = new ActorHookBase();
    chus.actorID = BOMBCHU_ID;
    chus.hooks.push(new HookInfo(0x118, 0x4));
    chus.hooks.push(new HookInfo(0x140, 0x4));
    this.chuProcessor = new ActorHookProcessor(
      this.core.actorManager.createIActorFromPointer(0x0),
      chus,
      this.modloader,
      this.core
    );
  }

  @EventHandler(OotEvents.ON_ACTOR_SPAWN)
  onActorSpawned(actor: IActor) {
    if (!(this.parent as any).LobbyConfig.actor_syncing) {
      return;
    }
    if (this.actorHookMap.has(actor.actorID)) {
      console.log('Setting up hook for actor ' + actor.actorUUID + '.');
      this.actorHookTicks.set(
        actor.actorUUID,
        new ActorHookProcessor(
          actor,
          this.actorHookMap.get(actor.actorID)!,
          this.modloader,
          this.core
        )
      );
    } else if (actor.actorID === BOMB_ID) {
      if (actor.rdramRead32(0x1e8) <= 10) {
        return;
      }
      actor.actorUUID = v4();
      let actorData: ActorPacketData = new ActorPacketData_Impl(actor);
      this.bombsLocal.set(actor.actorUUID, actor);
      this.modloader.clientSide.sendPacket(
        new Ooto_SpawnActorPacket(
          actorData,
          this.core.global.scene,
          this.modloader.clientLobby
        )
      );
    } else if (actor.actorID === BOMBCHU_ID) {
      actor.actorUUID = v4();
      let actorData: ActorPacketData = new ActorPacketData_Impl(actor);
      this.chusLocal.set(actor.actorUUID, actor);
      this.modloader.clientSide.sendPacket(
        new Ooto_SpawnActorPacket(
          actorData,
          this.core.global.scene,
          this.modloader.clientLobby
        )
      );
    }
  }

  @EventHandler(OotEvents.ON_ACTOR_DESPAWN)
  onActorDespawned(actor: IActor) {
    if (!(this.parent as any).LobbyConfig.actor_syncing) {
      return;
    }
    if (this.actorHookTicks.has(actor.actorUUID)) {
      console.log('Deleting hook for actor ' + actor.actorUUID + '.');
      this.modloader.clientSide.sendPacket(
        new Ooto_ActorDeadPacket(
          actor.actorUUID,
          this.core.global.scene,
          this.core.global.room,
          this.modloader.clientLobby
        )
      );
      this.actorHookTicks.delete(actor.actorUUID);
    } else if (actor.actorID === BOMB_ID) {
      if (this.bombsLocal.has(actor.actorUUID)) {
        this.modloader.clientSide.sendPacket(
          new Ooto_ActorDeadPacket(
            actor.actorUUID,
            this.core.global.scene,
            this.core.global.room,
            this.modloader.clientLobby
          )
        );
        this.bombsLocal.delete(actor.actorUUID);
      }
    } else if (actor.actorID === BOMBCHU_ID) {
      this.modloader.clientSide.sendPacket(
        new Ooto_ActorDeadPacket(
          actor.actorUUID,
          this.core.global.scene,
          this.core.global.room,
          this.modloader.clientLobby
        )
      );
      this.chusLocal.delete(actor.actorUUID);
    }
  }

  @EventHandler(OotEvents.ON_LOADING_ZONE)
  onLoadingZone(evt: any) {
    this.bombsLocal.clear();
    this.bombsRemote.clear();
    this.chusLocal.clear();
    this.chusRemote.clear();
    this.actorHookTicks.clear();
  }

  @EventHandler(OotEvents.ON_ROOM_CHANGE_PRE)
  onRoomChange(evt: any) {
    this.actorHookTicks.clear();
  }

  setActorBehavior(
    emulator: IMemory,
    actor: IActor,
    offset: number,
    behavior: number
  ) {
    let id: number = actor.actorID;
    let overlay_table: number = global.ModLoader['overlay_table'];
    let overlay_entry = overlay_table + id * 32;
    let behavior_start = overlay_entry + 0x10;
    let pointer = emulator.dereferencePointer(behavior_start);
    let behavior_result = pointer + behavior;
    actor.rdramWrite32(offset, behavior_result + 0x80000000);
  }

  @ServerNetworkHandler('Ooto_ActorPacket')
  onActorPacketServer(packet: Ooto_ActorPacket) {
    this.parent.sendPacketToPlayersInScene(packet);
  }

  @NetworkHandler('Ooto_ActorPacket')
  onActorPacket(packet: Ooto_ActorPacket) {
    if (
      packet.scene !== this.core.global.scene ||
      packet.room !== this.core.global.room ||
      this.core.helper.isLinkEnteringLoadingZone()
    ) {
      return;
    }
    if (this.actorHookTicks.has(packet.actorData.actor.actorUUID)) {
      this.actorHookTicks.get(
        packet.actorData.actor.actorUUID
      )!.last_inbound_frame = 50;

      let actor: IActor = this.actorHookTicks.get(
        packet.actorData.actor.actorUUID
      )!.actor;

      actor.position.x = packet.actorData.actor.position.x;
      actor.position.y = packet.actorData.actor.position.y;
      actor.position.z = packet.actorData.actor.position.z;

      actor.rotation.x = packet.actorData.actor.rotation.x;
      actor.rotation.y = packet.actorData.actor.rotation.y;
      actor.rotation.z = packet.actorData.actor.rotation.z;

      let hooks = this.actorHookTicks.get(packet.actorData.actor.actorUUID)!
        .hookBase.hooks;
      for (let i = 0; i < hooks.length; i++) {
        if (hooks[i].isBehavior) {
          let d = packet.actorData.hooks[i].data.readUInt32BE(0x0);
          this.setActorBehavior(
            this.modloader.emulator,
            actor,
            hooks[i].offset,
            d
          );
        } else {
          actor.rdramWriteBuffer(
            hooks[i].offset,
            packet.actorData.hooks[i].data
          );
        }
      }
    } else if (this.bombsRemote.has(packet.actorData.actor.actorUUID)) {
      let actor: IActor = this.bombsRemote.get(
        packet.actorData.actor.actorUUID
      )!;

      actor.position.x = packet.actorData.actor.position.x;
      actor.position.y = packet.actorData.actor.position.y;
      actor.position.z = packet.actorData.actor.position.z;

      actor.rotation.x = packet.actorData.actor.rotation.x;
      actor.rotation.y = packet.actorData.actor.rotation.y;
      actor.rotation.z = packet.actorData.actor.rotation.z;

      for (let i = 0; i < this.bombProcessor.hookBase.hooks.length; i++) {
        if (this.bombProcessor.hookBase.hooks[i].isBehavior) {
          let d = packet.actorData.hooks[i].data.readUInt32BE(0x0);
          this.setActorBehavior(
            this.modloader.emulator,
            actor,
            this.bombProcessor.hookBase.hooks[i].offset,
            d
          );
        } else {
          actor.rdramWriteBuffer(
            this.bombProcessor.hookBase.hooks[i].offset,
            packet.actorData.hooks[i].data
          );
        }
      }
    } else if (this.chusRemote.has(packet.actorData.actor.actorUUID)) {
      console.log(JSON.stringify(packet, null, 2));

      let actor: IActor = this.chusRemote.get(
        packet.actorData.actor.actorUUID
      )!;

      actor.position.x = packet.actorData.actor.position.x;
      actor.position.y = packet.actorData.actor.position.y;
      actor.position.z = packet.actorData.actor.position.z;

      actor.rotation.x = packet.actorData.actor.rotation.x;
      actor.rotation.y = packet.actorData.actor.rotation.y;
      actor.rotation.z = packet.actorData.actor.rotation.z;

      for (let i = 0; i < this.chuProcessor.hookBase.hooks.length; i++) {
        if (this.chuProcessor.hookBase.hooks[i].isBehavior) {
          let d = packet.actorData.hooks[i].data.readUInt32BE(0x0);
          this.setActorBehavior(
            this.modloader.emulator,
            actor,
            this.chuProcessor.hookBase.hooks[i].offset,
            d
          );
        } else {
          actor.rdramWriteBuffer(
            this.chuProcessor.hookBase.hooks[i].offset,
            packet.actorData.hooks[i].data
          );
        }
      }
    }
  }

  @NetworkHandler('Ooto_ActorDeadPacket')
  onActorDead(packet: Ooto_ActorDeadPacket) {
    if (
      packet.scene !== this.core.global.scene ||
      packet.room !== this.core.global.room ||
      this.core.helper.isLinkEnteringLoadingZone()
    ) {
      return;
    }
    if (this.actorHookTicks.has(packet.actorUUID)) {
      let actor: IActor = this.actorHookTicks.get(packet.actorUUID)!.actor;
      //actor.destroy();
    } else if (this.bombsRemote.has(packet.actorUUID)) {
      this.bombsRemote.delete(packet.actorUUID);
    } else if (this.chusRemote.has(packet.actorUUID)) {
      let chu: IActor = this.chusRemote.get(packet.actorUUID)!;
      this.chusRemote.delete(packet.actorUUID);
    }
  }

  @NetworkHandler('Ooto_SpawnActorPacket')
  onActorSpawnRequest(packet: Ooto_SpawnActorPacket) {
    if (
      packet.scene !== this.core.global.scene ||
      this.core.helper.isLinkEnteringLoadingZone()
    ) {
      return;
    }
    let spawn_param = 0;
    let spawn_param_ = 0;
    switch (packet.actorData.actor.actorID) {
      case BOMB_ID:
        spawn_param = 0x80600160;
        spawn_param_ = 0x600160;
        console.log('bomb');
        break;
      case BOMBCHU_ID:
        spawn_param = 0x80600170;
        spawn_param_ = 0x600170;
        let pos = this.core.link.position.getRawPos();
        this.modloader.emulator.rdramWrite8(0x600172, pos[0]);
        this.modloader.emulator.rdramWrite8(0x600173, pos[1]);
        this.modloader.emulator.rdramWrite8(0x600174, pos[4] + 100);
        this.modloader.emulator.rdramWrite8(0x600175, pos[5] + 100);
        this.modloader.emulator.rdramWrite8(0x600176, pos[8]);
        this.modloader.emulator.rdramWrite8(0x600177, pos[9]);
        console.log('bombchu');
        return;
    }
    this.core.commandBuffer.runCommand(
      Command.SPAWN_ACTOR,
      spawn_param,
      (success: boolean, result: number) => {
        if (success) {
          let dref: number = result & 0x00ffffff; // - 0x80000000;
          console.log(dref.toString(16));
          let actor: IActor = this.core.actorManager.createIActorFromPointer(
            dref
          );
          actor.actorUUID = packet.actorData.actor.actorUUID;
          actor.position.x = packet.actorData.actor.position.x;
          actor.position.y = packet.actorData.actor.position.y;
          actor.position.z = packet.actorData.actor.position.z;
          actor.rotation.x = packet.actorData.actor.rotation.x;
          actor.rotation.y = packet.actorData.actor.rotation.y;
          actor.rotation.z = packet.actorData.actor.rotation.z;
          if (packet.actorData.actor.actorID === BOMB_ID) {
            actor.rdramWrite32(0x6c, 0x0);
            actor.rdramWrite32(0x70, 0x0);
            actor.rdramWrite8(0x118, 0x80);
            this.bombsRemote.set(actor.actorUUID, actor);
          } else if (packet.actorData.actor.actorID === BOMBCHU_ID) {
            actor.rdramWrite8(0x118, 0x80);
            actor.redeadFreeze = 0x10;
            this.chusRemote.set(actor.actorUUID, actor);
          }
        }
      }
    );
  }

  onTick() {
    this.actorHookTicks.forEach((value: ActorHookProcessor, key: string) => {
      //value.onTick();
    });
    this.bombsLocal.forEach((value: IActor, key: string) => {
      this.bombProcessor.actor = value;
      this.bombProcessor.onTick();
    });
    this.chusLocal.forEach((value: IActor, key: string) => {
      this.chuProcessor.actor = value;
      this.chuProcessor.onTick();
    });
  }
}
