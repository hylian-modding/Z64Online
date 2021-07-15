import { parentPort } from "worker_threads";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import Vector3 from "modloader64_api/math/Vector3";
import { ActorSim, IActorSim, IActorSimImplClient, IActorSimImplServer, IGenericActor } from "../ActorSim";
import { DECR } from "../transliteration/Macros";
import { Rand_S16Offset, Math_ApproachF } from "../transliteration/Math";
import { Math3D } from "../transliteration/Math3D";
import { Z64O_WorldActorSyncPacket } from "../WorldPackets";
import { IActor } from "modloader64_api/OOT/IActor";
import { number_ref } from "../../../../../../../ModLoader64/API/build/Sylvain/ImGui";

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
    pos: Vector3 = new Vector3()
    rot: Vector3 = new Vector3()
    vel: Vector3 = new Vector3()

    sim: IActorSim
    actor: IActor
    tick: number = 0

    constructor(sim: IActorSim, actor: IActor) {
        this.sim = sim
        this.actor = actor
    }

    processPacketClient(ModLoader: IModLoaderAPI, packet: Z64O_WorldActorSyncPacket): void {
        let keys = Object.keys(packet.struct);
        let index: number = 0

        for (index = 0; index < keys.length; index++) {
            this.data[keys[index]] = packet.struct[keys[index]]
        }

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

    onTickClient(ModLoader: IModLoaderAPI): void {
        //this.actor.rdramWrite32(4, this.data.flags)
        this.actor.rdramWriteF32(0x24, this.pos.x)
        this.actor.rdramWriteF32(0x28, this.pos.y)
        this.actor.rdramWriteF32(0x2C, this.pos.z)
        this.actor.rdramWrite16(0x30, this.rot.x)
        this.actor.rdramWrite16(0x32, this.rot.y)
        this.actor.rdramWrite16(0x34, this.rot.z)
        this.actor.rdramWriteF32(0x5C, this.vel.x)
        this.actor.rdramWriteF32(0x60, this.vel.y)
        this.actor.rdramWriteF32(0x64, this.vel.z)
        this.actor.rdramWriteF32(0x70, this.data.minVelocityY)
        this.actor.rdramWrite16(0x1DE, this.data.explosionCountdown)
        this.actor.rdramWrite32(0x1F0, this.data.state)

        if (this.actor.rdramRead32(0x1F8) == En_Bubble_ClientMessage.POP) {
            this.actor.rdramWrite32(0x1F8, 0);

            // tell server that I popped
            this.data.state = En_Bubble_State.STATE_POP;
            let packet: Z64O_WorldActorSyncPacket = new Z64O_WorldActorSyncPacket(this.sim.world, this.sim.scene, this.sim.room, this.sim.uuid, this.sim.lobby, this.pos, this.rot, this.vel, this.data);
            ModLoader.clientSide.sendPacket(packet);
        }
    }
}

export class En_Bubble_Server implements IActorSimImplServer {
    data: En_Bubble = new En_Bubble()
    pos: Vector3 = new Vector3()
    rot: Vector3 = new Vector3()
    vel: Vector3 = new Vector3()

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
    Explosion() {
        this.data.explosionCountdown = DECR(this.data.explosionCountdown)
        if (this.data.explosionCountdown != 0) {
            return -1
        }

        this.data.flags &= ~0x1;
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
        this.Fly()
    }

    Pop() {
        if (this.Explosion() >= 0) {
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

    processPacketServer(packet: Z64O_WorldActorSyncPacket): void {
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

    onTickServer(tickTime: number, players: Array<string>): void {
        this.func_8002D7EC();
        this.actionFunc(this.sim);

        // fun curve
        let F = Math.PI / 2
        let G = Math.PI * 2
        this.vel.x = Math.sin(3 * (tickTime * (this.cycleOffsetX + (this.tick * 0.75))) + F) * (40 * tickTime)
        this.vel.y = Math.cos(5 * (tickTime * (this.cycleOffsetY + (this.tick * 0.3))) + G) * (30 * tickTime)
        this.vel.z = Math.cos(7 * (tickTime * (this.cycleOffsetZ + (this.tick * 0.5)))) * (40 * tickTime)

        parentPort!.postMessage({id: "TO_SCENE", data: {packet: JSON.stringify(this.generatePacket()), scene: this.sim.scene}});
        this.tick++
    }
}

