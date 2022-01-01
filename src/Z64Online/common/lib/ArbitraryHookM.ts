import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { Z64_GLOBAL_PTR } from "Z64Lib/src/Common/types/GameAliases";
import { getCommandBuffer } from "../types/GameAliases";
import { Z64O_Logger } from "./Logger";

class ArbitraryFunction {
    private ModLoader: IModLoaderAPI;
    private core: IZ64Main;
    private pointer: number;
    private paramAlloc: number;
    private parent: ArbitraryHookM;

    constructor(ModLoader: IModLoaderAPI, core: IZ64Main, pointer: number, parent: ArbitraryHookM) {
        this.ModLoader = ModLoader;
        this.core = core;
        this.pointer = pointer;
        this.paramAlloc = this.ModLoader.heap!.malloc(0x10);
        this.parent = parent;
        Z64O_Logger.debug(`Setting up exposed function: ${this.pointer.toString(16)}`);
    }

    invoke(param: number): Promise<number> {
        return new Promise((accept, reject) => {
            let cb = getCommandBuffer(this.core);
            this.ModLoader.emulator.rdramWrite32(this.paramAlloc + 0x0, this.parent.instancePointer);
            this.ModLoader.emulator.rdramWrite32(this.paramAlloc + 0x4, this.ModLoader.emulator.rdramRead32(Z64_GLOBAL_PTR));
            this.ModLoader.emulator.rdramWrite32(this.paramAlloc + 0x8, param);
            cb.arbitraryFunctionCall(this.pointer, this.paramAlloc, 3).then((buf: Buffer) => {
                accept(buf.readUInt32BE(0));
            }).catch((err: any) => {
                reject(err);
            });
        });
    }
}

export default class ArbitraryHookM {

    private ModLoader: IModLoaderAPI;
    private core: IZ64Main;
    ovl: Buffer;
    private payloadPointer: number = 0;
    instancePointer: number = 0;
    funcs: ArbitraryFunction[] = [];

    constructor(ModLoader: IModLoaderAPI, core: IZ64Main, ovl: Buffer) {
        this.ModLoader = ModLoader;
        this.core = core;
        this.ovl = ovl;
    }

    doInject() {
        if (this.payloadPointer > 0) return;
        this.payloadPointer = this.ModLoader.heap!.malloc(this.ovl.byteLength);
        this.ModLoader.emulator.rdramWriteBuffer(this.payloadPointer, this.ovl);
        let cb = getCommandBuffer(this.core);
        cb.relocateOverlay(this.payloadPointer, this.payloadPointer + (this.ovl.byteLength - this.ovl.readUInt32BE(this.ovl.byteLength - 0x4)), 0x80800000).then(() => {
            let embedStart: number = this.ovl.indexOf(Buffer.from("DEADBEEF", 'hex')) + 4;
            let numOfFuncs: number = this.ModLoader.emulator.rdramRead32(this.payloadPointer + embedStart);
            for (let i = 0; i < numOfFuncs; i++) {
                this.funcs.push(new ArbitraryFunction(this.ModLoader, this.core, this.ModLoader.emulator.rdramRead32(this.payloadPointer + embedStart + 4 + (i * 4)), this));
            }
            let sizeOffset: number = embedStart + 4 + (numOfFuncs * 4);
            let size: number = this.ModLoader.emulator.rdramRead32(this.payloadPointer + sizeOffset);
            this.instancePointer = this.ModLoader.heap!.malloc(size);
            Z64O_Logger.debug(`Allocated actor sync struct of size ${size.toString(16)} at ${this.instancePointer.toString(16)}`);
        });
    }

}