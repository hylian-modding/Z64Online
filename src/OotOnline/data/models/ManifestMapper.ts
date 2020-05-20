import fse from 'fs-extra';
import path from 'path';
import { toPaddedHexString } from './zzstatic/src/data/toPaddedHexString';

export class ManifestMapper {
    map(file: string) {
        let lines: string[] = fse.readFileSync(path.join(__dirname, file)).toString().split("\n");
        let start_line: number = 0;
        let end_line: number = 0;
        let start_txt: string = "OBJECT POOL";
        let end_txt: string = "END";
        for (let i = 0; i < lines.length; i++) {
            console.log(lines[i]);
            if (lines[i].indexOf(start_txt) > -1) {
                start_line = i;
                continue;
            }
            if (lines[i].indexOf(end_txt) > -1 && start_line > 0) {
                end_line = i;
                break;
            }
        }
        let ignore: string[] = ["LUT_ZZ_MODLOADER", "MATRIX_SWORD_BACK", "MATRIX_SHIELD_BACK", "MATRIX_ITEM_SHIELD"];
        //let offset: number = 0x50d0;
        let offset: number = 0x5090;
        let def: string = "";
        let curSize: number = 0;
        let curMark: string = "";
        let descriminator: string = path.parse(file).name.replace("-", "_").toUpperCase();
        console.log(start_line);
        console.log(end_line);
        for (let i = start_line; i < end_line; i++) {
            let ig: boolean = false;
            for (let j = 0; j < ignore.length; j++) {
                if (lines[i].indexOf(ignore[j]) > -1 && lines[i].indexOf(":") > -1) {
                    ig = true;
                }
            }
            if (ig) {
                continue;
            }
            if (lines[i].indexOf(":") > -1) {
                if (curMark !== "") {
                    def += "#define " + curMark + " " + "0x" + (offset).toString(16).toUpperCase() + "\r\n";
                }
                offset += curSize;
                curSize = 0;
                curMark = descriminator + "_" + lines[i].split(":")[0].trim();
                continue;
            } else {
                if (lines[i].trim() === "") {
                    continue;
                }
                if (curMark === "") {
                    continue;
                }
                curSize += 0x8;
            }
        }
        def += "#define " + curMark + " " + "0x" + (offset).toString(16).toUpperCase() + "\r\n";
        console.log(def);
    }
}

export class ZZPlayasEmbedParser{

    private h: Buffer = Buffer.from("!PlayAsManifest0");

    constructor(){}

    parse(buf: Buffer){
        console.log("Parsing embedded playas data...");
        let head: number = buf.indexOf(this.h) + this.h.byteLength;
        let map: any = {};
        let entries: number = buf.readUInt16BE(head);
        head+=2;
        let ascii_convert: Buffer = Buffer.alloc(1);
        for (let i = 0; i < entries; i++){
            let str: string = "";
            let cur: number = buf.readUInt8(head);
            // Start seeking for the end of the ascii.
            while (cur !== 0){
                ascii_convert[0] = cur;
                str+=ascii_convert.toString();
                head++;
                cur = buf.readUInt8(head);
            }
            head++;
            let offset = buf.readUInt32BE(head);
            buf.writeUInt32BE(offset + 0x800, head);
            head+=4;
            map[str] = offset + 0x800;
        }
        console.log("Converting to Equipment pak format...");
        let mapping = "";
        Object.keys(map).forEach((key: string)=>{
            mapping+=toPaddedHexString(map[key], 8) + " : " + key + "\n";
        });
        return mapping;
    }

}