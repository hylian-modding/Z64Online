import fs from 'fs';
import path from 'path';
import { optimize } from 'Z64Lib/API/zzoptimize';
import { SmartBuffer } from 'smart-buffer';
import { encode } from './assetencode';

function masks() {
    let sb = new SmartBuffer();
    sb.writeString("MODLOADER64");
    sb.writeUInt8(1);
    let l = fs.readdirSync("./test_files/mm/masks").length;
    while (l % 2 !== 0) {
        l++;
    }
    sb.writeUInt32BE(l);
    for (let i = 0; i < 0x10; i++) {
        sb.writeUInt8(0);
    }
    // First pass
    let fp = sb.writeOffset;
    for (let i = 0; i < l; i++) {
        sb.writeUInt32BE(0xDE010000);
        sb.writeUInt32BE(0xDEADBEEF);
    }
    let df = sb.writeOffset;
    sb.writeUInt32BE(0xDF000000);
    sb.writeUInt32BE(0x00000000);
    sb.writeOffset = fp;
    // Second pass.
    for (let i = 0; i < l; i++) {
        sb.writeUInt32BE(0xDE010000);
        sb.writeUInt32BE(0x06000000 + df);
    }
    let cur = fp + 0x4;
    let defines: Array<string> = [];
    fs.readdirSync("./test_files/mm/masks").forEach((n: string) => {
        let file = path.resolve("./test_files/mm/masks", n);
        let buf = fs.readFileSync(file);
        let offset = buf.readUInt32BE(buf.byteLength - 0x4);
        let op = optimize(buf, [offset], sb.length, 0x06, true);
        sb.writeUInt32BE(0x06000000 + op.oldOffs2NewOffs.get(offset)!, cur);
        sb.writeBuffer(op.zobj);
        defines.push(`export const ${path.parse(n.toUpperCase()).name}: number = 0x${(cur - 0x4 + 0x06000000).toString(16).toUpperCase().padStart(8, '0')};\n`);
        cur += 0x8;
    });
    while (sb.length % 0x10 !== 0) {
        sb.writeUInt8(0xFF);
    }
    fs.writeFileSync("./test_files/output/masks.zobj", sb.toBuffer());
    encode("./test_files/output/masks.zobj");
    let str = fs.readFileSync("./test_files/output/masks.ts").toString();
    str += "\n";
    for (let i = 0; i < defines.length; i++) {
        str += defines[i];
    }
    fs.writeFileSync("./test_files/output/masks.ts", str);
}

masks();

function forms() {
    let forms: Array<string> = [
        "./test_files/mm/forms/human.zobj",
        "./test_files/mm/forms/nuts.zobj",
        "./test_files/mm/forms/goron.zobj",
        "./test_files/mm/forms/zora.zobj",
        "./test_files/mm/forms/fd.zobj"
    ];
    for (let i = 0; i < forms.length; i++) {
        let n = path.join("./test_files/output", path.parse(forms[i]).base);
        fs.copyFileSync(forms[i], n);
        encode(n);
    }
}

forms();

function ages() {
    let ages: Array<string> = [
        "./test_files/oot/ages/adult.zobj",
        "./test_files/oot/ages/child.zobj"
    ];
    for (let i = 0; i < ages.length; i++) {
        let n = path.join("./test_files/output", path.parse(ages[i]).base);
        fs.copyFileSync(ages[i], n);
        encode(n);
    }
}

ages();

function equipment() {
    let gear: Array<string> = [
        "./test_files/oot/equipment/sheath3.zobj",
        "./test_files/mm/gear/bottle.zobj",
        "./test_files/mm/gear/stick.zobj",
        "./test_files/mm/gear/swords.zobj"
    ];
    for (let i = 0; i < gear.length; i++) {
        let n = path.join("./test_files/output", path.parse(gear[i]).base);
        fs.copyFileSync(gear[i], n);
        encode(n);
    }
}

equipment();

function cleanup() {
    fs.readdirSync("./test_files/output").forEach((f: string) => {
        let file = path.join("./test_files/output", f);
        if (path.parse(file).ext === ".zobj") {
            fs.unlinkSync(file);
        }
    });
}

cleanup();