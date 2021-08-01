import { parentPort } from "worker_threads";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import Vector3 from "modloader64_api/math/Vector3";
import { eGenericActorOffsets, IActorSim, IActorSimImplClient, IActorSimImplServer, IGenericActor } from "../../ActorSim";
import { Z64O_WorldActorPossessedPacket, Z64O_WorldActorPossessedUpdatePacket, Z64O_WorldActorSyncPacket } from "../../WorldPackets";
import { ActorList } from "../../WorldThread";
import { Halloween_Playload_Server } from "./Halloween_Payload";
import { IActor } from "modloader64_api/OOT/IActor";

enum Halloween_Invader_ClientMessage {
    NONE,
    DIE
};

enum Halloween_Invader_State {
    STATE_SPAWNING,
    STATE_INVADING,
    STATE_STEALING,
    STATE_FLEEING,
    STATE_FLED,
    STATE_DEAD,
    STATE_REALLYDEAD
};

export interface IHalloween_Invader extends IGenericActor {
}

export class Halloween_Invader implements IHalloween_Invader {
    actorID!: number;
    flags!: number;
    minVelocityY!: number;
    state: number = Halloween_Invader_State.STATE_SPAWNING;
}

export class Halloween_Invader_Client implements IActorSimImplClient {
    data: Halloween_Invader = new Halloween_Invader()
    pos: Vector3 = new Vector3()
    rot: Vector3 = new Vector3()
    vel: Vector3 = new Vector3()
    possessed: number = 0

    sim: IActorSim
    actor: IActor

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
            console.log("State changed to " + Halloween_Invader_State[this.data.state])
        }
    }

    processZ64O_WorldActorPossessedPacket(ModLoader: IModLoaderAPI, packet: Z64O_WorldActorPossessedPacket): void {
        if (packet.possessed == 0) {
            this.possessed = 0;
            this.actor.rdramWrite8(eGenericActorOffsets.possesed, 0)
        }
    }

    onTickClient(ModLoader: IModLoaderAPI): void {
        if (this.actor.rdramRead8(eGenericActorOffsets.clientMessage) == Halloween_Invader_ClientMessage.DIE) {
            this.actor.rdramWrite8(eGenericActorOffsets.clientMessage, 0);

            if (this.data.state >= Halloween_Invader_State.STATE_INVADING && this.data.state < Halloween_Invader_State.STATE_FLED) {

            }
        }
    }
}

export class Halloween_Invader_Server implements IActorSimImplServer {
    data: Halloween_Invader = new Halloween_Invader()
    pos: Vector3 = new Vector3()
    rot: Vector3 = new Vector3()
    vel: Vector3 = new Vector3()
    vel_unscaled: Vector3 = new Vector3()
    possesed: number = 0;
    possesedBy: string = ""
    rescaleVel: boolean = false
    serverActorName: string = "Halloween_Invader"

    // server only data
    sim: IActorSim
    initialPos: Vector3 = new Vector3()
    targetPos: Vector3 = new Vector3()
    speed: number = 50
    owchieCounter: number = 0;
    stealCounter: number = 0;

    // member variables

    constructor(sim: IActorSim) {
        this.sim = sim
    }

    // generic server functions
    generatePacket(): Z64O_WorldActorSyncPacket {
        return new Z64O_WorldActorSyncPacket(this.sim.world, this.sim.scene, this.sim.room, this.sim.uuid, this.sim.lobby, this.pos, this.rot, this.vel_unscaled, this.data);
    }

    processZ64O_WorldActorSyncPacket(packet: Z64O_WorldActorSyncPacket): void {
        if (packet.struct.state !== undefined && packet.struct.state == Halloween_Invader_State.STATE_DEAD) {
            this.owchieCounter = 0.5
            console.log("im dying oh nooooo")

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
        if (this.possesed && packet.player.uuid === this.possesedBy) {

        }
    }

    onTickServer(tickTime: number, playerList: Array<string>, actorList: ActorList): void {
        let index: number = 0;

        this.pos = this.pos.plus(this.vel);
        this.vel_unscaled = this.vel.multiplyN(0.05 / tickTime)

        if (this.data.state === Halloween_Invader_State.STATE_SPAWNING && this.targetPos === new Vector3()) {
            let potentialTargets: Vector3[] = []

            for (index = 0; index < actorList.actors.length; index++) {
                if ((actorList.actors[index].sim as IActorSimImplServer).serverActorName === "Halloween_Playload") {
                    potentialTargets.push(actorList.actors[index].sim.pos)
                }
            }

            if (potentialTargets.length > 0) {
                let targetIndex = Math.round(Math.random() * (potentialTargets.length - 1))
                this.targetPos = potentialTargets[targetIndex];
            }
            else {
                this.targetPos = new Vector3(0, 16384, 0);
            }

            this.initialPos = this.pos;
        }
        else if (this.data.state === Halloween_Invader_State.STATE_INVADING) {
            // TODO: potentially fight back if players are close enough
            this.vel = this.targetPos.minus(this.pos).normalized().multiplyN(this.speed * tickTime);

            for (index = 0; index < actorList.actors.length; index++) {
                if ((actorList.actors[index].sim as IActorSimImplServer).serverActorName === "Halloween_Playload") {
                    if ((actorList.actors[index].sim as Halloween_Playload_Server).CheckInRadius(this.pos)) {
                        this.data.state = Halloween_Invader_State.STATE_STEALING;
                        this.stealCounter =  1.5 + (Math.random() * 2.5)
                    }
                }
            }
        }
        else if (this.data.state === Halloween_Invader_State.STATE_STEALING) {
            this.stealCounter -= tickTime

            if (this.stealCounter <= 0) {
                this.data.state = Halloween_Invader_State.STATE_FLEEING
            }
        }
        else if (this.data.state === Halloween_Invader_State.STATE_FLEEING) {
            this.vel = this.initialPos.minus(this.pos).normalized().multiplyN(this.speed * tickTime);

            if (this.pos.minus(this.initialPos).magnitude() <= 50) {
                this.data.state = Halloween_Invader_State.STATE_FLED
            }
        }

        if (this.data.state === Halloween_Invader_State.STATE_DEAD) {
            this.owchieCounter -= tickTime

            if (this.owchieCounter <= 0) {
                this.data.state = Halloween_Invader_State.STATE_REALLYDEAD
                this.pos = new Vector3(0, -16384, 0)
                // die but for real this time
            }
        }

        parentPort!.postMessage({id: "TO_SCENE", data: {packet: JSON.stringify(this.generatePacket()), scene: this.sim.scene}});
    }
}