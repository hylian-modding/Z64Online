import ArbitraryHook from "@Z64Online/common/lib/ArbitraryHook";
import { InjectCore } from "modloader64_api/CoreInjection";
import { EventHandler, EventsClient } from "modloader64_api/EventHandler";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { getRandomInt } from "@Z64Online/common/lib/getRandomInt";
import { string_ref } from "modloader64_api/Sylvain/ImGui";

export default class GamemodeManager {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IZ64Main;
    ovl!: ArbitraryHook;
    ovl2!: ArbitraryHook;
    onlyonce: boolean = false;
    target: string_ref = [""];

    @EventHandler(EventsClient.ON_INJECT_FINISHED)
    onHeapReady(evt: any) {
/*         this.ModLoader.utils.setTimeoutFrames(() => {
            this.ovl = new ArbitraryHook("Prop Hunt", this.ModLoader, this.core, PropHunt_oot);
            this.ovl.inject();
        }, getRandomInt(0, 100));
        this.ModLoader.utils.setTimeoutFrames(() => {
            this.ovl2 = new ArbitraryHook("Enemy Control", this.ModLoader, this.core, EnemyControl_oot);
            this.ovl2.inject();
        }, getRandomInt(0, 100)); */
    }

    /* @onViUpdate()
    onVi() {
        if (this.ModLoader.ImGui.begin("PROP HUNT")) {
            this.ModLoader.ImGui.inputText("Target", this.target);
            if (this.ModLoader.ImGui.smallButton("Do it")) {
                this.ModLoader.utils.setTimeoutFrames(() => {
                    let addr = parseInt(this.target[0], 16);
                    this.ModLoader.emulator.rdramWrite32(this.ovl.instancePointer, Z64_SPAWN_WITH_ADDRESS_POINTER);
                    this.ovl.runCreate(addr, (instance: number) => { 
                        console.log(instance.toString(16));
                    });
                }, 1);
            }
            if (this.ModLoader.ImGui.smallButton("Disengage")){
                this.ModLoader.utils.setTimeoutFrames(()=>{
                    this.ovl.runDestroy(0, ()=>{});
                }, 1);
            }
        }
    } */
}