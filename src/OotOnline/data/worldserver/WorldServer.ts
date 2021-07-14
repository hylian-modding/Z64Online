import fs from 'fs';
import path from 'path';
import { INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { ActorSpawn } from './ActorSpawn';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { Z64O_WorldActorSpawnPacket } from './WorldPackets';

export class ActorList{
    actorSpawnParams: Array<ActorSpawn> = [];
    actors: Array<ActorSpawn> = [];
}

export class RoomInstance{
    world: number;
    scene: number;
    room: number;
    actorList: ActorList = new ActorList();
    players: Array<string> = [];

    constructor(world: number, sceneID: number, room: number){
        this.world = world;
        this.scene = sceneID;
        this.room = room;
        let p = path.resolve(__dirname, "scenes", sceneID.toString(), "rooms", room.toString(), "actors.json");
        if (fs.existsSync(p)){
            this.actorList = JSON.parse(fs.readFileSync(p).toString());
        }
    }

    playerEnteredRoom(ModLoader: IModLoaderAPI, player: INetworkPlayer){
        ModLoader.serverSide.sendPacketToSpecificPlayer(new Z64O_WorldActorSpawnPacket(this.world, this.scene, this.room, this.actorList.actorSpawnParams, ""), player);
        if (this.players.indexOf(player.uuid) > -1) return;
        this.players.push(player.uuid);
    }

    playerLeftRoom(player: INetworkPlayer){
        let i = this.players.indexOf(player.uuid);
        if (i > -1) this.players.splice(i, 1);
    }

    tick(){
        if (this.actorList.actors.length === 0) return;
        for (let i = 0; i < this.actorList.actors.length; i++){
            // Do something?
        }
    }
}

export class SceneInstance{
    players: Array<string> = [];
    rooms: Array<RoomInstance> = [];

    createRoom(world: number, scene: number, room: number){
        if (this.rooms[room] !== undefined) return;
        this.rooms[room] = new RoomInstance(world, scene, room);
    }

    getRoom(room: number){
        return this.rooms[room];
    }

    playerEnteredScene(player: INetworkPlayer){
        if (this.players.indexOf(player.uuid) > -1) return;
        this.players.push(player.uuid);
    }

    playerLeftScene(player: INetworkPlayer){
        let i = this.players.indexOf(player.uuid);
        if (i > -1) this.players.splice(i, 1);
        for (let i = 0; i < this.rooms.length; i++){
            this.rooms[i].playerLeftRoom(player);
        }
    }

    tick(){
        for (let i = 0; i < this.rooms.length; i++){
            if (this.rooms[i] !== undefined && this.rooms[i].players.length > 0){
                this.rooms[i].tick();
            }
        }
    }
}

export class WorldInstance{
    scenes: Array<SceneInstance> = [];

    createScene(scene: number){
        if (this.scenes[scene] !== undefined) return;
        this.scenes[scene] = new SceneInstance();
    }

    getScene(scene: number){
        return this.scenes[scene];
    }

    tick(){
        for (let i = 0; i < this.scenes.length; i++){
            if (this.scenes[i] !== undefined && this.scenes[i].players.length > 0){
                this.scenes[i].tick();
            }
        }
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

    tick(){
        let k = Object.keys(this.worlds);
        for (let i = 0; i < k.length; i++){
            (this.worlds[k[i]] as WorldInstance).tick();
        }
    }
}