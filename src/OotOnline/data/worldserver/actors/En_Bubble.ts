import { parentPort } from "worker_threads";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import Vector3 from "modloader64_api/math/Vector3";
import { ActorSim, eGenericActorOffsets, IActorSim, IActorSimImplClient, IActorSimImplServer, IGenericActor } from "../ActorSim";
import { DECR } from "../transliteration/Macros";
import { Rand_S16Offset, Math_ApproachF } from "../transliteration/Math";
import { Math3D } from "../transliteration/Math3D";
import { Z64O_WorldActorPossessedPacket, Z64O_WorldActorPossessedUpdatePacket, Z64O_WorldActorSyncPacket } from "../WorldPackets";
import { IActor } from "modloader64_api/OOT/IActor";
import { ActorList } from "../WorldThread";

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

export interface IEn_Bubble extends IGenericActor {
    explosionCountdown: number
}

export class En_Bubble implements IEn_Bubble {
    actorID: number = 0;
    flags: number = 1;
    minVelocityY: number = -20;
    explosionCountdown: number = 0
    state: number = En_Bubble_State.STATE_WAIT;
}

export class En_Bubble_Client implements IActorSimImplClient {
    data: En_Bubble = new En_Bubble()
    pos: Vector3 = new Vector3(0, 0, 0)
    rot: Vector3 = new Vector3(0, 0, 0)
    vel: Vector3 = new Vector3(0, 0, 0)
    possessed: number = 0;

    sim: IActorSim
    actor: IActor
    tick: number = 0

    constructor(sim: IActorSim, actor: IActor) {
        this.sim = sim
        this.actor = actor
    }

    processZ64O_WorldActorSyncPacket(ModLoader: IModLoaderAPI, packet: Z64O_WorldActorSyncPacket): void {
        let keys = Object.keys(packet.struct);
        let index: number = 0

        let old = this.data.state

        for (index = 0; index < keys.length; index++) {
            this.data[keys[index]] = packet.struct[keys[index]]
        }

        if (!this.possessed) {
            this.pos.x = packet.pos.x
            this.pos.y = packet.pos.y
            this.pos.z = packet.pos.z
            this.rot.x = packet.rot.x
            this.rot.y = packet.rot.y
            this.rot.z = packet.rot.z
            this.vel.x = packet.vel.x
            this.vel.y = packet.vel.y
            this.vel.z = packet.vel.z
        }

        if (this.data.state !== old) {
            console.log("State changed to " + En_Bubble_State[this.data.state])
        }
    }

    processZ64O_WorldActorPossessedPacket(ModLoader: IModLoaderAPI, packet: Z64O_WorldActorPossessedPacket): void {
        if (packet.possessed == 0) {
            this.possessed = 0;
            this.actor.rdramWrite8(eGenericActorOffsets.possesed, 0)
        }
    }

    onTickClient(ModLoader: IModLoaderAPI): void {
        if (this.actor.rdramRead8(eGenericActorOffsets.clientMessage) == En_Bubble_ClientMessage.POP) {
            this.actor.rdramWrite8(eGenericActorOffsets.clientMessage, 0);

            // tell server that I popped
            this.data.state = En_Bubble_State.STATE_POP;
            let packet: Z64O_WorldActorSyncPacket = new Z64O_WorldActorSyncPacket(this.sim.world, this.sim.scene, this.sim.room, this.sim.uuid, this.sim.lobby, this.pos, this.rot, this.vel, this.data);
            ModLoader.clientSide.sendPacket(packet);
            console.log("I POPPED")
        }

        let possessed = this.actor.rdramRead8(eGenericActorOffsets.possesed)
        if (possessed !== this.possessed) {
            let packet: Z64O_WorldActorPossessedPacket = new Z64O_WorldActorPossessedPacket(this.sim.world, this.sim.scene, this.sim.room, this.sim.uuid, this.sim.lobby, possessed);
            this.possessed = possessed;
            ModLoader.clientSide.sendPacket(packet);
        }

        if (possessed && this.data.state < En_Bubble_State.STATE_POP) {
            this.pos.x = this.actor.rdramReadF32(eGenericActorOffsets.world);
            this.pos.y = this.actor.rdramReadF32(eGenericActorOffsets.world + 4);
            this.pos.z = this.actor.rdramReadF32(eGenericActorOffsets.world + 8);
            this.rot.x = this.actor.rdramRead16(eGenericActorOffsets.world + 0x10);
            this.rot.y = this.actor.rdramRead16(eGenericActorOffsets.world + 0x12);
            this.rot.z = this.actor.rdramRead16(eGenericActorOffsets.world + 0x14);
            this.vel.x = this.actor.rdramReadF32(eGenericActorOffsets.velocity);
            this.vel.y = this.actor.rdramReadF32(eGenericActorOffsets.velocity + 4);
            this.vel.z = this.actor.rdramReadF32(eGenericActorOffsets.velocity + 8);

            //console.log("pos: " + this.pos)
            //console.log("rot: " + this.rot)
            //console.log("vel: " + this.vel)

            let packet: Z64O_WorldActorPossessedUpdatePacket = new Z64O_WorldActorPossessedUpdatePacket(this.sim.world, this.sim.scene, this.sim.room, this.sim.uuid, this.sim.lobby, this.pos, this.rot, this.vel, this.data);
            ModLoader.clientSide.sendPacket(packet);
        }
        else {
            //this.actor.rdramWrite32(4, this.data.flags);
            this.actor.rdramWriteF32(eGenericActorOffsets.world, this.pos.x);
            this.actor.rdramWriteF32(eGenericActorOffsets.world + 4, this.pos.y);
            this.actor.rdramWriteF32(eGenericActorOffsets.world + 8, this.pos.z);
            this.actor.rdramWrite16(eGenericActorOffsets.world + 0x10, this.rot.x);
            this.actor.rdramWrite16(eGenericActorOffsets.world + 0x12, this.rot.y);
            this.actor.rdramWrite16(eGenericActorOffsets.world + 0x14, this.rot.z);
            this.actor.rdramWriteF32(eGenericActorOffsets.velocity, this.vel.x);
            this.actor.rdramWriteF32(eGenericActorOffsets.velocity + 4, this.vel.y);
            this.actor.rdramWriteF32(eGenericActorOffsets.velocity + 8, this.vel.z);
            this.actor.rdramWriteF32(eGenericActorOffsets.minVelocityY, this.data.minVelocityY);
            this.actor.rdramWrite16(0x1E2, this.data.explosionCountdown);
            this.actor.rdramWrite8(eGenericActorOffsets.serverState, this.data.state);
        }
    }
}

export class En_Bubble_Server implements IActorSimImplServer {
    data: En_Bubble = new En_Bubble()
    pos: Vector3 = new Vector3(0, 0, 0)
    rot: Vector3 = new Vector3(0, 0, 0)
    vel: Vector3 = new Vector3(0, 0, 0)
    vel_unscaled: Vector3 = new Vector3()
    possesed: number = 0;
    possesedBy: string = "";
    serverActorName: string = "En_Bubble"
    rescaleVel: boolean = false;

    // server only data
    sim: IActorSim
    actionFunc: Function = () => {}
    bounceCount: number = 0
    bounceDirection: Vector3 = new Vector3()
    velocityFromBounce: Vector3 = new Vector3()
    velocityFromBump: Vector3 = new Vector3()
    sinkSpeed: number = 0

    // member variables
    tick: number = 0

    cycleOffsetX: number = (Math.random() * 20)
    cycleOffsetY: number = (Math.random() * 30)
    cycleOffsetZ: number = (Math.random() * 20)

    constructor(sim: IActorSim) {
        this.sim = sim
    }

    // rewrites of c functions
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

        this.sinkSpeed -= 0.1
        if (this.sinkSpeed < this.data.minVelocityY) {
            this.sinkSpeed = this.data.minVelocityY
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
            this.bounceCount++

            if (this.bounceCount > Math.random() * 10.0) {
                this.bounceCount = 0
            }

            bounceSpeed = (this.bounceCount == 0) ? 3.6000001 : 3.0
            this.velocityFromBump.x = this.velocityFromBump.y = this.velocityFromBump.z = 0.0
            this.velocityFromBounce.x = (this.bounceDirection.x * bounceSpeed)
            this.velocityFromBounce.y = (this.bounceDirection.y * bounceSpeed)
            this.velocityFromBounce.z = (this.bounceDirection.z * bounceSpeed)
            this.sinkSpeed = 0.0
        }

        this.vel.x = this.velocityFromBounce.x + this.velocityFromBump.x
        this.vel.y = this.velocityFromBounce.y + this.velocityFromBump.y + this.sinkSpeed
        this.vel.z = this.velocityFromBounce.z + this.velocityFromBump.z

        let refX = [this.velocityFromBump.x]
        let refY = [this.velocityFromBump.y]
        let refZ = [this.velocityFromBump.z]
        Math_ApproachF(refX, 0.0, 0.3, 0.1)
        Math_ApproachF(refY, 0.0, 0.3, 0.1)
        Math_ApproachF(refZ, 0.0, 0.3, 0.1)
        this.velocityFromBounce.x = refX[0]
        this.velocityFromBounce.y = refY[0]
        this.velocityFromBounce.z = refZ[0]
    }

    Init() {
        this.bounceDirection.x = Math.random()
        this.bounceDirection.y = Math.random()
        this.bounceDirection.z = Math.random()
        this.bounceDirection = this.bounceDirection.normalized()
        this.velocityFromBounce = this.bounceDirection.multiplyN(3)

        this.data.state = En_Bubble_State.STATE_WAIT
        this.data.flags = 1
        this.actionFunc = this.Wait
    }

    // action funcs
    Wait() {
        if (!this.possesed) {
            this.Fly()
        }
    }

    Pop() {
        this.data.explosionCountdown--;
        if (this.data.explosionCountdown >= 0) {
            this.data.state = En_Bubble_State.STATE_REALLYDEAD
            this.actionFunc = this.Dead
            let packet = this.generatePacket();
            parentPort!.postMessage({id: "TO_SCENE", data: {packet: JSON.stringify(packet), scene: this.sim.scene}});
        }
    }

    Dead() {
    }

    func_8002D7EC() {
        let speedRate: number = 3 * 0.5

        this.pos.x += (this.vel.x * speedRate) //+ this.colChkInfo.displacement.x;
        this.pos.y += (this.vel.y * speedRate) //+ this.colChkInfo.displacement.y;
        this.pos.z += (this.vel.z * speedRate) //+ this.colChkInfo.displacement.z;
    }

    // interface impls
    generatePacket(): Z64O_WorldActorSyncPacket {
        return new Z64O_WorldActorSyncPacket(this.sim.world, this.sim.scene, this.sim.room, this.sim.uuid, this.sim.lobby, this.pos, this.rot, this.vel, this.data);
    }

    processZ64O_WorldActorSyncPacket(packet: Z64O_WorldActorSyncPacket): void {
        if (packet.struct.state !== undefined && packet.struct.state == En_Bubble_State.STATE_POP) {
            this.data.explosionCountdown = 6
            this.data.state = En_Bubble_State.STATE_POP
            this.actionFunc = this.Pop
            console.log("is pop")

            // send packet with updated info
            packet = this.generatePacket();
            parentPort!.postMessage({id: "TO_SCENE", data: {packet: JSON.stringify(packet), scene: this.sim.scene}});
        }
    }

    processZ64O_WorldActorPossessedPacket(packet: Z64O_WorldActorPossessedPacket): void {
        if (packet.possessed) {
            if (this.possesed) {
                packet.possessed = 0;
                parentPort!.postMessage({id: "TO_PLAYER", data: {packet: JSON.stringify(packet), player: packet.player}});
            }
            else {
                this.possesed = packet.possessed;
                this.possesedBy = packet.player.uuid;
            }
        }
        else {
            if (this.possesed) {
                if (packet.player.uuid === this.possesedBy) {
                    this.possesed = packet.possessed;
                    this.possesedBy = "";
                }
                else {
                    packet.possessed = 0;
                    parentPort!.postMessage({id: "TO_PLAYER", data: {packet: JSON.stringify(packet), player: packet.player}});
                }
            }
        }
    }

    processZ64O_WorldActorPossessedUpdatePacket(packet: Z64O_WorldActorPossessedUpdatePacket): void {
        if (this.possesed && packet.player.uuid === this.possesedBy && this.data.state < En_Bubble_State.STATE_POP) {
            this.pos.x = packet.pos.x;
            this.pos.y = packet.pos.y;
            this.pos.z = packet.pos.z;
            this.rot.x = packet.rot.x;
            this.rot.y = packet.rot.y;
            this.rot.z = packet.rot.z;
            this.vel_unscaled.x = packet.vel.x;
            this.vel_unscaled.y = packet.vel.y;
            this.vel_unscaled.z = packet.vel.z;
            this.rescaleVel = true;
        }
    }

    onTickServer(tickTime: number, players: Array<string>, actorList: ActorList): void {
        this.func_8002D7EC();

        if (this.data.state >= En_Bubble_State.STATE_POP) {
            this.pos.y = -16384
        }

        if (this.possesed) {
            if (this.rescaleVel) {
                this.vel = this.vel_unscaled.divideN(0.05 / tickTime)
            }
        }
        else {
            this.actionFunc(this.sim);

            // fun curve
            let F = Math.PI / 2
            let G = Math.PI * 2
            this.vel.x = Math.sin(3 * (tickTime * (this.cycleOffsetX + (this.tick * 0.75))) + F) * (40 * tickTime)
            this.vel.y = Math.cos(5 * (tickTime * (this.cycleOffsetY + (this.tick * 0.3))) + G) * (30 * tickTime)
            this.vel.z = Math.cos(7 * (tickTime * (this.cycleOffsetZ + (this.tick * 0.5)))) * (40 * tickTime)
        }

        this.vel_unscaled = this.vel.multiplyN(0.05 / tickTime)

        parentPort!.postMessage({id: "TO_SCENE", data: {packet: JSON.stringify(this.generatePacket()), scene: this.sim.scene}});
        this.tick++
    }
}

