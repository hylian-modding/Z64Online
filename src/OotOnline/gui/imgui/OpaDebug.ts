import { IS_DEV_BUILD } from "@OotOnline/OotOnline";
import IMemory from "modloader64_api/IMemory";
import { Command } from "modloader64_api/OOT/ICommandBuffer";
import { IOOTCore } from "modloader64_api/OOT/OOTAPI";
import { IImGui } from "modloader64_api/Sylvain/ImGui";

class OpaBuffer {

    label: string;
    ImGui: IImGui;
    emulator: IMemory;
    pointerOffset: number;
    sizeOffset: number;
    appendOffset: number;

    constructor(label: string, imgui: IImGui, emulator: IMemory, pointerOffset: number, sizeOffset: number, appendOffset: number) {
        this.ImGui = imgui;
        this.emulator = emulator;
        this.label = label;
        this.pointerOffset = pointerOffset;
        this.sizeOffset = sizeOffset;
        this.appendOffset = appendOffset;
    }

    onViUpdate() {
        let gfx_start: number = this.emulator.rdramRead32(global.ModLoader.global_context_pointer);
        let POLY_OPA_DISP: number = this.emulator.rdramReadPtr32(gfx_start, this.pointerOffset);
        let POLY_OPA_SIZE: number = this.emulator.rdramReadPtr32(gfx_start, this.sizeOffset);
        let POLY_OPA_APPEND: number = this.emulator.rdramReadPtr32(gfx_start, this.appendOffset);
        let used: number = POLY_OPA_APPEND - POLY_OPA_DISP;
        let left: number = POLY_OPA_SIZE - used;
        this.ImGui.text(this.label + " Pointer: " + POLY_OPA_DISP.toString(16).toUpperCase());
        this.ImGui.text(this.label + " Bytes left: " + left.toString(16).toUpperCase());
        this.ImGui.newLine();
    }

}

export class OpaDebug {

    ImGui: IImGui;
    emulator: IMemory;
    showOpaDebugger: boolean = false;
    displayBuffers: Array<OpaBuffer> = [];
    core: IOOTCore;

    constructor(imgui: IImGui, emulator: IMemory, core: IOOTCore) {
        this.ImGui = imgui;
        this.emulator = emulator;
        this.displayBuffers.push(new OpaBuffer("Opa", this.ImGui, this.emulator, 0x2BC, 0x2B8, 0x2C0));
        this.displayBuffers.push(new OpaBuffer("Xlu", this.ImGui, this.emulator, 0x2CC, 0x2C8, 0x2D0));
        this.displayBuffers.push(new OpaBuffer("Work", this.ImGui, this.emulator, 0x1B8, 0x1B4, 0x1BC));
        this.displayBuffers.push(new OpaBuffer("Overlay", this.ImGui, this.emulator, 0x2AC, 0x2A8, 0x2B0));
        this.core = core;
    }

    onViUpdate() {
        if (this.ImGui.beginMainMenuBar()) {
            if (this.ImGui.beginMenu("Mods")) {
                if (this.ImGui.beginMenu("OotO")) {
                    if (IS_DEV_BUILD) {
                        if (this.ImGui.menuItem("Opa Debugger")) {
                            this.showOpaDebugger = !this.showOpaDebugger;
                        }
                    }
                    this.ImGui.endMenu();
                }
                this.ImGui.endMenu();
            }
            this.ImGui.endMainMenuBar();
        }
        if (this.showOpaDebugger) {
            if (this.ImGui.begin("Opa Debugger##OotO:OpaDebugger")) {
                for (let i = 0; i < this.displayBuffers.length; i++) {
                    this.displayBuffers[i].onViUpdate();
                }
            }
            if (this.ImGui.button("ARWING")){
                this.core.commandBuffer.runCommand(Command.SPAWN_ACTOR, 0x806001A2);
            }
            this.ImGui.end();
        }
    }

}