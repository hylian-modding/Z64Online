import { OOTO_PRIVATE_EVENTS } from "@OotOnline/data/InternalAPI";
import { DecodeImmediate, DecodeOpcode, EncodeImmediate, OPCODE_DEFAULT } from "@OotOnline/common/lib/OpcodeBullshit";
import IMemory from "modloader64_api/IMemory";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { IOOTCore } from "modloader64_api/OOT/OOTAPI";
import { IImGui } from "modloader64_api/Sylvain/ImGui";
import { SmartBuffer } from 'smart-buffer';

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
    ModLoader: IModLoaderAPI;

    constructor(imgui: IImGui, emulator: IMemory, core: IOOTCore, ModLoader: IModLoaderAPI) {
        this.ImGui = imgui;
        this.emulator = emulator;
        this.displayBuffers.push(new OpaBuffer("Opa", this.ImGui, this.emulator, 0x2BC, 0x2B8, 0x2C0));
        this.displayBuffers.push(new OpaBuffer("Xlu", this.ImGui, this.emulator, 0x2CC, 0x2C8, 0x2D0));
        this.displayBuffers.push(new OpaBuffer("Work", this.ImGui, this.emulator, 0x1B8, 0x1B4, 0x1BC));
        this.displayBuffers.push(new OpaBuffer("Overlay", this.ImGui, this.emulator, 0x2AC, 0x2A8, 0x2B0));
        this.core = core;
        this.ModLoader = ModLoader;
    }

    moveRestrictionTable() {
        let copy: Buffer = this.ModLoader.emulator.rdramReadBuffer(0x800F7350, 0x4 * 99);
        let sb = new SmartBuffer();
        sb.writeBuffer(copy);
        sb.writeUInt32BE(0x69FFFFFF);
        sb.writeUInt32BE(0xFF000000);
        let r = this.ModLoader.heap!.malloc(sb.toBuffer().byteLength);
        this.ModLoader.emulator.rdramWriteBuffer(r, sb.toBuffer());
        console.log(r.toString(16));
        let arr1 = [0x8006F294, 0x8006F29C];
        let arr2 = [0x8006F298, 0x8006F2A4];
        for (let i = 0; i < arr1.length; i++) {
            let op1 = DecodeOpcode(this.emulator.rdramReadBuffer(arr1[i], 0x4));
            op1 = EncodeImmediate(op1, r >> 16);
            this.emulator.rdramWriteBuffer(arr1[i], op1.data);
        }
        for (let i = 0; i < arr2.length; i++) {
            let op1 = DecodeOpcode(this.emulator.rdramReadBuffer(arr2[i], 0x4));
            op1 = EncodeImmediate(op1, r);
            this.emulator.rdramWriteBuffer(arr2[i], op1.data);
        }
        this.emulator.invalidateCachedCode();
        this.ModLoader.emulator.rdramWriteBuffer(0x800F7350, copy.fill(0xFF));
        global.ModLoader["ENTRANCE_TABLE"] = r;
    }

    moveSceneTable() {
        let original = 0x800FB4E0;
        let size = 0x14 * 100;
        let copy = this.emulator.rdramReadBuffer(original, size);
        let sb = new SmartBuffer();
        for (let i = 0; i < 0xFF; i++) {
            sb.writeBuffer(copy.slice((0x59 * 0x14), (0x59 * 0x14) + 0x14));
        }
        sb.writeOffset = 0;
        sb.writeBuffer(copy);
        let newSceneTable: Buffer = sb.toBuffer();
        let r = this.ModLoader.heap!.malloc(newSceneTable.byteLength);
        this.emulator.rdramWriteBuffer(r, newSceneTable);
        this.emulator.rdramWriteBuffer(original, copy.fill(0xFF));
        let arr = [0x8009CF20, 0x8009CF44];
        for (let i = 0; i < arr.length; i++) {
            let op1 = DecodeOpcode(this.emulator.rdramReadBuffer(arr[i], 0x4));
            op1 = EncodeImmediate(op1, r >> 16);
            this.emulator.rdramWriteBuffer(arr[i], op1.data);
        }
        let arr2 = [0x8009CF24, 0x8009CF48];
        for (let i = 0; i < arr2.length; i++) {
            let op1 = DecodeOpcode(this.emulator.rdramReadBuffer(arr2[i], 0x4));
            op1 = EncodeImmediate(op1, r);
            this.emulator.rdramWriteBuffer(arr2[i], op1.data);
        }
        this.emulator.invalidateCachedCode();
        global.ModLoader["SCENE_TABLE"] = r;
        this.ModLoader.privateBus.emit(OOTO_PRIVATE_EVENTS.MOVED_SCENE_TABLE);
    }

    moveEntranceTable() {
        let copy: Buffer = this.ModLoader.emulator.rdramReadBuffer(0x800F9C90, (0x613 * 0x4));
        let r = this.ModLoader.heap!.malloc(copy.byteLength * 2);
        this.ModLoader.emulator.rdramWriteBuffer(r, copy);
        this.ModLoader.emulator.rdramWriteBuffer(0x800F9C90, copy.fill(0xFF));
        let arr1 = [0x8009AA30, 0x80056F04, 0x80056F50, 0x8009AD0C, 0x8009B0D4, 0x800826E8];
        let arr2 = [0x8009AA34, 0x80056F14, 0x80056F60];
        let arr3 = [0x8009AD20, 0x8009B0E4, 0x80082774];
        for (let i = 0; i < arr1.length; i++) {
            let op1 = DecodeOpcode(this.emulator.rdramReadBuffer(arr1[i], 0x4));
            op1 = EncodeImmediate(op1, r >> 16);
            this.emulator.rdramWriteBuffer(arr1[i], op1.data);
        }
        for (let i = 0; i < arr2.length; i++) {
            let op1 = DecodeOpcode(this.emulator.rdramReadBuffer(arr2[i], 0x4));
            op1 = EncodeImmediate(op1, r);
            this.emulator.rdramWriteBuffer(arr2[i], op1.data);
        }
        for (let i = 0; i < arr3.length; i++) {
            let op1 = DecodeOpcode(this.emulator.rdramReadBuffer(arr3[i], 0x4));
            op1 = EncodeImmediate(op1, r + 2);
            this.emulator.rdramWriteBuffer(arr3[i], op1.data);
        }
        this.emulator.invalidateCachedCode();
        global.ModLoader["ENTRANCE_TABLE"] = r;
    }

    onViUpdate() {
        if (this.ImGui.beginMainMenuBar()) {
            if (this.ImGui.beginMenu("Mods")) {
                if (this.ImGui.beginMenu("OotO")) {
                    if (this.ImGui.menuItem("Opa Debugger")) {
                        this.showOpaDebugger = !this.showOpaDebugger;
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
            if (this.ImGui.button("INJECT SHIT")) {
                this.moveSceneTable();
                //this.moveEntranceTable();
                this.moveRestrictionTable();
                let copy: Buffer = this.ModLoader.emulator.rdramReadBuffer(0x800F9C90, (0x613 * 0x4));
                for (let i = 0; i < 0x613 * 0x4; i+=0x4){
                    let scene = copy.readUInt8(i);
                    if (scene === 0x59){
                        scene = 0x59;
                        console.log("yeet");
                    }
                    copy.writeUInt8(scene, i);
                }
                this.ModLoader.emulator.rdramWriteBuffer(0x800F9C90, copy);
            }
            if (this.ImGui.button("SCAN SHIT")) {
                let ram: Buffer = this.emulator.rdramReadBuffer(0, 16 * 1024 * 1024);
                for (let i = 0; i < ram.byteLength; i += 4) {
                    let inst = ram.slice(i, i + 4);
                    let op = DecodeOpcode(inst);
                    switch (op.code) { // 800F9C90
                        case OPCODE_DEFAULT[OPCODE_DEFAULT.ADDIU]:
                            let a = DecodeImmediate(op);
                            if (a === 0x9C90) console.log(`ADDIU: ${(i).toString(16)}`);
                            break;
                        case OPCODE_DEFAULT[OPCODE_DEFAULT.LUI]:
                            let b = DecodeImmediate(op);
                            if (b === 0x800F) console.log(`LUI: ${(i).toString(16)}`);
                            break;
                        case OPCODE_DEFAULT[OPCODE_DEFAULT.ORI]:
                            let c = DecodeImmediate(op);
                            if (c === 0x9C90) console.log(`ORI: ${(i).toString(16)}`);
                            break;
                    }
                }
            }
            this.ImGui.end();
        }
    }

}