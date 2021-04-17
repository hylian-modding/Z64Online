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
  overrideIncoming!: (actor: IActor, offset: number, data: Buffer, ModLoader: IModLoaderAPI) => void;

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
  rawPos: Buffer;
  rawRot: Buffer;
  variable: number;
  hooks: HookData[];
}

export class ActorPacketData_Impl implements ActorPacketData {
  actor: IActor;
  variable: number;
  rawPos: Buffer;
  rawRot: Buffer;
  hooks: HookData[] = new Array<HookData>();

  constructor(actor: IActor) {
    this.actor = actor;
    this.variable = this.actor.variable;
    this.rawPos = this.actor.position.getRawPos();
    this.rawRot = this.actor.rotation.getRawRot();
    this.actor = JSON.parse(JSON.stringify(this.actor));
  }
}

export class ActorHookBase {
  actorID = -1;
  variable = 0;
  checkVariable = false;
  hooks: HookInfo[] = new Array<HookInfo>();
  noMove: boolean;

  constructor(noMove = false) {
    this.noMove = noMove;
  }
}

export function getActorBehavior(
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
    let k = this.toJSON();
    let j = JSON.stringify(k);
    if (this.lastFrameCache !== j) {
      this.lastFrameCache = j;
      if (this.last_inbound_frame === 0) {
        let p = new Ooto_ActorPacket(
          k,
          this.core.global.scene,
          this.core.global.room,
          this.modloader.clientLobby
        );
        this.modloader.clientSide.sendPacket(p);
      }
    }
    if (this.last_inbound_frame > 0) {
      this.last_inbound_frame--;
    }
  }

  fakeTick(): Ooto_ActorPacket {
    let k = this.toJSON();
    let j = JSON.stringify(k);
    this.lastFrameCache = j;
    let p = new Ooto_ActorPacket(
      k,
      this.core.global.scene,
      this.core.global.room,
      this.modloader.clientLobby
    );
    return p;
  }

  toJSON() {
    let jsonObj: any = {};
    jsonObj['actor'] = (this.actor as any).toJSON();
    jsonObj["variable"] = this.actor.variable;
    jsonObj["rawPos"] = this.actor.position.getRawPos();
    jsonObj["rawRot"] = this.actor.rotation.getRawRot();
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
        if (offset < 0) {
          offset = 0;
        }
        hookData.data.writeUInt32BE(offset, 0x0);
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
