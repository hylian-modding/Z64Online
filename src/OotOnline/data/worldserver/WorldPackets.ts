import { Packet } from "modloader64_api/ModLoaderDefaultImpls";
import Vector3 from "../../../../../../ModLoader64/API/build/math/Vector3";
import { ActorSpawn } from "./ActorSpawn";

export class Z64O_WorldActorSpawnPacket extends Packet{

    world: number;
    scene: number;
    room: number;
    actors: Array<ActorSpawn>;

    constructor(world: number, scene: number, room: number, lobby: string, actors: Array<ActorSpawn>) {
        super('Z64O_WorldActorSpawnPacket', 'Z64O', lobby, false);
        this.actors = actors;
        this.world = world;
        this.scene = scene;
        this.room = room;
    }
}

export class Z64O_WorldActorSyncPacket extends Packet {
    world: number;
    scene: number;
    room: number;
    uuid: string;
    pos: Vector3;
    rot: Vector3;
    vel: Vector3;
    struct: any;

    constructor(world: number, scene: number, room: number, uuid: string, lobby: string, pos: Vector3, rot: Vector3, vel: Vector3, struct: any) {
        super('Z64O_WorldActorSyncPacket', 'Z64O', lobby, false);
        this.world = world;
        this.scene = scene;
        this.room = room;
        this.uuid = uuid;
        this.struct = struct;
        this.pos = pos;
        this.rot = rot;
        this.vel = vel;
    }
}

export class Z64O_WorldActorPossessedPacket extends Packet {
    world: number;
    scene: number;
    room: number;
    uuid: string;
    possessed: number;

    constructor(world: number, scene: number, room: number, uuid: string, lobby: string, possessed: number) {
        super('Z64O_WorldActorPossessedPacket', 'Z64O', lobby, false);
        this.world = world;
        this.scene = scene;
        this.room = room;
        this.uuid = uuid;
        this.possessed = possessed;
    }
}

export class Z64O_WorldActorPossessedUpdatePacket extends Packet {
    world: number;
    scene: number;
    room: number;
    uuid: string;
    pos: Vector3;
    rot: Vector3;
    vel: Vector3;
    struct: any;

    constructor(world: number, scene: number, room: number, uuid: string, lobby: string, pos: Vector3, rot: Vector3, vel: Vector3, struct: any) {
        super('Z64O_WorldActorPossessedUpdatePacket', 'Z64O', lobby, false);
        this.world = world;
        this.scene = scene;
        this.room = room;
        this.uuid = uuid;
        this.struct = struct;
        this.pos = pos;
        this.rot = rot;
        this.vel = vel;
    }
}