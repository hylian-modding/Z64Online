import { Packet } from "modloader64_api/ModLoaderDefaultImpls";
import { ActorSim } from "./ActorSim";
import { ActorSpawn } from "./ActorSpawn";

export class Z64O_WorldActorSpawnPacket extends Packet{
    
    world: number;
    scene: number;
    room: number;
    actors: Array<ActorSpawn>;

    constructor(world: number, scene: number, room: number, actors: Array<ActorSpawn>, lobby: string){
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
    state: number;
    struct: Buffer | undefined;

    constructor(world: number, scene: number, room: number, uuid: string, state: number, struct: Buffer | undefined, lobby: string){
        super('Z64O_WorldActorSyncPacket', 'Z64O', lobby, false);
        this.world = world;
        this.scene = scene;
        this.room = room;
        this.uuid = uuid;
        this.state = state;
        this.struct = struct;
    }

}