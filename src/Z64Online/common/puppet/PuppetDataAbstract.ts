import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { PUPPET_INST_SIZE } from "../cosmetics/Defines";
import { AgeOrForm } from "../types/Types";
import { IPuppet } from "./IPuppet";
import { IPuppetData } from "./IPuppetData";
import { SmartBuffer } from 'smart-buffer';

export abstract class PuppetDataAbstract implements IPuppetData {
    parent: IPuppet;
    ModLoader: IModLoaderAPI;
    pointer: number = 0;
    buf: SmartBuffer = new SmartBuffer();
    ageOrForm: AgeOrForm = 0;

    backingShared: SharedArrayBuffer = new SharedArrayBuffer(PUPPET_INST_SIZE);
    backingBuffer: Buffer = Buffer.from(this.backingShared);
    ageOrFormLastFrame: AgeOrForm = 0;

    constructor(parent: IPuppet, pointer: number, ModLoader: IModLoaderAPI) {
        this.parent = parent;
        this.pointer = pointer;
        this.ModLoader = ModLoader;
        this.buf = new SmartBuffer();
    }

    abstract processBundle(bundle: Buffer): void;
    abstract onTick(): void;

    toJSON() {
        const jsonObj: any = {};
        jsonObj["bundle"] = this.buf.toBuffer();
        return jsonObj;
    }
}