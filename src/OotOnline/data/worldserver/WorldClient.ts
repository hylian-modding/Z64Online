import { NetworkHandler } from "modloader64_api/NetworkHandler";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { Z64O_WorldActorSpawnPacket, Z64O_WorldActorSyncPacket } from "./WorldPackets";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { IOOTCore, OotEvents } from "modloader64_api/OOT/OOTAPI";
import { InjectCore } from "modloader64_api/CoreInjection";
import { IActor } from "modloader64_api/OOT/IActor";
import { EventHandler } from "modloader64_api/EventHandler";
import { Scene } from "@OotOnline/common/types/Types";
import { ActorSim, IActorSim, IActorSimImplClient } from "./ActorSim";
import { onTick, Preinit } from "modloader64_api/PluginLifecycle";
import { En_Bubble_Client } from "./actors/En_Bubble";

export class ActorSimRegClient{
    static map: Map<number, new (simu: IActorSim, actor: IActor) => IActorSimImplClient> = new Map();
}

export class WorldClient {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;
    actors: Map<string, ActorSim> = new Map();

    @Preinit()
    preinit() {
        ActorSimRegClient.map.set(0x2D, En_Bubble_Client);
    }

    @NetworkHandler('Z64O_WorldActorSpawnPacket')
    onRoomSpawn(packet: Z64O_WorldActorSpawnPacket) {
        for (let i = 0; i < packet.actors.length; i++) {
            this.core.commandBuffer.spawnActor(packet.actors[i].actorID, packet.actors[i].variable, packet.actors[i].rot, packet.actors[i].pos).then((actor: IActor) => {
                this.ModLoader.math.rdramWriteV3i16(actor.pointer + 0xB4, packet.actors[i].rot);
                let sim = new ActorSim(packet.world, packet.scene, packet.room, packet.lobby, actor.actorID, packet.actors[i].uuid);
                sim.actor = actor;

                if (ActorSimRegClient.map.has(actor.actorID)){
                    let c = ActorSimRegClient.map.get(actor.actorID)!;
                    sim.sim = new c(sim, actor);
                    sim.sim.pos = actor.position.getVec3()
                    sim.sim.rot = actor.rotation.getVec3()
                }
                this.actors.set(packet.actors[i].uuid, sim);
                this.ModLoader.logger.debug(`Server spawns actor with uuid ${sim.uuid}`);
            });
        }
    }

    @NetworkHandler('Z64O_WorldActorSyncPacket')
    onUpdate(packet: Z64O_WorldActorSyncPacket) {
        if (this.actors.has(packet.uuid)) {
            if (this.actors.get(packet.uuid)!.sim !== undefined) {
                (this.actors.get(packet.uuid)!.sim as IActorSimImplClient).processPacketClient(this.ModLoader, packet);
            }
        }
    }

    @EventHandler(OotEvents.ON_SCENE_CHANGE)
    onSceneChange(scene: Scene){
        this.actors.clear();
    }

    @EventHandler(OotEvents.ON_ROOM_CHANGE_PRE)
    onRoomChange(room: number){
        this.actors.clear();
    }

    @onTick()
    onTick() {
        this.actors.forEach((actor: ActorSim)=>{
            if (actor.sim === undefined) return;
            (actor.sim as IActorSimImplClient).onTickClient(this.ModLoader);
        });
    }
}