import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { Z64_GLOBAL_PTR } from "Z64Lib/src/Common/types/GameAliases";
import { getCommandBuffer } from "../types/GameAliases";

export type ArbitraryHook_Callback = (instance: number) => void;

export default class ArbitratyHook {

    name: string;
    ModLoader: IModLoaderAPI;
    core: IZ64Main;
    hax: Buffer;
    payloadPointer: number = -1;
    fnPointers: number[] = [-1, -1];
    paramPointers: number[] = [-1, -1];
    instancePointer: number = -1;

    constructor(name: string, ModLoader: IModLoaderAPI, core: IZ64Main, buf: Buffer) {
        this.name = name;
        this.ModLoader = ModLoader;
        this.core = core;
        this.hax = buf;
    }

    inject() {
        if (this.payloadPointer > 0) return;
        this.payloadPointer = this.ModLoader.heap!.malloc(this.hax.byteLength);
        this.ModLoader.emulator.rdramWriteBuffer(this.payloadPointer, this.hax);
        let cb = getCommandBuffer(this.core);
        cb.relocateOverlay(this.payloadPointer, this.payloadPointer + (this.hax.byteLength - this.hax.readUInt32BE(this.hax.byteLength - 0x4)), 0x80800000).then(() => {
            let embedStart: number = this.hax.indexOf(Buffer.from("DEADBEEF", 'hex'));
            if (this.hax.readUInt32BE(embedStart + 4) > 0) {
                this.paramPointers[0] = this.ModLoader.heap!.malloc(0x10);
                this.fnPointers[0] = this.ModLoader.emulator.rdramRead32(this.payloadPointer + embedStart + 4);
            }
            if (this.hax.readUInt32BE(embedStart + 8) > 0) {
                this.paramPointers[1] = this.ModLoader.heap!.malloc(0x10);
                this.fnPointers[1] = this.ModLoader.emulator.rdramRead32(this.payloadPointer + embedStart + 8);
            }
            let initStart: number = this.hax.indexOf(Buffer.from("00050400", 'hex'));
            let size = this.hax.readUInt32BE(initStart + 0xC);
            if (size > 0) {
                this.instancePointer = this.ModLoader.heap!.malloc(size);
            }
        }).catch((err: any) => {
            this.ModLoader.logger.error(err);
        });
    }

    clear() {
        if (this.payloadPointer > 0){
            this.ModLoader.heap!.free(this.payloadPointer);
        }
        if (this.instancePointer > 0) {
            this.ModLoader.heap!.free(this.instancePointer);
        }
        for (let i = 0; i < this.paramPointers.length; i++) {
            if (this.paramPointers[i] > 0) {
                this.ModLoader.heap!.free(this.paramPointers[i]);
            }
        }
        for (let i = 0; i < this.fnPointers.length; i++) {
            if (this.fnPointers[i] > 0) {
                this.ModLoader.heap!.free(this.fnPointers[i]);
            }
        }
    }

    private runFn(param: number, callback: ArbitraryHook_Callback, fn: number = 0) {
        let params = this.paramPointers[fn];
        this.ModLoader.emulator.rdramWrite32(params + 0x0, this.instancePointer);
        this.ModLoader.emulator.rdramWrite32(params + 0x4, this.ModLoader.emulator.rdramRead32(Z64_GLOBAL_PTR));
        this.ModLoader.emulator.rdramWrite32(params + 0x8, param);
        let cb = getCommandBuffer(this.core);
        cb.arbitraryFunctionCall(this.fnPointers[fn], params, 3).then(() => {
            callback(this.instancePointer);
        }).catch((err: any) => { });
    }

    runCreate(param: number, callback: ArbitraryHook_Callback) {
        this.runFn(param, callback, 0);
    }

    runDestroy(param: number, callback: ArbitraryHook_Callback) {
        this.runFn(param, callback, 1);
    }

}