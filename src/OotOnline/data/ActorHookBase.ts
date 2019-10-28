import { JSONTemplate } from 'modloader64_api/JSONTemplate';
import { IActor } from 'modloader64_api/OOT/IActor';
import IMemory from 'modloader64_api/IMemory';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { Ooto_ActorPacket } from './OotOPackets';
import { IOOTCore } from 'modloader64_api/OOT/OOTAPI';

export class HookInfo {
  offset = 0;
  size = 0;
  isBehavior = false;

  constructor(offset: number, size: number, isBehavior = false) {
    this.offset = offset;
    this.size = size;
    this.isBehavior = isBehavior;
  }
}

export class HookData {
  data!: Buffer;
}

export interface ActorPacketData {
  actor: IActor;
  hooks: HookData[];
}

export class ActorPacketData_Impl implements ActorPacketData {
  actor: IActor;
  hooks: HookData[] = new Array<HookData>();

  constructor(actor: IActor) {
    this.actor = actor;
  }
}

export class ActorHookBase {
  actorID = -1;
  variable = 0;
  checkVariable = false;
  hooks: HookInfo[] = new Array<HookInfo>();

  constructor() {}
}

function getActorBehavior(
  emulator: IMemory,
  actor: IActor,
  offset: number
): number {
  let id: number = actor.actorID;
  let overlay_table: number = global.ModLoader['overlay_table'];
  let overlay_entry = overlay_table + id * 32;
  let behavior_start = overlay_entry + 0x10;
  let pointer = emulator.dereferencePointer(behavior_start);
  let behavior = actor.dereferencePointer(offset);
  if (behavior === 0) {
    return 0;
  }
  return behavior - pointer;
}

export class ActorHookProcessor extends JSONTemplate {
  actor: IActor;
  hookBase: ActorHookBase;
  last_inbound_frame = 0;
  change_target_count = 0;
  lastFrameCache = '';
  modloader: IModLoaderAPI;
  core: IOOTCore;

  constructor(
    actor: IActor,
    hooks: ActorHookBase,
    modloader: IModLoaderAPI,
    core: IOOTCore
  ) {
    super();
    this.actor = actor;
    this.hookBase = hooks;
    this.modloader = modloader;
    this.core = core;
  }

  onTick() {
    if (this.lastFrameCache !== JSON.stringify(this.toJSON())) {
      this.lastFrameCache = JSON.stringify(this.toJSON());
      if (this.last_inbound_frame === 0) {
        this.modloader.clientSide.sendPacket(
          new Ooto_ActorPacket(
            JSON.parse(this.lastFrameCache) as ActorPacketData,
            this.core.global.scene,
            this.core.global.room,
            this.modloader.clientLobby
          )
        );
      }
    }
    if (this.last_inbound_frame > 0) {
      this.last_inbound_frame--;
    }
  }

  toJSON() {
    let jsonObj: any = {};
    jsonObj['actor'] = (this.actor as any).toJSON();
    jsonObj['hooks'] = [];
    for (let i = 0; i < this.hookBase.hooks.length; i++) {
      let hookData = new HookData();
      if (this.hookBase.hooks[i].isBehavior) {
        hookData.data = Buffer.alloc(0x4);
        let offset: number = getActorBehavior(
          this.modloader.emulator,
          this.actor,
          this.hookBase.hooks[i].offset
        );
        if (offset > 0) {
          hookData.data.writeUInt32BE(offset, 0x0);
        }
      } else {
        hookData.data = this.actor.rdramReadBuffer(
          this.hookBase.hooks[i].offset,
          this.hookBase.hooks[i].size
        );
      }
      jsonObj.hooks.push(hookData);
    }
    return jsonObj;
  }
}
