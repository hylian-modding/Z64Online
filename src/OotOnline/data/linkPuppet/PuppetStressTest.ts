import { InjectCore } from "modloader64_api/CoreInjection";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { INetworkPlayer } from "modloader64_api/NetworkHandler";
import { Age, IOOTCore } from "modloader64_api/OOT/OOTAPI";
import { onViUpdate } from "modloader64_api/PluginLifecycle";
import { ParentReference } from "modloader64_api/SidedProxy/SidedProxy";
import { PuppetOverlordClient } from "./PuppetOverlord";

export class PuppetStressTest {
    // #ifdef IS_DEV_BUILD
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;
    @ParentReference()
    parent!: any;
    fakeCount: number = 0;

    @onViUpdate()
    onVi() {
        if (this.ModLoader.ImGui.beginMainMenuBar()) {
            if (this.ModLoader.ImGui.beginMenu("Mods")) {
                if (this.ModLoader.ImGui.beginMenu("OotO")) {

                    if (this.ModLoader.ImGui.beginMenu("Puppet Testing")) {
                        if (this.ModLoader.ImGui.button("STRESS")) {
                            this.ModLoader.utils.setIntervalFrames(()=>{
                                let fake = {nickname: "Fake #" + this.fakeCount++, uuid: this.ModLoader.utils.getUUID(), data: {}};
                                (this.parent.client.puppets as PuppetOverlordClient).registerPuppet(fake as INetworkPlayer);
                                this.ModLoader.utils.setTimeoutFrames(()=>{
                                    (this.parent.client.puppets as PuppetOverlordClient).changePuppetScene(fake, 81, Age.ADULT);
                                    console.log(this.ModLoader.emulator.rdramReadPtr8(global.ModLoader.global_context_pointer, 0x12CB));
                                }, 1);
                            }, 3);
                        }
                        this.ModLoader.ImGui.endMenu();
                    }
                    this.ModLoader.ImGui.endMenu();
                }
                this.ModLoader.ImGui.endMenu();
            }
            this.ModLoader.ImGui.endMainMenuBar();
        }
    }
    // #endif
}