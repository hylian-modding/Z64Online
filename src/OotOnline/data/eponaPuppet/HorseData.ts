import { IPuppetData } from "@OotOnline/OotoAPI/IPuppetData";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { IOOTCore } from "modloader64_api/OOT/OOTAPI";

export class HorseData implements IPuppetData {
    pointer: number = 0;
    ModLoader: IModLoaderAPI;
    core: IOOTCore;
    private readonly copyFields: string[] = new Array<string>();

    constructor(ModLoader: IModLoaderAPI, core: IOOTCore) {
        this.ModLoader = ModLoader;
        this.core = core;
        this.copyFields.push('pos');
        this.copyFields.push('rot');
        this.copyFields.push("anim");
        this.copyFields.push("speed");
    }

    get pos(): Buffer {
        return Buffer.alloc(0xC);
    }

    set pos(buf: Buffer) {
    }

    get rot(): Buffer {
        return Buffer.alloc(0xC);
    }

    set rot(buf: Buffer) {
    }

    get anim(): Buffer{
        return Buffer.alloc(0xC);
    }

    set anim(buf: Buffer){
    }

    get speed(): Buffer{
        return Buffer.alloc(0xC);
    }

    set speed(buf: Buffer){
    }

    toJSON() {
        const jsonObj: any = {};
        for (let i = 0; i < this.copyFields.length; i++) {
            jsonObj[this.copyFields[i]] = (this as any)[this.copyFields[i]];
        }
        return jsonObj;
    }

}