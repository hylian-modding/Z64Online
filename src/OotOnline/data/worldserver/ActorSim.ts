import Vector3 from "modloader64_api/math/Vector3";
import { IActor } from "modloader64_api/OOT/IActor";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { Z64O_WorldActorSyncPacket } from "./WorldPackets";

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

export interface IActorSimImplClient extends IGenericActorSim {
    processPacketClient(ModLoader: IModLoaderAPI, packet: Z64O_WorldActorSyncPacket): void;
    onTickClient(ModLoader: IModLoaderAPI): void;
}

export interface IActorSimImplServer extends IGenericActorSim {
    generatePacket(sim: IActorSim): Z64O_WorldActorSyncPacket;
    processPacketServer(packet: Z64O_WorldActorSyncPacket): void;
    onTickServer(tickTime: number, playerList: Array<string>): void;
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
