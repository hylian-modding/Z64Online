import Vector3 from "modloader64_api/math/Vector3";
import { IActor } from "modloader64_api/OOT/IActor";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { Z64O_WorldActorPossessedPacket, Z64O_WorldActorPossessedUpdatePacket, Z64O_WorldActorSyncPacket } from "./WorldPackets";
import { ActorList } from "./WorldThread";

export interface IGenericActor {
    actorID: number;
    flags: number;
    minVelocityY: number;
}

export interface IGenericActorSim {
    pos: Vector3;
    rot: Vector3;
    vel: Vector3;
}

// FIXME: if this system is ported to mm, this needs to be modular!
export const enum eGenericActorOffsets {
    id = 0x000,
    category = 0x002,
    room = 0x003,
    flags = 0x004,
    home = 0x008,
    params = 0x01C,
    objBankIndex = 0x01E,
    targetMode = 0x01F,
    sfx = 0x020,
    world = 0x024,
    focus = 0x038,
    targetArrowOffset = 0x04C,
    scale = 0x050,
    velocity = 0x05C,
    speedXZ = 0x068,
    gravity = 0x06C,
    minVelocityY = 0x070,
    wallPoly = 0x074,
    floorPoly = 0x078,
    wallBgId = 0x07C,
    floorBgId = 0x07D,
    wallYaw = 0x07E,
    floorHeight = 0x080,
    yDistToWater = 0x084,
    bgCheckFlags = 0x088,
    yawTowardsPlayer = 0x08A,
    xyzDistToPlayerSq = 0x08C,
    xzDistToPlayer = 0x090,
    yDistToPlayer = 0x094,
    colChkInfo = 0x098,
    shape = 0x0B4,
    projectedPos = 0x0E4,
    projectedW = 0x0F0,
    uncullZoneForward = 0x0F4,
    uncullZoneScale = 0x0F8,
    uncullZoneDownward = 0x0FC,
    prevPos = 0x100,
    isTargeted = 0x10C,
    targetPriority = 0x10D,
    textId = 0x10E,
    freezeTimer = 0x110,
    colorFilterParams = 0x112,
    colorFilterTimer = 0x114,
    isDrawn = 0x115,
    dropFlag = 0x116,
    naviEnemyId = 0x117,
    parent = 0x118,
    child = 0x11C,
    prev = 0x120,
    next = 0x124,
    init = 0x128,
    destroy = 0x12C,
    update = 0x130,
    draw = 0x134,
    overlayEntry = 0x138,
    serverState = 0x13C,
    clientState = 0x13D,
    clientMessage = 0x13E,
    possesed = 0x13F
}

export interface IActorSimImplClient extends IGenericActorSim {
    processZ64O_WorldActorSyncPacket(ModLoader: IModLoaderAPI, packet: Z64O_WorldActorSyncPacket): void;
    processZ64O_WorldActorPossessedPacket(ModLoader: IModLoaderAPI, packet: Z64O_WorldActorPossessedPacket): void;
    onTickClient(ModLoader: IModLoaderAPI): void;
}

export interface IActorSimImplServer extends IGenericActorSim {
    serverActorName: string;
    generatePacket(sim: IActorSim): Z64O_WorldActorSyncPacket;
    processZ64O_WorldActorSyncPacket(packet: Z64O_WorldActorSyncPacket): void;
    processZ64O_WorldActorPossessedPacket(packet: Z64O_WorldActorPossessedPacket): void;
    processZ64O_WorldActorPossessedUpdatePacket(packet: Z64O_WorldActorPossessedUpdatePacket): void;
    onTickServer(tickTime: number, playerList: Array<string>, actorList: ActorList): void;
}

export interface IActorSim {
    world: number;
    scene: number;
    room: number;
    lobby: string;
    uuid: string;
    parent: string | undefined;
    actor: IActor;
}

export class ActorSim implements IActorSim {
    world: number;
    scene: number;
    room: number;
    lobby: string;
    uuid: string;
    parent: string | undefined;
    actor!: IActor;
    sim!: IActorSimImplClient | IActorSimImplServer;

    constructor(world: number, scene: number, room: number, lobby:string, actorID: number, uuid: string) {
        this.uuid = uuid;
        this.world = world;
        this.scene = scene;
        this.room = room;
        this.lobby = lobby;
    }
}
