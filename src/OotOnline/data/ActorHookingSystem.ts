import { IActor } from 'modloader64_api/OOT/IActor';
import { EventHandler, bus } from 'modloader64_api/EventHandler';
import { OotEvents, IOOTCore } from 'modloader64_api/OOT/OOTAPI';
import {
  ActorHookBase,
  ActorHookProcessor,
  ActorPacketData,
  ActorPacketData_Impl,
  getActorBehavior,
  HookInfo,
} from './ActorHookBase';
import fs from 'fs';
import path from 'path';
import { IModLoaderAPI, ModLoaderEvents } from 'modloader64_api/IModLoaderAPI';
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
import { Z64OnlineEvents } from '../Z64API/OotoAPI';
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import { InjectCore } from 'modloader64_api/CoreInjection';
import { Postinit } from 'modloader64_api/PluginLifecycle';
import { Z64RomTools } from 'Z64Lib/API/Z64RomTools';
import { ParentReference } from 'modloader64_api/SidedProxy/SidedProxy';
import { Z64LibSupportedGames } from 'Z64Lib/API/Z64LibSupportedGames';
import { MLPatchLib } from '@OotOnline/common/lib/ML64PatchLib';
import { IZ64OnlineHelpers } from './InternalAPI';
// Actor Hooking Stuff

const BOMB_ID = 0x0010;
const BOMBCHU_ID = 0x00da;
const FW_ID = 0x009E;
const DF_ID = 0x009F;
const NL_ID = 0x00F4;
const DEKU_NUTS = 0x0056;
const ARROW = 0x0016;

export class ActorHookingManagerServer {

  @ParentReference()
  parent!: IZ64OnlineHelpers;

  @ServerNetworkHandler('Ooto_ActorPacket')
  onActorPacketServer(packet: Ooto_ActorPacket) {
    this.parent.sendPacketToPlayersInScene(packet);
  }
}

export class ActorHookingManagerClient {
  actorHookMap: Map<number, ActorHookBase> = new Map<number, ActorHookBase>();
  actorHookTicks: Map<string, ActorHookProcessor> = new Map<
    string,
    ActorHookProcessor
  >();
  transitionHookTicks: Map<string, ActorHookProcessor> = new Map<
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
  // Nayru's Love
  NLLocal: Map<string, IActor> = new Map<string, IActor>();
  NLRemote: Map<string, IActor> = new Map<string, IActor>();
  NLProcessor!: ActorHookProcessor;
  //
  knockedArrow!: IActor | undefined;
  arrowProcess!: ActorHookProcessor;

  @ModLoaderAPIInject()
  ModLoader!: IModLoaderAPI;
  @InjectCore()
  core!: IOOTCore;
  @ParentReference()
  parent!: IZ64OnlineHelpers;
  names: any;

  constructor() {
    this.names = JSON.parse(
      fs.readFileSync(__dirname + '/../gui/imgui/ACTOR_NAMES.json').toString()
    );
  }

  @EventHandler(Z64OnlineEvents.ON_EXTERNAL_ACTOR_SYNC_LOAD)
  onActorSyncFile(evt: string) {
    let hook: ActorHookBase = require(evt);
    this.actorHookMap.set(hook.actorID, hook);
    this.ModLoader.logger.info(
      'Loading actor hook for actor ' +
      this.names['0x' + hook.actorID.toString(16).toUpperCase()] +
      '.'
    );
  }

  @Postinit()
  onPostInit() {
    //let dirs = ["actors", "enemies"];
    let dirs = ["actors"];
    for (let i = 0; i < dirs.length; i++) {
      let dir = path.join(__dirname, dirs[i]);
      fs.readdirSync(dir).forEach((file: string) => {
        let parse = path.parse(file);
        if (parse.ext === '.js') {
          bus.emit(
            Z64OnlineEvents.ON_EXTERNAL_ACTOR_SYNC_LOAD,
            path.join(dir, file)
          );
        }
      });
    }
    let bombs = new ActorHookBase();
    bombs.actorID = BOMB_ID;
    bombs.hooks.push(new HookInfo(0x1e8, 0x4));
    bombs.hooks.push(new HookInfo(0x118, 0x4));
    this.bombProcessor = new ActorHookProcessor(
      this.core.actorManager.createIActorFromPointer(0x0),
      bombs,
      this.ModLoader,
      this.core
    );

    let chus = new ActorHookBase();
    chus.actorID = BOMBCHU_ID;
    chus.hooks.push(new HookInfo(0x118, 0x4));
    chus.hooks.push(new HookInfo(0x140, 0x4));
    this.chuProcessor = new ActorHookProcessor(
      this.core.actorManager.createIActorFromPointer(0x0),
      chus,
      this.ModLoader,
      this.core
    );

    let nl = new ActorHookBase();
    nl.actorID = NL_ID;
    this.NLProcessor = new ActorHookProcessor(
      this.core.actorManager.createIActorFromPointer(0x0),
      nl,
      this.ModLoader,
      this.core
    );
    let a = new ActorHookBase();
    a.actorID = ARROW;
    a.hooks.push(new HookInfo(0x24C, 0x4, true));
    a.hooks.push(new HookInfo(0x130, 0x4, true));
    a.hooks.push(new HookInfo(0x134, 0x4, true));
    a.hooks.push(new HookInfo(0x118, 0x4));
    a.hooks.push(new HookInfo(0x200, 0xC));
    a.hooks.push(new HookInfo(0x20C, 0xC));
    a.hooks.push(new HookInfo(0x238, 0x4));
    a.hooks.push(new HookInfo(0x5C, 0xC));
    a.hooks.push(new HookInfo(0x68, 0xC));
    a.hooks.push(new HookInfo(0x30, 0x6));
    a.hooks.push(new HookInfo(0x1C, 0x2));
    a.hooks.push(new HookInfo(0x21C, 0x1C));
    this.arrowProcess = new ActorHookProcessor(
      this.core.actorManager.createIActorFromPointer(0x0),
      a,
      this.ModLoader,
      this.core
    );
  }

  @EventHandler(OotEvents.ON_ACTOR_SPAWN)
  onActorSpawned(actor: IActor) {
    if (!(this.parent as any).client.LobbyConfig.actor_syncing) {
      return;
    }
    if (
      this.actorHookMap.has(actor.actorID) &&
      !this.actorHookTicks.has(actor.actorUUID)
    ) {
      let base: ActorHookBase = this.actorHookMap.get(actor.actorID)!;
      if (base.checkVariable) {
        if (actor.variable !== base.variable) {
          return;
        }
      }
      this.ModLoader.logger.info(
        'Setting up hook for actor ' + this.names['0x' + actor.actorID.toString(16).toUpperCase()] + ': ' + actor.actorUUID + ", " + actor.isTransitionActor + '.'
      );
      if (actor.isTransitionActor) {
        this.transitionHookTicks.set(actor.actorUUID, new ActorHookProcessor(actor, base, this.ModLoader, this.core));
      } else {
        this.actorHookTicks.set(actor.actorUUID, new ActorHookProcessor(actor, base, this.ModLoader, this.core));
      }
    } else if (actor.actorID === BOMB_ID) {
      if (actor.rdramRead32(0x1e8) <= 10) {
        return;
      }
      actor.actorUUID = this.ModLoader.utils.getUUID();
      let actorData: ActorPacketData = new ActorPacketData_Impl(actor);
      this.bombsLocal.set(actor.actorUUID, actor);
      this.ModLoader.clientSide.sendPacket(
        new Ooto_SpawnActorPacket(
          actorData,
          this.core.global.scene,
          this.core.global.room,
          this.ModLoader.clientLobby
        )
      );
    } else if (actor.actorID === BOMBCHU_ID) {
      actor.actorUUID = this.ModLoader.utils.getUUID();
      let actorData: ActorPacketData = new ActorPacketData_Impl(actor);
      this.chusLocal.set(actor.actorUUID, actor);
      this.ModLoader.clientSide.sendPacket(
        new Ooto_SpawnActorPacket(
          actorData,
          this.core.global.scene,
          this.core.global.room,
          this.ModLoader.clientLobby
        )
      );
    } else if (actor.actorID === FW_ID || actor.actorID === DF_ID) {
      actor.actorUUID = this.ModLoader.utils.getUUID();
      let actorData: ActorPacketData = new ActorPacketData_Impl(actor);
      this.ModLoader.clientSide.sendPacket(
        new Ooto_SpawnActorPacket(
          actorData,
          this.core.global.scene,
          this.core.global.room,
          this.ModLoader.clientLobby
        )
      );
    } else if (actor.actorID === NL_ID) {
      actor.actorUUID = this.ModLoader.utils.getUUID();
      let actorData: ActorPacketData = new ActorPacketData_Impl(actor);
      this.NLLocal.set(actor.actorUUID, actor);
      this.ModLoader.clientSide.sendPacket(
        new Ooto_SpawnActorPacket(
          actorData,
          this.core.global.scene,
          this.core.global.room,
          this.ModLoader.clientLobby
        )
      );
    } else if (actor.actorID === ARROW) {
      this.knockedArrow = actor;
    }
  }

  @EventHandler(OotEvents.ON_ACTOR_DESPAWN)
  onActorDespawned(actor: IActor) {
    if (!(this.parent as any).client.LobbyConfig.actor_syncing) {
      return;
    }
    if (this.transitionHookTicks.has(actor.actorUUID)) {
      this.ModLoader.logger.info('Deleting hook for actor ' + this.names["0x" + actor.actorID.toString(16).toUpperCase()] + ': ' + actor.actorUUID + '.');
      this.ModLoader.clientSide.sendPacket(
        new Ooto_ActorDeadPacket(
          actor.actorUUID,
          this.core.global.scene,
          this.core.global.room,
          this.ModLoader.clientLobby
        )
      );
      this.transitionHookTicks.delete(actor.actorUUID);
    }
    if (this.actorHookTicks.has(actor.actorUUID)) {
      this.ModLoader.logger.info('Deleting hook for actor ' + this.names["0x" + actor.actorID.toString(16).toUpperCase()] + ': ' + actor.actorUUID + '.');
      this.ModLoader.clientSide.sendPacket(
        new Ooto_ActorDeadPacket(
          actor.actorUUID,
          this.core.global.scene,
          this.core.global.room,
          this.ModLoader.clientLobby
        )
      );
      this.actorHookTicks.delete(actor.actorUUID);
    } else if (actor.actorID === BOMB_ID) {
      if (this.bombsLocal.has(actor.actorUUID)) {
        this.ModLoader.clientSide.sendPacket(
          new Ooto_ActorDeadPacket(
            actor.actorUUID,
            this.core.global.scene,
            this.core.global.room,
            this.ModLoader.clientLobby
          )
        );
        this.bombsLocal.delete(actor.actorUUID);
      }
    } else if (actor.actorID === BOMBCHU_ID) {
      this.ModLoader.clientSide.sendPacket(
        new Ooto_ActorDeadPacket(
          actor.actorUUID,
          this.core.global.scene,
          this.core.global.room,
          this.ModLoader.clientLobby
        )
      );
      this.chusLocal.delete(actor.actorUUID);
    } else if (actor.actorID === NL_ID) {
      this.ModLoader.clientSide.sendPacket(
        new Ooto_ActorDeadPacket(
          actor.actorUUID,
          this.core.global.scene,
          this.core.global.room,
          this.ModLoader.clientLobby
        )
      );
      this.NLLocal.delete(actor.actorUUID);
    }
  }

  @EventHandler(OotEvents.ON_LOADING_ZONE)
  onLoadingZone(evt: any) {
    this.bombsLocal.clear();
    this.bombsRemote.clear();
    this.chusLocal.clear();
    this.chusRemote.clear();
    this.NLLocal.clear();
    this.NLRemote.clear();
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

  @NetworkHandler('Ooto_ActorPacket')
  onActorPacket(packet: Ooto_ActorPacket) {
    if (packet.player.data.world !== this.ModLoader.me.data.world) return;
    // Specifically deal with doors first.
    if (this.transitionHookTicks.has(packet.actorData.actor.actorUUID)) {
      this.transitionHookTicks.get(
        packet.actorData.actor.actorUUID
      )!.last_inbound_frame = 50;

      let p = this.transitionHookTicks.get(
        packet.actorData.actor.actorUUID
      )!;
      let actor: IActor = p.actor;

      if (!p.hookBase.noMove) {
        actor.position.setRawPos(packet.actorData.rawPos);
        actor.rotation.setRawRot(packet.actorData.rawRot);
      }

      let hooks = p.hookBase.hooks;
      for (let i = 0; i < hooks.length; i++) {
        if (hooks[i].overrideIncoming !== undefined) {
          hooks[i].overrideIncoming(actor, hooks[i].offset, packet.actorData.hooks[i].data, this.ModLoader);
        } else {
          if (hooks[i].isBehavior) {
            let d = packet.actorData.hooks[i].data.readUInt32BE(0x0);
            if (d === 0) {
              // We're going to assume the behavior became zero here.
              actor.rdramWrite32(hooks[i].offset, d);
            } else {
              this.setActorBehavior(
                this.ModLoader.emulator,
                actor,
                hooks[i].offset,
                d
              );
            }
          } else {
            actor.rdramWriteBuffer(
              hooks[i].offset,
              packet.actorData.hooks[i].data
            );
          }
        }
      }
    }
    if (this.actorHookTicks.has(packet.actorData.actor.actorUUID)) {
      this.actorHookTicks.get(
        packet.actorData.actor.actorUUID
      )!.last_inbound_frame = 50;

      let p = this.actorHookTicks.get(
        packet.actorData.actor.actorUUID
      )!;
      let actor: IActor = p.actor;

      if (!p.hookBase.noMove) {
        actor.position.setRawPos(packet.actorData.rawPos);
        actor.rotation.setRawRot(packet.actorData.rawRot);
      }

      let hooks = p.hookBase.hooks;
      for (let i = 0; i < hooks.length; i++) {
        if (hooks[i].overrideIncoming !== undefined) {
          hooks[i].overrideIncoming(actor, hooks[i].offset, packet.actorData.hooks[i].data, this.ModLoader);
        } else {
          if (hooks[i].isBehavior) {
            let d = packet.actorData.hooks[i].data.readUInt32BE(0x0);
            this.setActorBehavior(
              this.ModLoader.emulator,
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
      }
    } else if (this.bombsRemote.has(packet.actorData.actor.actorUUID)) {
      let actor: IActor = this.bombsRemote.get(
        packet.actorData.actor.actorUUID
      )!;


      actor.position.setRawPos(packet.actorData.rawPos);
      actor.rotation.setRawRot(packet.actorData.rawRot);

      for (let i = 0; i < this.bombProcessor.hookBase.hooks.length; i++) {
        actor.rdramWriteBuffer(
          this.bombProcessor.hookBase.hooks[i].offset,
          packet.actorData.hooks[i].data
        );
      }
    } else if (this.chusRemote.has(packet.actorData.actor.actorUUID)) {
      let actor: IActor = this.chusRemote.get(
        packet.actorData.actor.actorUUID
      )!;

      actor.position.setRawPos(packet.actorData.rawPos);
      actor.rotation.setRawRot(packet.actorData.rawRot);

      for (let i = 0; i < this.chuProcessor.hookBase.hooks.length; i++) {
        actor.rdramWriteBuffer(
          this.chuProcessor.hookBase.hooks[i].offset,
          packet.actorData.hooks[i].data
        );
      }
    } else if (this.NLRemote.has(packet.actorData.actor.actorUUID)) {
      let actor: IActor = this.NLRemote.get(
        packet.actorData.actor.actorUUID
      )!;

      actor.position.setRawPos(packet.actorData.rawPos);
      actor.rotation.setRawRot(packet.actorData.rawRot);
    }
  }

  @NetworkHandler('Ooto_ActorDeadPacket')
  onActorDead(packet: Ooto_ActorDeadPacket) {
    if (packet.player.data.world !== this.ModLoader.me.data.world) return;
    if (this.bombsRemote.has(packet.actorUUID)) {
      this.bombsRemote.delete(packet.actorUUID);
    } else if (this.chusRemote.has(packet.actorUUID)) {
      this.chusRemote.delete(packet.actorUUID);
    } else if (this.NLRemote.has(packet.actorUUID)) {
      this.NLRemote.delete(packet.actorUUID);
    }
  }

  @NetworkHandler('Ooto_SpawnActorPacket')
  onActorSpawnRequest(packet: Ooto_SpawnActorPacket) {
    if (
      packet.scene !== this.core.global.scene ||
      packet.room !== this.core.global.room ||
      this.core.helper.isLinkEnteringLoadingZone() ||
      this.core.global.scene_framecount < 100 ||
      this.core.helper.isPaused()
    ) {
      return;
    }
    if (packet.player.data.world !== this.ModLoader.me.data.world) return;
    let spawn_param = 0;
    let pos = this.core.link.position.getRawPos();
    switch (packet.actorData.actor.actorID) {
      case BOMB_ID:
        spawn_param = 0x80600160;
        break;
      case BOMBCHU_ID:
        spawn_param = 0x80600170;
        this.ModLoader.emulator.rdramWrite8(0x600172, pos[0]);
        this.ModLoader.emulator.rdramWrite8(0x600173, pos[1]);

        this.ModLoader.emulator.rdramWrite8(0x60019F, pos[4]);
        this.ModLoader.emulator.rdramWrite8(0x6001A0, pos[5]);
        var f: number = this.ModLoader.emulator.rdramReadF32(0x60019F);
        f += 100.0;
        this.ModLoader.emulator.rdramWriteF32(0x60019F, f);

        this.ModLoader.emulator.rdramWrite16(0x600174, this.ModLoader.emulator.rdramRead16(0x60019F));
        this.ModLoader.emulator.rdramWrite8(0x600176, pos[8]);
        this.ModLoader.emulator.rdramWrite8(0x600177, pos[9]);
        break;
      case FW_ID:
        this.ModLoader.emulator.rdramWrite16(0x600180, FW_ID);
        spawn_param = 0x80600180;
        break;
      case DF_ID:
        this.ModLoader.emulator.rdramWrite16(0x600180, DF_ID);
        spawn_param = 0x80600180;
        break;
      case NL_ID:
        this.ModLoader.emulator.rdramWrite16(0x600180, NL_ID);
        spawn_param = 0x80600180;
        //break;
        return; // Keep this dead for now.
      case DEKU_NUTS:
        spawn_param = 0x806001A2;
        this.ModLoader.emulator.rdramWrite8(0x6001A4, pos[0]);
        this.ModLoader.emulator.rdramWrite8(0x6001A5, pos[1]);

        this.ModLoader.emulator.rdramWrite8(0x6001A6, pos[4]);
        this.ModLoader.emulator.rdramWrite8(0x6001A7, pos[5]);
        var f: number = this.ModLoader.emulator.rdramReadF32(0x6001A6);
        f += 100.0;
        this.ModLoader.emulator.rdramWriteF32(0x60019F, f);

        this.ModLoader.emulator.rdramWrite16(0x600174, this.ModLoader.emulator.rdramRead16(0x60019F));
        this.ModLoader.emulator.rdramWrite8(0x6001A8, pos[8]);
        this.ModLoader.emulator.rdramWrite8(0x6001A9, pos[9]);
        break;
      case ARROW:
        spawn_param = 0x80600190;
        break;
    }
    this.core.commandBuffer.runCommand(
      Command.SPAWN_ACTOR,
      spawn_param,
      (success: boolean, result: number) => {
        if (success) {
          let dref: number = result & 0x00ffffff;
          this.ModLoader.logger.info(dref.toString(16));
          let actor: IActor = this.core.actorManager.createIActorFromPointer(
            dref
          );
          actor.actorUUID = packet.actorData.actor.actorUUID;
          actor.position.setRawPos(packet.actorData.rawPos);
          actor.rotation.setRawRot(packet.actorData.rawRot);

          if (packet.actorData.actor.actorID === BOMB_ID) {
            actor.rdramWrite32(0x6c, 0x0);
            actor.rdramWrite32(0x70, 0x0);
            actor.rdramWrite8(0x118, 0x80);
            this.bombsRemote.set(actor.actorUUID, actor);
          } else if (packet.actorData.actor.actorID === BOMBCHU_ID) {
            this.chusRemote.set(actor.actorUUID, actor);
          } else if (packet.actorData.actor.actorID === NL_ID) {
            this.NLRemote.set(actor.actorUUID, actor);
          } else if (packet.actorData.actor.actorID === ARROW) {
            this.arrowProcess.actor = actor;
            actor.position.setRawPos(packet.actorData.rawPos);
            actor.rdramWriteBuffer(0x8, packet.actorData.rawPos);
            actor.rdramWriteBuffer(0x38, packet.actorData.rawPos);
            actor.rotation.setRawRot(packet.actorData.rawRot);
            let hooks = this.arrowProcess.hookBase.hooks;
            for (let i = 0; i < hooks.length; i++) {
              if (hooks[i].overrideIncoming !== undefined) {
                hooks[i].overrideIncoming(actor, hooks[i].offset, packet.actorData.hooks[i].data, this.ModLoader);
              } else {
                if (hooks[i].isBehavior) {
                  let d = packet.actorData.hooks[i].data.readUInt32BE(0x0);
                  this.setActorBehavior(
                    this.ModLoader.emulator,
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
            }
          }
        }
      }
    );
  }

  @EventHandler(ModLoaderEvents.ON_ROM_PATCHED)
  onRomPatched(evt: any) {
    try {
      let tools: Z64RomTools = new Z64RomTools(this.ModLoader, global.ModLoader.isDebugRom ? Z64LibSupportedGames.DEBUG_OF_TIME : Z64LibSupportedGames.OCARINA_OF_TIME);
      // Make Din's Fire not move to Link.
      let dins: Buffer = tools.decompressActorFileFromRom(evt.rom, 0x009F);
      let dhash: string = this.ModLoader.utils.hashBuffer(dins);
      if (dhash === "b08f7991b2beda5394e4a94cff15b50c") {
        this.ModLoader.logger.info("Patching Din's Fire...");
        dins.writeUInt32BE(0x0, 0x150);
        dins.writeUInt32BE(0x0, 0x158);
        dins.writeUInt32BE(0x0, 0x160);
        dins.writeUInt32BE(0x0, 0x19C);
        dins.writeUInt32BE(0x0, 0x1A4);
        dins.writeUInt32BE(0x0, 0x1AC);
      }
      tools.recompressActorFileIntoRom(evt.rom, 0x009F, dins);

      // Change Zelda's actor category from 'NPC' to 'Chest'.
      // This fixes Ganon's Tower Collapse.
      let buf: Buffer = tools.decompressActorFileFromRom(evt.rom, 0x0179);
      if (buf.readUInt32BE(0x7234) === 0x01790400) {
        this.ModLoader.logger.info("Patching Zelda...");
        buf.writeUInt8(0x0B, 0x7236);
      }
      tools.recompressActorFileIntoRom(evt.rom, 0x0179, buf);

      let patch_path: string = path.resolve(__dirname, "actorPatches");
      fs.readdirSync(patch_path).forEach((file: string) => {
        let f: string = path.resolve(patch_path, file);
        if (fs.existsSync(f)) {
          let patch: Buffer = fs.readFileSync(f);
          let target: number = parseInt(path.parse(f).name.split("-")[0].trim());
          let exp: string = path.resolve(__dirname, "..", "payloads", "E0", path.parse(f).name + ".ovl");
          fs.writeFileSync(exp, new MLPatchLib().apply(tools.decompressActorFileFromRom(evt.rom, target), patch));
        }
      });

    } catch (err) {
      this.ModLoader.logger.error(err.stack);
    }
  }

  @EventHandler(OotEvents.ON_ROOM_CHANGE_PRE)
  onRoomChange(evt: any) {
    this.actorHookTicks.clear();
  }

  tick() {
    this.actorHookTicks.forEach((value: ActorHookProcessor, key: string) => {
      value.onTick();
    });
    this.transitionHookTicks.forEach((value: ActorHookProcessor, key: string) => {
      value.onTick();
    });
    this.bombsLocal.forEach((value: IActor, key: string) => {
      this.bombProcessor.actor = value;
      this.bombProcessor.onTick();
    });
    this.chusLocal.forEach((value: IActor, key: string) => {
      this.chuProcessor.actor = value;
      this.chuProcessor.onTick();
    });
    this.NLLocal.forEach((value: IActor, key: string) => {
      this.NLProcessor.actor = value;
      value.position.x = this.core.link.position.x;
      value.position.y = this.core.link.position.y;
      value.position.z = this.core.link.position.z;
      this.NLProcessor.onTick();
    });
    if (this.knockedArrow !== undefined) {
      if (getActorBehavior(this.ModLoader.emulator, this.knockedArrow, 0x24c) === 0x6A0) {
        this.knockedArrow.actorUUID = this.ModLoader.utils.getUUID();
        let actorData: ActorPacketData = new ActorPacketData_Impl(this.knockedArrow);
        this.arrowProcess.actor = this.knockedArrow;
        actorData.hooks = this.arrowProcess.fakeTick().actorData.hooks;
        this.ModLoader.clientSide.sendPacket(
          new Ooto_SpawnActorPacket(
            actorData,
            this.core.global.scene,
            this.core.global.room,
            this.ModLoader.clientLobby
          )
        );
        this.knockedArrow = undefined;
      }
    }
  }
}
