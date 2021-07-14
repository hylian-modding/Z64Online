import fs from 'fs';
import path from 'path';
import { INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { ActorSpawn } from './ActorSpawn';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { Z64O_WorldActorSpawnPacket } from './WorldPackets';

export class ActorList{
    actors: Array<ActorSpawn> = [];
}

export class RoomInstance{
    world: number;
    scene: number;
    room: number;
    actors: Array<ActorSpawn> = [];

    constructor(world: number, sceneID: number, room: number){
        this.world = world;
        this.scene = sceneID;
        this.room = room;
        let p = path.resolve(__dirname, "scenes", sceneID.toString(), "rooms", room.toString(), "actors.json");
        if (fs.existsSync(p)){
            this.actors = JSON.parse(fs.readFileSync(p).toString());
        }
    }

    playerEnteredRoom(ModLoader: IModLoaderAPI, player: INetworkPlayer){
        ModLoader.serverSide.sendPacketToSpecificPlayer(new Z64O_WorldActorSpawnPacket(this.world, this.scene, this.room, this.actors, ""), player);
    }
}

export class SceneInstance{
    rooms: Array<RoomInstance> = [];

    createRoom(world: number, scene: number, room: number){
        this.rooms[room] = new RoomInstance(world, scene, room);
    }

    getRoom(room: number){
        return this.rooms[room];
    }
}

export class WorldInstance{
    scenes: Array<SceneInstance> = [];

    createScene(scene: number){
        this.scenes[scene] = new SceneInstance();
    }

    getScene(scene: number){
        return this.scenes[scene];
    }
}

export class WorldServer{
    worlds: any = {};

    createWorld(id: number){
        if (!this.worlds.hasOwnProperty(id)){
            this.worlds[id] = new WorldInstance();
        }
    }

    hasWorld(world: number){
        return this.worlds.hasOwnProperty(world);
    }

    getWorld(world: number){
        return this.worlds[world] as WorldInstance;
    }
}