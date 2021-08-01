import { parentPort } from "worker_threads";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import Vector3 from "modloader64_api/math/Vector3";
import { IActorSim, IActorSimImplClient, IActorSimImplServer, IGenericActor } from "../../ActorSim";
import { Z64O_WorldActorPossessedPacket, Z64O_WorldActorPossessedUpdatePacket, Z64O_WorldActorSyncPacket } from "../../WorldPackets";
import { ActorList } from "../../WorldThread";

enum Halloween_Playload_ClientMessage {
    NONE,
};

enum Halloween_Playload_State {
    STATE_NONE
};

export interface IHalloween_Playload extends IGenericActor {
}

export class Halloween_Playload implements IHalloween_Playload {
    actorID!: number;
    flags!: number;
    minVelocityY!: number;
    state: number = Halloween_Playload_State.STATE_NONE;
}

export class Halloween_Playload_Client implements IActorSimImplClient {
    data: Halloween_Playload = new Halloween_Playload()
    pos: Vector3 = new Vector3()
    rot: Vector3 = new Vector3()
    vel: Vector3 = new Vector3()

    processZ64O_WorldActorSyncPacket(ModLoader: IModLoaderAPI, packet: Z64O_WorldActorSyncPacket): void {

    }

    processZ64O_WorldActorPossessedPacket(ModLoader: IModLoaderAPI, packet: Z64O_WorldActorPossessedPacket): void {

    }

    onTickClient(ModLoader: IModLoaderAPI): void {

    }
}

export class Halloween_Playload_Server implements IActorSimImplServer {
    data: Halloween_Playload = new Halloween_Playload()
    pos: Vector3 = new Vector3()
    rot: Vector3 = new Vector3()
    vel: Vector3 = new Vector3()
    possesed: number = 0;
    possesedBy: string = ""
    serverActorName: string = "Halloween_Playload"

    // server only data
    sim: IActorSim
    radius: number = 50

    constructor(sim: IActorSim) {
        this.sim = sim
    }

    // generic server functions
    generatePacket(sim: IActorSim): Z64O_WorldActorSyncPacket {
        return new Z64O_WorldActorSyncPacket(this.sim.world, this.sim.scene, this.sim.room, this.sim.uuid, this.sim.lobby, this.pos, this.rot, this.vel, this.data);
    }

    processZ64O_WorldActorSyncPacket(packet: Z64O_WorldActorSyncPacket): void {

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

    }

    // member functions
    CheckInRadius(rhs: Vector3): boolean {
        if (rhs.minus(this.pos).magnitude() <= this.radius) return true;
        return false;
    }
}