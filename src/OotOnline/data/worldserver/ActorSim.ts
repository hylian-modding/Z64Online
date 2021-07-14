import Vector3 from "modloader64_api/math/Vector3";
import { IActor } from "modloader64_api/OOT/IActor";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { DECR } from "./transliteration/Macros";
import { Rand_S16Offset, Math_ApproachF, Vec3ftoBuffer, Vec3stoBuffer } from "./transliteration/Math";
import { Math3D } from "./transliteration/Math3D";
import { Z64O_WorldActorSyncPacket } from "./WorldPackets";
import { OOTO_PRIVATE_EVENTS, SendToScene } from "../InternalAPI";
import { SmartBuffer } from 'smart-buffer';
import { OotOnlineStorage } from "@OotOnline/OotOnlineStorage";
import { MLRefHolder } from "./WorldServer";

export interface IActorSimImpl {
    generatePacket(): Z64O_WorldActorSyncPacket;
    processPacketClient(ModLoader: IModLoaderAPI, actor: ActorSim, packet: Z64O_WorldActorSyncPacket): void;
    processPacketServer(ModLoader: IModLoaderAPI, actor: ActorSim, packet: Z64O_WorldActorSyncPacket): void;
    onTickServer(ModLoader: IModLoaderAPI, playerList: Array<string>): void;
    onTickClient(ModLoader: IModLoaderAPI): void;
}

enum En_Bubble_ClientMessage {
    NONE,
    POP
};

enum En_Bubble_State {
    STATE_WAIT,
    STATE_POP,
    STATE_DEAD,
    STATE_REALLYDEAD
};

const BUBBLE_PACK: any = {
    0x004: 0x4, // flags (u32)
    0x024: 0xC, // pos (vec3f)
    0x030: 0x6, // rot (vec3s)
    0x05C: 0xC, // vel (vec3f)
    0x70: 0x4, // min vel y (float)
    0x1DE: 0x2, // explosion counter (u16)
    0x1F0: 0x4  // state (u32)
}

export class En_Bubble_Instance implements IActorSimImpl {
    actionFunc: Function
    explosionCountdown: number
    bounceCount: number
    bounceDirection: Vector3
    velocityFromBounce: Vector3
    velocityFromBump: Vector3
    sinkSpeed: number
    buf: SmartBuffer = new SmartBuffer();
    // other data
    state: number = En_Bubble_State.STATE_WAIT

    sim: ActorSim;

    tick: number = 0
    cycleOffsetX: number = Math.random()
    cycleOffsetY: number = Math.random()
    cycleOffsetZ: number = Math.random()

    constructor(simu: ActorSim) {
        this.actionFunc = () => {};
        this.sim = simu;

        this.explosionCountdown = 0
        this.bounceCount = 0
        this.bounceDirection = new Vector3()
        this.velocityFromBounce = new Vector3()
        this.velocityFromBump = new Vector3()
        this.sinkSpeed = 0

        this.Init()
    }

    // rewrites of c functions

    Explosion() {
        let index = 0

        console.log("Explosion() -> countdown is " + this.explosionCountdown.toString())

        this.explosionCountdown = DECR(this.explosionCountdown)
        if (this.explosionCountdown != 0) {
            return -1
        }

        this.sim.flags &= ~0x1;
        return Rand_S16Offset(90, 60);
    }

    Vec3fNormalizedRelfect(vec1: Vector3, vec2: Vector3) {
        let ret: Vector3 = new Vector3()
        let norm: number = 0

        ret = Math3D.Vec3fReflect(vec1, vec2)
        ret = ret.normalized()

        return ret
    }

    Fly() {
        let sp60: Vector3 = new Vector3()
        let sp54: Vector3 = new Vector3()
        let bounceSpeed: number = 0
        let bounceCount: number = 0

        this.sinkSpeed -= 0.1
        if (this.sinkSpeed < this.sim.minVelocityY) {
            this.sinkSpeed = this.sim.minVelocityY
        }

        sp54.x = this.velocityFromBounce.x + this.velocityFromBump.x
        sp54.y = this.velocityFromBounce.y + this.velocityFromBump.y + this.sinkSpeed
        sp54.z = this.velocityFromBounce.z + this.velocityFromBump.z
        sp54 = sp54.normalized()

        if (sp54.y < 0.0) {
            sp60.x = sp60.z = 0.0
            sp60.y = 1.0

            sp54 = this.Vec3fNormalizedRelfect(sp54, sp60)
            this.bounceDirection = sp54
            bounceCount = this.bounceCount
            this.bounceCount = ++bounceCount

            if (bounceCount > Math.random() * 10.0) {
                this.bounceCount = 0
            }

            bounceSpeed = (this.bounceCount == 0) ? 3.6000001 : 3.0
            this.velocityFromBump.x = this.velocityFromBump.y = this.velocityFromBump.z = 0.0
            this.velocityFromBounce.x = (this.bounceDirection.x * bounceSpeed)
            this.velocityFromBounce.y = (this.bounceDirection.y * bounceSpeed)
            this.velocityFromBounce.z = (this.bounceDirection.z * bounceSpeed)
            this.sinkSpeed = 0.0
        }

        this.sim.vel.x = this.velocityFromBounce.x + this.velocityFromBump.x
        this.sim.vel.y = this.velocityFromBounce.y + this.velocityFromBump.y + this.sinkSpeed
        this.sim.vel.z = this.velocityFromBounce.z + this.velocityFromBump.z

        let refX = [this.velocityFromBump.x]
        let refY = [this.velocityFromBump.y]
        let refZ = [this.velocityFromBump.z]
        Math_ApproachF(refX, 0.0, 0.3, 0.1)
        Math_ApproachF(refY, 0.0, 0.3, 0.1)
        Math_ApproachF(refZ, 0.0, 0.3, 0.1)
    }

    Init() {
        this.bounceDirection.x = Math.random()
        this.bounceDirection.y = Math.random()
        this.bounceDirection.z = Math.random()
        this.bounceDirection = this.bounceDirection.normalized()
        this.velocityFromBounce = this.bounceDirection.multiplyN(3)

        this.state = En_Bubble_State.STATE_WAIT
        this.actionFunc = this.Wait
    }

    Wait() {
        // TODO: if any client says "pop"
        this.Fly()
    }

    Pop() {
        if (this.Explosion() >= 0) {
            this.state = En_Bubble_State.STATE_REALLYDEAD
            console.log("Bubble is _really_ dead")
            let packet = this.generatePacket();
            MLRefHolder.ModLoader.privateBus.emit(OOTO_PRIVATE_EVENTS.SEND_TO_SCENE, new SendToScene(packet, this.sim.scene));
        }
    }

    func_8002D7EC() {
        let speedRate: number = 3 * 0.5

        this.sim.pos.x += (this.sim.vel.x * speedRate) //+ this.colChkInfo.displacement.x;
        this.sim.pos.y += (this.sim.vel.y * speedRate) //+ this.colChkInfo.displacement.y;
        this.sim.pos.z += (this.sim.vel.z * speedRate) //+ this.colChkInfo.displacement.z;
    }

    // interface impls
    generatePacket(): Z64O_WorldActorSyncPacket {
        // Server side shit.
        
        /*
        const BUBBLE_PACK: any = {
            0x004: 0x0, // flags (u32)
            0x024: 0xC, // pos (vec3f)
            0x030: 0x6, // rot (vec3s)
            0x05C: 0xC, // vel (vec3f)
            0x70: 0x4, // min vel y (float)
            0x1DE: 0x2, // explosion counter (u16)
            0x1F0: 0x4  // state (u32)
        }
        */

        this.buf.writeUInt32BE(this.sim.flags);
        this.buf.writeBuffer(Vec3ftoBuffer(this.sim.pos));
        this.buf.writeBuffer(Vec3stoBuffer(this.sim.rot));
        this.buf.writeBuffer(Vec3ftoBuffer(this.sim.vel));
        this.buf.writeFloatBE(this.sim.minVelocityY);
        this.buf.writeUInt16BE(this.explosionCountdown);
        this.buf.writeUInt32BE(this.state);

        let p = new Z64O_WorldActorSyncPacket(this.sim.world, this.sim.scene, this.sim.room, this.sim.uuid, this.sim.state, this.buf.toBuffer(), this.sim.lobby);
        this.buf.clear();
        return p;
    }

    processPacketClient(ModLoader: IModLoaderAPI, sim: ActorSim, packet: Z64O_WorldActorSyncPacket): void {
        // Client side shit.
        
        if (packet.state !== undefined) sim.actor.rdramWrite32(0x1F0, packet.state)
        this.buf.clear();
        if (packet.struct === undefined) return;
        this.buf.writeBuffer(packet.struct);
        Object.keys(BUBBLE_PACK).forEach((key: string)=>{
            let offset: number = parseInt(key);
            let size: number = BUBBLE_PACK[key];
            let data: Buffer = this.buf.readBuffer(size);
            sim.actor.rdramWriteBuffer(offset, data);
        });
    }

    processPacketServer(ModLoader: IModLoaderAPI, sim: ActorSim, packet: Z64O_WorldActorSyncPacket): void {
        if (packet.state == En_Bubble_State.STATE_POP) {
            this.explosionCountdown = 6
            this.state = En_Bubble_State.STATE_POP
            this.actionFunc = this.Pop
            console.log("Bubble state is now pop")

            // send packet with updated info
            packet = this.generatePacket();
            ModLoader.privateBus.emit(OOTO_PRIVATE_EVENTS.SEND_TO_SCENE, new SendToScene(packet, this.sim.scene));
        }
    }

    onTickServer(ModLoader: IModLoaderAPI, players: Array<string>): void {

        let storage: OotOnlineStorage = ModLoader.lobbyManager.getLobbyStorage(this.sim.lobby, MLRefHolder.parent) as OotOnlineStorage;
        if (storage === null) {
           return;
        }

        this.func_8002D7EC();
        this.actionFunc();
        //this.sim.pos = new Vector3(-28 + (Math.sin(this.tick * 0.05) * 60), -257 + (Math.cos(this.tick * 0.05) * 60), -900 + (Math.cos(this.tick * 0.05) * 60))

        let playerPos: Vector3 = new Vector3()
        let closestDir = new Vector3()
        let closestDist = -1
        let closestUUID = ""

        for (let index = 0; index < players.length; index++) {
            let dir: Vector3;
            let dist = 0;
            let uuid = players[index]
            let puppet = storage.playerPuppets.get(uuid)!;

            playerPos.x = puppet.pos.x
            playerPos.y = puppet.pos.y
            playerPos.z = puppet.pos.z

            dir = playerPos.minus(this.sim.pos);
            dist = Math.abs(dir.magnitude());

            if (dist < closestDist || closestDist == -1) {
                closestDist = dist;
                closestUUID = uuid;
                closestDir = dir.normalized();
            }
        }

        if (closestDist !== -1) {
            // move towards player with lissajous deviation, which itself has each axis randomly offset
            this.sim.vel = closestDir.multiplyN(50 * 0.05).plus(new Vector3(Math.cos(this.tick * 0.05 + this.cycleOffsetX) * 5 * 0.05, Math.cos(this.tick * 0.05 + this.cycleOffsetY) * 5 * 0.05, Math.sin(this.tick * 0.05 + this.cycleOffsetZ) * 5 * 0.05));
        }

        let packet = this.generatePacket();
        ModLoader.privateBus.emit(OOTO_PRIVATE_EVENTS.SEND_TO_SCENE, new SendToScene(packet, this.sim.scene));

        this.tick++
    }

    onTickClient(ModLoader: IModLoaderAPI): void {
        if (this.sim.actor.rdramRead32(0x1F8) == En_Bubble_ClientMessage.POP) {
            this.sim.actor.rdramWrite32(0x1F8, 0)

            // tell server that I popped
            let packet: Z64O_WorldActorSyncPacket = new Z64O_WorldActorSyncPacket(this.sim.world, this.sim.scene, this.sim.room, this.sim.uuid, En_Bubble_State.STATE_POP, undefined, this.sim.lobby)
            ModLoader.clientSide.sendPacket(packet);
        }
    }
}

export class ActorSim {
    world: number;
    scene: number;
    room: number;
    lobby: string;
    //
    actorID: number;
    pos: Vector3;
    rot: Vector3;
    vel: Vector3 = new Vector3(0, 0, 0);
    minVelocityY: number = -20.0;
    flags: number = 1;
    variable: number;
    uuid: string;
    parent: string | undefined;
    state: number = 0;
    //
    sim!: IActorSimImpl;
    actor!: IActor;

    constructor(world: number, scene: number, room: number, lobby:string, actorID: number, pos: Vector3, rot: Vector3, variable: number, uuid: string) {
        this.actorID = actorID;
        this.pos = pos;
        this.rot = rot;
        this.variable = variable;
        this.uuid = uuid;
        this.world = world;
        this.scene = scene;
        this.room = room;
        this.lobby = lobby;
    }
}