import { InjectCore } from "modloader64_api/CoreInjection";
import { EventHandler } from "modloader64_api/EventHandler";
import { IModLoaderAPI, ModLoaderEvents } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { IActor } from "modloader64_api/OOT/IActor";
import { IOOTCore, OotEvents } from "modloader64_api/OOT/OOTAPI";
import { onTick } from "modloader64_api/PluginLifecycle";
import { OOTO_PRIVATE_EVENTS } from "../InternalAPI";

export default class AntiGanonCrash {

    @InjectCore()
    core!: IOOTCore;
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    ganon: IActor | undefined;
    ganonUUID: string = "";
    ganonHP: number = 0;
    stage: number = 0;

    @EventHandler(OotEvents.ON_ACTOR_SPAWN)
    onActorSpawned(actor: IActor) {
        if (actor.actorID === 0x17A) {
            // Ganon is spawned.
            this.ganonHP = 30;
            this.ganon = actor;
            this.ganonUUID = this.ganon.actorUUID;
            this.ModLoader.privateBus.emit(OOTO_PRIVATE_EVENTS.FORBID_PUPPETS, true);
            this.stage++;
        }
    }

    @EventHandler(OotEvents.ON_ACTOR_DESPAWN)
    onActorDespawn(actor: IActor) {
        if (actor.actorUUID === this.ganonUUID) {
            this.resetModule();
        }
    }

    @onTick()
    onTick() {
        if (this.stage === 1 && this.ganon !== undefined){
            if (this.ganon!.health === 8) return;
            if (this.ganonHP > this.ganon!.health){
                this.ModLoader.privateBus.emit(OOTO_PRIVATE_EVENTS.FORBID_PUPPETS, false);
                this.stage++;
            }
        }
    }

    @EventHandler(ModLoaderEvents.ON_SOFT_RESET_PRE)
    onReset(evt: any) {
        this.resetModule();
    }

    private resetModule() {
        this.ganon = undefined;
        this.ganonUUID = "";
        this.stage = 0;
        this.ModLoader.privateBus.emit(OOTO_PRIVATE_EVENTS.FORBID_PUPPETS, false);
    }
}