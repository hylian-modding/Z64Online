import { string_ref } from "modloader64_api/Sylvain/ImGui";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { IActor } from "Z64Lib/API/imports";

export abstract class ImGuiHandlerCommon {

    ModLoader!: IModLoaderAPI;
    core!: IZ64Main;

    showSpawner: boolean = false;
    spawnID: string_ref = [""];
    spawnParam: string_ref = [""];
    spawnParam2: string_ref = [""];

    onViUpdate() {
        if (this.ModLoader.ImGui.beginMainMenuBar()) {
            if (this.ModLoader.ImGui.beginMenu("Mods")) {
                if (this.ModLoader.ImGui.beginMenu("Z64O")) {
                    // #ifdef IS_DEV_BUILD
                    if (this.ModLoader.ImGui.menuItem("Actor Spawner")) {
                        this.showSpawner = true;
                    }
                    // #endif
                    this.ModLoader.ImGui.endMenu();
                }
                this.ModLoader.ImGui.endMenu();
            }
            this.ModLoader.ImGui.endMainMenuBar();
        }
        if (this.showSpawner) {
            if (this.ModLoader.ImGui.begin("Actor Spawner###OotO:ActorSpawner")) {
                this.ModLoader.ImGui.inputText("ID", this.spawnID);
                this.ModLoader.ImGui.inputText("Param", this.spawnParam);
                this.ModLoader.ImGui.inputText("Rot", this.spawnParam2);
                if (this.ModLoader.ImGui.smallButton("Spawn")) {
                    let _core = this.core.OOT !== undefined ? this.core.OOT : this.core.MM;
                    let pos = _core!.link.position.getVec3();
                    let rot = _core!.link.rotation.getVec3();
                    console.log(pos);
                    this.ModLoader.utils.setTimeoutFrames(() => {
                        _core!.commandBuffer.spawnActorRXY_Z(parseInt(this.spawnID[0], 16), parseInt(this.spawnParam[0], 16), parseInt(this.spawnParam2[0], 16), rot.z, pos).then((actor: IActor)=>{
                            actor.position.setRawPos(_core!.link.position.getRawPos());
                        });
                    }, 1);
                }
            }
            this.ModLoader.ImGui.end();
        }
    }

}