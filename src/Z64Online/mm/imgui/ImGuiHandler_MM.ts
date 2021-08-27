import { onViUpdate } from "modloader64_api/PluginLifecycle";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { bus } from "modloader64_api/EventHandler";
import { Z64OnlineEvents } from "@Z64Online/common/api/Z64API";
import { InputTextFlags, string_ref } from "modloader64_api/Sylvain/ImGui";

export class ImGuiHandler_MM {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    input: string_ref = [""];
    result: string_ref = [""];

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
        if (this.ModLoader.ImGui.begin("RAM SEARCH")){
            this.ModLoader.ImGui.text(this.result[0]);
            this.ModLoader.ImGui.inputText("Search", this.input, InputTextFlags.CharsHexadecimal);
            if (this.ModLoader.ImGui.smallButton("Search")){
                this.result[0] = "";
                let b = Buffer.from(this.input[0], 'hex');
                let ram = this.ModLoader.emulator.rdramReadBuffer(0, 16 * 1024 * 1024);
                let i = ram.indexOf(b);
                while(i > -1){
                    this.result[0] = this.result[0] + i.toString(16).padStart(8, '0') + "\n";
                    i += b.byteLength;
                    if (ram.byteLength <= i){
                        i = ram.indexOf(b, i);
                        console.log(i);
                    }else{
                        i = -1;
                    }
                }
            }
        }
        this.ModLoader.ImGui.end();
    }
}