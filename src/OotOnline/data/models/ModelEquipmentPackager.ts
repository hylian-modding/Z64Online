import fse from 'fs-extra';
import path from 'path';

export class ModelEquipmentPackager {
    file: string;
    txt: string;

    constructor(file: string, txt: string) {
        this.file = file;
        this.txt = txt;
    }

    process(): Buffer {
        let lines: string[] = fse.readFileSync(this.txt).toString().split("\n");
        let offsets: Array<AliasEntry> = [];

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].indexOf("Base Offset") > -1) {
                continue;
            }
            if (lines[i].indexOf(":") === -1) {
                continue;
            }
            let s: string = "0x" + lines[i].split(":")[0].trim();
            let a: number = parseInt(s) + 0x06000000;
            offsets.push(new AliasEntry(a, lines[i].split(":")[1].trim()));
        }

        let curPos = 0x14;

        let buf: Buffer = fse.readFileSync(this.file);
        fse.readFileSync(path.join(__dirname, "lut.bin")).copy(buf);

        let map: any = {};

        for (let i = 0; i < offsets.length; i++) {
            buf.writeUInt32BE(offsets[i].offset, curPos);
            //console.log(offsets[i].name + " = " + (curPos - 0x4).toString(16));
            map[offsets[i].name] = (curPos - 0x4);
            curPos += 0x8;
        }

        curPos = 0x310;

        let footer: Buffer = Buffer.from(JSON.stringify(map));
        footer.copy(buf, curPos);
        buf.writeUInt32BE(footer.byteLength, 0xC);
        return buf;
    }
}

class AliasEntry {
    offset: number;
    name: string;

    constructor(offset: number, name: string) {
        this.offset = offset;
        this.name = name;
    }
}