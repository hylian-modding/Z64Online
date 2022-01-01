import ArbitraryHook from "@Z64Online/common/lib/ArbitraryHook";
import { InjectCore } from "modloader64_api/CoreInjection";
import { EventHandler } from "modloader64_api/EventHandler";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { IActor, Z64 } from "Z64Lib/API/imports";
import { Z64_GAME } from "Z64Lib/src/Common/types/GameAliases";
import EponaHax from "./EponaHax";

export default class EponaModelManager{

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IZ64Main;
    hook!: ArbitraryHook;

    @EventHandler(Z64.OotEvents.ON_ACTOR_SPAWN)
    onActorSpawn(actor: IActor){
        if (actor.actorID === 0x0014){
            // Epona.
            if (this.hook === undefined){
                this.hook = new ArbitraryHook("Epona", this.ModLoader, this.core, EponaHax.getHax(Z64_GAME)!);
                this.hook.inject();
            }
            this.ModLoader.utils.setTimeoutFrames(()=>{
                this.ModLoader.emulator.rdramWrite32(this.hook.instancePointer + 0x0, actor.pointer);
                this.hook.runCreate(0, ()=>{
                });
            }, 20);
        }
    }

}