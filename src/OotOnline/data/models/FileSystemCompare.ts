import { Z64RomTools } from "Z64Lib/API/Z64RomTools";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import fse from 'fs-extra';
import path from 'path';
import { RomPatch, FilePatch } from "./ModelManager";

export class FileSystemCompare{
    
    ModLoader: IModLoaderAPI;

    constructor(ModLoader: IModLoaderAPI){
        this.ModLoader = ModLoader;
    }

    dumpVanilla(rom: Buffer){
        let tools: Z64RomTools = new Z64RomTools(this.ModLoader, 0x7430);
        let total: number = 1509;
        let target: string = "./vanilla";
        if (!fse.existsSync(target)){
            fse.mkdirSync(target);
        }
        for (let i = 0; i < total; i++){
            console.log(i);
            let buf: Buffer = tools.decompressFileFromRom(rom, i);
            fse.writeFileSync(path.join(target, i + ".bin"), buf);
        }
    }

    compare(){
        let v: string = "./vanilla";
        let d: string = "./dirty"; //haha poopy
        let dest: string = "./patches";
        if (!fse.existsSync(dest)){
            fse.mkdirSync(dest);
        }
        let total: number = 1509;
        let patches: any = {};
        for (let i = 3; i < total; i++){
            if (i === 502 || i === 503){
                continue;
            }
            let buf1: Buffer = fse.readFileSync(path.join(v, i + ".bin"));
            let buf2: Buffer = fse.readFileSync(path.join(d, i + ".bin"));
            for (let j = 0; j < buf1.byteLength; j++){
                if (buf1[j] !== buf2[j]){
                    if (!patches.hasOwnProperty(i)){
                        patches[i] = new RomPatch(i);
                        console.log(i);
                    }
                    (patches[i] as RomPatch).data.push(new FilePatch(j, buf2[j]));
                }
            }
        }
        let rp: RomPatch[] = [];
        Object.keys(patches).forEach((key: string)=>{
            rp.push(patches[key]);
        });
        fse.writeFileSync(path.join(dest, "out.json"), JSON.stringify(rp, null, 2));
    }
}