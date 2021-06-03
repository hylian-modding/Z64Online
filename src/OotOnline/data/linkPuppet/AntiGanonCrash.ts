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
    ganonState: number = -1;
    stage: number = 0;

    @EventHandler(OotEvents.ON_ACTOR_SPAWN)
    onActorSpawned(actor: IActor) {
        if (actor.actorID === 0x17A) {
            // Ganon is spawned.
            this.ganon = actor;
            this.ganonUUID = this.ganon.actorUUID;
            this.ganonState = this.ganon.rdramRead32(0x300);
            this.ModLoader.logger.debug("Setting up Ganon crash fix part 1");
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
        if (this.ganon !== undefined) {
            if (this.stage === 1) {
                if (this.ganonState === 0 && this.ganon!.rdramRead32(0x300) === 1) {
                    this.ganonState = this.ganon!.rdramRead32(0x300);
                    this.ModLoader.privateBus.emit(OOTO_PRIVATE_EVENTS.TOGGLE_PUPPET_VISIBILITY, false);
                    this.stage++;
                    this.ModLoader.logger.debug("Setting up Ganon crash fix part 2");
                }
            } else if (this.stage === 2) {
                if (!this.core.helper.Player_InBlockingCsMode()) {
                    this.ModLoader.privateBus.emit(OOTO_PRIVATE_EVENTS.TOGGLE_PUPPET_VISIBILITY, true);
                    this.ModLoader.logger.debug("Unhooking stuff for Ganon crash fix.");
                    this.stage++;
                }
            }
        }
    }

    @EventHandler(ModLoaderEvents.ON_SOFT_RESET_PRE)
    onReset(evt: any) {
        this.resetModule();
    }

    private resetModule() {
        this.ganon = undefined;
        this.ganonState = -1;
        this.stage = 0;
        this.ganonUUID = "";
    }
}