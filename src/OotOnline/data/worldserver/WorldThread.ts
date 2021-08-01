import { parentPort } from 'worker_threads';
import path from 'path';
import fs from 'fs';
import { ActorSpawn } from './ActorSpawn';
import { ActorSim, IActorSim, IActorSimImplServer } from './ActorSim';
import { INetworkPlayer } from 'modloader64_api/NetworkHandler';
import crypto from 'crypto';
import { EventsServer } from 'modloader64_api/EventHandler';
import { OotO_RoomPacket, Ooto_ScenePacket } from '../OotOPackets';
import { Z64O_WorldActorPossessedPacket, Z64O_WorldActorPossessedUpdatePacket, Z64O_WorldActorSpawnPacket, Z64O_WorldActorSyncPacket } from './WorldPackets';
import { ThreadData } from './ThreadData';
import { En_Bubble_Server } from './actors/En_Bubble';
import Vector3 from 'modloader64_api/math/Vector3';

const byteToHex: Array<string> = [];
for (var i = 0; i < 256; ++i) {
    byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

export class UUID {
    static bytesToUuid(buf: Buffer, offset: number = 0) {
        var i = offset || 0;
        var bth = byteToHex;
        return [
            bth[buf[i++]],
            bth[buf[i++]],
            bth[buf[i++]],
            bth[buf[i++]],
            '-',
            bth[buf[i++]],
            bth[buf[i++]],
            '-',
            bth[buf[i++]],
            bth[buf[i++]],
            '-',
            bth[buf[i++]],
            bth[buf[i++]],
            '-',
            bth[buf[i++]],
            bth[buf[i++]],
            bth[buf[i++]],
            bth[buf[i++]],
            bth[buf[i++]],
            bth[buf[i++]],
        ].join('');
    }

    static v4() {
        var rnds = crypto.randomBytes(16);
        rnds[6] = (rnds[6] & 0x0f) | 0x40;
        rnds[8] = (rnds[8] & 0x3f) | 0x80;
        return this.bytesToUuid(rnds);
    }
}

export class ActorSimReg {
    static map: Map<number, new (sim: IActorSim) => IActorSimImplServer> = new Map();
}

ActorSimReg.map.set(0x2D, En_Bubble_Server);

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

    playerEnteredRoom(player: INetworkPlayer, lobby: string) {
        if (this.players.indexOf(player.uuid) > -1) return;
        if (this.players.length === 0) {
            this.actorList.actors.splice(0, this.actorList.actors.length - 1);
            for (let i = 0; i < this.actorList.actorSpawnParams.length; i++) {
                let sim = new ActorSim(this.world, this.scene, this.room, lobby, this.actorList.actorSpawnParams[i].actorID, UUID.v4());
                this.actorList.actorSpawnParams[i].uuid = sim.uuid;
                if (ActorSimReg.map.has(this.actorList.actorSpawnParams[i].actorID)) {
                    let n = ActorSimReg.map.get(this.actorList.actorSpawnParams[i].actorID)!;
                    sim.sim = new n(sim);
                    sim.sim.pos = this.actorList.actorSpawnParams[i].pos
                    sim.sim.rot = this.actorList.actorSpawnParams[i].rot
                }
                this.actorList.actors.push(sim);
            }
        }
        this.players.push(player.uuid);
        parentPort!.postMessage({ id: "TO_PLAYER", data: { packet: JSON.stringify(new Z64O_WorldActorSpawnPacket(this.world, this.scene, this.room, "", this.actorList.actorSpawnParams)), player }});
    }

    playerLeftRoom(player: INetworkPlayer) {
        let i = this.players.indexOf(player.uuid);
        if (i > -1) this.players.splice(i, 1);
    }

    tick(tickTime: number) {
        if (this.actorList.actors.length === 0) return;
        for (let i = 0; i < this.actorList.actors.length; i++) {
            if (this.actorList.actors[i].sim !== undefined) {
                (this.actorList.actors[i].sim as IActorSimImplServer)!.onTickServer(tickTime, this.players, this.actorList);
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

    tick(tickTime: number) {
        for (let i = 0; i < this.rooms.length; i++) {
            if (this.rooms[i] !== undefined && this.rooms[i].players.length > 0) {
                this.rooms[i].tick(tickTime);
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

    tick(tickTime: number) {
        for (let i = 0; i < this.scenes.length; i++) {
            if (this.scenes[i] !== undefined && this.scenes[i].players.length > 0) {
                this.scenes[i].tick(tickTime);
            }
        }
    }
}

export class WorldServer {
    worlds: Map<number, WorldInstance> = new Map();

    createWorld(id: number) {
        if (!this.worlds.has(id)) {
            this.worlds.set(id, new WorldInstance());
        }
    }

    hasWorld(world: number) {
        return this.worlds.has(world);
    }

    getWorld(world: number) {
        return this.worlds.get(world);
    }

    tick(tickTime: number) {
        for (const [key, value] of this.worlds.entries()) {
            value.tick(tickTime);
        }
    }
}

export interface IMonkeyPatch {
    patch(): void;
    unpatch(): void;
}
export class MonkeyPatch {
    original!: Function;
    replacement!: Function;
}

const BJSON = require('buffer-json');

export class MonkeyPatch_Stringify extends MonkeyPatch implements IMonkeyPatch {
    patch() {
        this.original = JSON.stringify;
        this.replacement = (
            value: any,
            replacer?: (this: any, key: string, value: any) => any,
            space?: string | number
        ) => {
            if (replacer === undefined) {
                return this.original(value, BJSON.replacer, space);
            }
            return this.original(value, replacer, space);

        };
        (JSON as any)['stringify'] = this.replacement as Function;
    }

    unpatch() {
        (JSON as any)['stringify'] = this.original as Function;
    }
}

export class MonkeyPatch_Parse extends MonkeyPatch implements IMonkeyPatch {
    patch(): void {
        this.original = JSON.parse;
        this.replacement = (
            text: string,
            reviver?: (this: any, key: string, value: any) => any
        ) => {
            if (reviver === undefined) {
                return this.original(text, BJSON.reviver);
            }
            return this.original(text, reviver);

        };
        (JSON as any)['parse'] = this.replacement as Function;
    }

    unpatch(): void {
        (JSON as any)['parse'] = this.original as Function;
    }
}

let mp1: MonkeyPatch_Stringify = new MonkeyPatch_Stringify();
mp1.patch();
let mp2: MonkeyPatch_Parse = new MonkeyPatch_Parse();
mp2.patch();

let servers: Map<string, WorldServer> = new Map();
let tickrate: number = 20
let tickTime = 1 / tickrate

let tick = setInterval(() => {
    for (const [key, value] of servers.entries()) {
        value.tick(tickTime);
    }
}, tickTime * 1000);

parentPort!.on('message', (data: ThreadData) => {
    let sim;

    switch (data.id) {
        case EventsServer.ON_LOBBY_CREATE:
            console.log("Creating world server for lobby " + data.data + ".");
            servers.set(data.data, new WorldServer());
            break;
        case EventsServer.ON_LOBBY_DESTROY:
            servers.delete(data.data);
            break;
        case "Ooto_ScenePacket":
        case "OotO_RoomPacket":
            let scene_packet: Ooto_ScenePacket | OotO_RoomPacket = data.data;
            servers.get(scene_packet.lobby)!.createWorld(scene_packet.player.data.world);
            servers.get(scene_packet.lobby)!.getWorld(scene_packet.player.data.world)!.createScene(scene_packet.scene);
            servers.get(scene_packet.lobby)!.getWorld(scene_packet.player.data.world)!.getScene(scene_packet.scene).playerEnteredScene(scene_packet.player);
            servers.get(scene_packet.lobby)!.getWorld(scene_packet.player.data.world)!.getScene(scene_packet.scene).createRoom(scene_packet.player.data.world, scene_packet.scene, scene_packet.room);
            servers.get(scene_packet.lobby)!.getWorld(scene_packet.player.data.world)!.getScene(scene_packet.scene).getRoom(scene_packet.room).playerEnteredRoom(scene_packet.player, scene_packet.lobby);
            break;
        case "Z64O_WorldActorSyncPacket":
            if (data.data.world == undefined) data.data.world = 0
            let sync_packet: Z64O_WorldActorSyncPacket = data.data;
            sim = (servers.get(sync_packet.lobby)!.getWorld(sync_packet.player.data.world)!.getScene(sync_packet.scene).getRoom(sync_packet.room).actorLookup(sync_packet.uuid));
            if (sim === undefined) break;
            (sim!.sim as IActorSimImplServer).processZ64O_WorldActorSyncPacket(sync_packet);
            break;
        case "Z64O_WorldActorPossessedPacket":
            if (data.data.world == undefined) data.data.world = 0
            let possessed_packet: Z64O_WorldActorPossessedPacket = data.data;
            sim = (servers.get(possessed_packet.lobby)!.getWorld(possessed_packet.player.data.world)!.getScene(possessed_packet.scene).getRoom(possessed_packet.room).actorLookup(possessed_packet.uuid));
            if (sim === undefined) break;
            (sim!.sim as IActorSimImplServer).processZ64O_WorldActorPossessedPacket(possessed_packet);
            break;
        case "Z64O_WorldActorPossessedUpdatePacket":
            if (data.data.world == undefined) data.data.world = 0
            let possess_update_packet: Z64O_WorldActorPossessedUpdatePacket = data.data;
            sim = (servers.get(possess_update_packet.lobby)!.getWorld(possess_update_packet.player.data.world)!.getScene(possess_update_packet.scene).getRoom(possess_update_packet.room).actorLookup(possess_update_packet.uuid));
            if (sim === undefined) break;
            (sim!.sim as IActorSimImplServer).processZ64O_WorldActorPossessedUpdatePacket(possess_update_packet);
            break;

    }
});