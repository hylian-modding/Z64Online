import { onViUpdate } from "modloader64_api/PluginLifecycle";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { bus } from "modloader64_api/EventHandler";
import { Z64OnlineEvents } from "@Z64Online/common/api/Z64API";
import { Z64_PLAYER } from "Z64Lib/src/Common/types/GameAliases";

export class ImGuiHandler_MM {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;

    @onViUpdate()
    onViUpdate() {
        if (this.ModLoader.ImGui.beginMainMenuBar()) {
            if (this.ModLoader.ImGui.beginMenu("Mods")) {
                if (this.ModLoader.ImGui.beginMenu("OotO")) {
                    if (this.ModLoader.ImGui.button("DUMP RAM")) {
                        bus.emit(Z64OnlineEvents.DEBUG_DUMP_RAM, {});
                    }
                    this.ModLoader.ImGui.endMenu();
                }
                this.ModLoader.ImGui.endMenu();
            }
            this.ModLoader.ImGui.endMainMenuBar();
        }
    }
}