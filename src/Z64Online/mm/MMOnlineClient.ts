import { ModelManagerClient } from "@Z64Online/common/cosmetics/ModelManager";
import { ProxySide, SidedProxy } from "modloader64_api/SidedProxy/SidedProxy";
import { Preinit } from "modloader64_api/PluginLifecycle";
import { ModelManagerMM } from "./models/ModelManagerMM";
import { CDNClient } from "@Z64Online/common/cdn/CDNClient";
import { EventHandler } from "modloader64_api/EventHandler";
import { Z64OnlineEvents } from "@Z64Online/common/api/Z64API";
import fs from 'fs';
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ImGuiHandler_MM } from "./imgui/ImGuiHandler_MM";

export default class MMOnlineClient{
    
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @SidedProxy(ProxySide.CLIENT, CDNClient)
    cdn!: CDNClient;
    @SidedProxy(ProxySide.CLIENT, ModelManagerClient)
    modelManager!: ModelManagerClient;
    @SidedProxy(ProxySide.CLIENT, ImGuiHandler_MM)
    gui!: ImGuiHandler_MM;

    @Preinit()
    preinit(): void {
        this.modelManager.child = new ModelManagerMM(this.modelManager);
    }

    @EventHandler(Z64OnlineEvents.DEBUG_DUMP_RAM)
    onDump(evt: any) {
        fs.writeFileSync(global.ModLoader.startdir + "/ram.bin", this.ModLoader.emulator.rdramReadBuffer(0, 16 * 1024 * 1024));
    }

}