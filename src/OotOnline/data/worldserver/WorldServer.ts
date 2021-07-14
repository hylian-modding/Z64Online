import fs from 'fs';
import path from 'path';
import { INetworkPlayer, ServerNetworkHandler } from 'modloader64_api/NetworkHandler';
import { ActorSpawn } from './ActorSpawn';
import { IModLoaderAPI, IPlugin } from 'modloader64_api/IModLoaderAPI';
import { Z64O_WorldActorSpawnPacket, Z64O_WorldActorSyncPacket } from './WorldPackets';
import { ActorSim, En_Bubble_Instance, IActorSimImpl } from './ActorSim';
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import { OotOnlineStorage } from '@OotOnline/OotOnlineStorage';
import { ParentReference } from 'modloader64_api/SidedProxy/SidedProxy';
import { Preinit } from 'modloader64_api/PluginLifecycle';

export class MLRefHolder {
    static ModLoader: IModLoaderAPI;
    static parent: IPlugin;
}

export class ActorSimReg {
    static map: Map<number, new (simu: ActorSim) => IActorSimImpl> = new Map();
}

export class ActorList {
    actorSpawnParams: Array<ActorSpawn> = [];
    actors: Array<ActorSim> = [];
}

export class RoomInstance {
    world: number;
    scene: number;
    room: number;
    actorList: ActorList = new ActorList();
    players: Array<string> = [];

    constructor(world: number, sceneID: number, room: number) {
        this.world = world;
        this.scene = sceneID;
        this.room = room;
        let p = path.resolve(__dirname, "scenes", sceneID.toString(), "rooms", room.toString(), "actors.json");
        if (fs.existsSync(p)) {
            this.actorList.actorSpawnParams = JSON.parse(fs.readFileSync(p).toString());
        }
    }

    playerEnteredRoom(ModLoader: IModLoaderAPI, player: INetworkPlayer) {
        if (this.players.indexOf(player.uuid) > -1) return;
        if (this.players.length === 0) {
            this.actorList.actors.splice(0, this.actorList.actors.length - 1);
            for (let i = 0; i < this.actorList.actorSpawnParams.length; i++) {
                let sim = new ActorSim(this.world, this.scene, this.room, MLRefHolder.ModLoader.clientLobby, this.actorList.actorSpawnParams[i].actorID, this.actorList.actorSpawnParams[i].pos, this.actorList.actorSpawnParams[i].rot, this.actorList.actorSpawnParams[i].variable, MLRefHolder.ModLoader.utils.getUUID());
                this.actorList.actorSpawnParams[i].uuid = sim.uuid;
                if (ActorSimReg.map.has(this.actorList.actorSpawnParams[i].actorID)) {
                    let n = ActorSimReg.map.get(this.actorList.actorSpawnParams[i].actorID)!;
                    sim.sim = new n(sim);
                }
                this.actorList.actors.push(sim);
            }
        }
        ModLoader.serverSide.sendPacketToSpecificPlayer(new Z64O_WorldActorSpawnPacket(this.world, this.scene, this.room, this.actorList.actorSpawnParams, ""), player);
        this.players.push(player.uuid);
    }

    playerLeftRoom(player: INetworkPlayer) {
        let i = this.players.indexOf(player.uuid);
        if (i > -1) this.players.splice(i, 1);
    }

    tick() {
        if (this.actorList.actors.length === 0) return;
        for (let i = 0; i < this.actorList.actors.length; i++) {
            if (this.actorList.actors[i].sim !== undefined) {
                this.actorList.actors[i].sim!.onTickServer(MLRefHolder.ModLoader, this.players);
            }
        }
    }

    actorLookup(uuid: string): ActorSim | undefined {
        for (let i = 0; i < this.actorList.actors.length; i++) {
            if (this.actorList.actors[i].uuid === uuid) return this.actorList.actors[i];
        }
        return undefined;
    }
}

export class SceneInstance {
    players: Array<string> = [];
    rooms: Array<RoomInstance> = [];

    createRoom(world: number, scene: number, room: number) {
        if (this.rooms[room] !== undefined) return;
        this.rooms[room] = new RoomInstance(world, scene, room);
    }

    getRoom(room: number) {
        return this.rooms[room];
    }

    playerEnteredScene(player: INetworkPlayer) {
        if (this.players.indexOf(player.uuid) > -1) return;
        this.players.push(player.uuid);
    }

    playerLeftScene(player: INetworkPlayer) {
        let i = this.players.indexOf(player.uuid);
        if (i > -1) this.players.splice(i, 1);
        for (let i = 0; i < this.rooms.length; i++) {
            this.rooms[i].playerLeftRoom(player);
        }
    }

    tick() {
        for (let i = 0; i < this.rooms.length; i++) {
            if (this.rooms[i] !== undefined && this.rooms[i].players.length > 0) {
                this.rooms[i].tick();
            }
        }
    }
}

export class WorldInstance {
    scenes: Array<SceneInstance> = [];

    createScene(scene: number) {
        if (this.scenes[scene] !== undefined) return;
        this.scenes[scene] = new SceneInstance();
    }

    getScene(scene: number) {
        return this.scenes[scene];
    }

    tick() {
        for (let i = 0; i < this.scenes.length; i++) {
            if (this.scenes[i] !== undefined && this.scenes[i].players.length > 0) {
                this.scenes[i].tick();
            }
        }
    }
}

export class WorldServer {
    worlds: any = {};

    createWorld(id: number) {
        if (!this.worlds.hasOwnProperty(id)) {
            this.worlds[id] = new WorldInstance();
        }
    }

    hasWorld(world: number) {
        return this.worlds.hasOwnProperty(world);
    }

    getWorld(world: number) {
        return this.worlds[world] as WorldInstance;
    }

    tick() {
        let k = Object.keys(this.worlds);
        for (let i = 0; i < k.length; i++) {
            (this.worlds[k[i]] as WorldInstance).tick();
        }
    }
}

export class WorldServerManager {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @ParentReference()
    parent!: IPlugin;

    @Preinit()
    preinit() {
        ActorSimReg.map.set(0x2D, En_Bubble_Instance);
    }

    @ServerNetworkHandler('Z64O_WorldActorSyncPacket')
    onPacket(packet: Z64O_WorldActorSyncPacket) {
        let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
        ) as OotOnlineStorage;
        if (storage === null) {
            return;
        }
        let sim = storage.worldServer.getWorld(packet.world).getScene(packet.scene).getRoom(packet.room).actorLookup(packet.uuid);
        if (sim !== undefined) {
            sim.sim.processPacketServer(MLRefHolder.ModLoader, sim, packet);
        }
    }

}