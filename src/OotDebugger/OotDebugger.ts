import { IPlugin, IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import path from 'path';
import { GUITunnelPacket } from "modloader64_api/GUITunnel";
import { IOOTCore, LinkState } from "modloader64_api/OOT/OOTAPI";
import { InjectCore } from "modloader64_api/CoreInjection";

class OotDebugger implements IPlugin {

    ModLoader!: IModLoaderAPI

    @InjectCore()
    core!: IOOTCore

    preinit(): void {

    }

    init(): void {

    }

    postinit(): void {
        this.ModLoader.gui.openWindow(800, 600, path.resolve(path.join(__dirname, "gui", "gui.html")));
    }

    onTick(): void {
        this.autosaveSceneData();
    }

    autosaveSceneData() {
        let live_scene_chests: Buffer = this.core.global.liveSceneData_chests;
        let live_scene_switches: Buffer = this.core.global.liveSceneData_switch;
        let live_scene_collect: Buffer = this.core.global.liveSceneData_collectable;
        let live_scene_clear: Buffer = this.core.global.liveSceneData_clear;
        let live_scene_temp: Buffer = this.core.global.liveSceneData_temp;
        let save_scene_data: Buffer = this.core.global.getSaveDataForCurrentScene();

        let save: Buffer = Buffer.alloc(0x1C);
        live_scene_chests.copy(save, 0x0); // Chests
        live_scene_switches.copy(save, 0x4); // Switches
        live_scene_clear.copy(save, 0x8); // Room Clear
        live_scene_collect.copy(save, 0xC); // Collectables
        live_scene_temp.copy(save, 0x10) // Unused space.
        save_scene_data.copy(save, 0x14, 0x14, 0x18); // Visited Rooms.
        save_scene_data.copy(save, 0x18, 0x18, 0x1C); // Visited Rooms.

        let liveString = "";
        for (let i = 0; i < save.byteLength; i += 4) {
            liveString += save.readUInt32BE(i).toString(16) + "\n";
        }

        this.ModLoader.gui.tunnel.send("OotDebugger:LiveSceneData", new GUITunnelPacket("OotDebugger", "OotDebugger:LiveSceneData", liveString));

        let saveString = "";
        for (let i = 0; i < save_scene_data.byteLength; i += 4) {
            saveString += save_scene_data.readUInt32BE(i).toString(16) + "\n";
        }

        this.ModLoader.gui.tunnel.send("OotDebugger:SaveSceneData", new GUITunnelPacket("OotDebugger", "OotDebugger:SaveSceneData", saveString));
    }

}

module.exports = OotDebugger;