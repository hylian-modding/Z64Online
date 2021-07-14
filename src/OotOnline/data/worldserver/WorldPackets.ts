import { Packet } from "modloader64_api/ModLoaderDefaultImpls";
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