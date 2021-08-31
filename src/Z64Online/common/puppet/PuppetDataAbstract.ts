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
    buf: SmartBuffer;
    ageOrForm: AgeOrForm = 0;
    private _bundle!: Buffer;

    backingShared: SharedArrayBuffer = new SharedArrayBuffer(PUPPET_INST_SIZE);
    backingBuffer: Buffer = Buffer.from(this.backingShared);
    ageOrFormLastFrame: AgeOrForm = 0;

    private readonly copyFields: string[] = new Array<string>();

    public get bundle(): Buffer {
		return this._bundle;
	}
	public set bundle(value: Buffer) {
		this._bundle = value;
	}

    constructor(parent: IPuppet, pointer: number, ModLoader: IModLoaderAPI) {
        this.parent = parent;
        this.pointer = pointer;
        this.ModLoader = ModLoader;
        this.buf = new SmartBuffer();
        this.copyFields.push("bundle");
    }

    onTick(): void {
    }

    toJSON() {
        const jsonObj: any = {};
        for (let i = 0; i < this.copyFields.length; i++) {
            jsonObj[this.copyFields[i]] = (this as any)[this.copyFields[i]];
        }
        return jsonObj;
    }
}