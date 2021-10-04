import gulp from 'gulp'
import fs from 'fs-extra'
import child_process from 'child_process'
import fse from 'fs-extra'
import path from 'path'
import zip from 'adm-zip'
import crypto from 'crypto'
var recursive = require('recursive-readdir')
import { optimize } from 'Z64Lib/API/zzoptimize';
import { SmartBuffer } from 'smart-buffer';
import zlib from 'zlib';
import { serialize } from './src/Z64Online/node_modules/bson';

class BPS {
    constructor() { }

    applyBps(rom: any, patch: Uint8Array) {
        function crc32(bytes: Uint8Array) {
            let c;
            let crcTable: number[] = [];
            for (let n = 0; n < 256; n++) {
                c = n;
                for (let k = 0; k < 8; k++) {
                    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
                }
                crcTable[n] = c;
            }

            let crc = 0 ^ -1;
            for (let i = 0; i < bytes.length; i++) {
                crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xff];
            }
            return (crc ^ -1) >>> 0;
        }

        let patchpos = 0;
        function u8() {
            return patch[patchpos++];
        }
        function u32at(pos: number) {
            return (
                ((patch[pos + 0] << 0) |
                    (patch[pos + 1] << 8) |
                    (patch[pos + 2] << 16) |
                    (patch[pos + 3] << 24)) >>>
                0
            );
        }

        function decode() {
            let ret = 0;
            let sh = 0;
            // eslint-disable-next-line no-constant-condition
            while (true) {
                let next = u8();
                ret += (next ^ 0x80) << sh;
                if (next & 0x80) return ret;
                sh += 7;
            }
        }

        function decodes() {
            let enc = decode();
            let ret = enc >> 1;
            if (enc & 1) ret = -ret;
            return ret;
        }

        if (u8() != 0x42 || u8() != 0x50 || u8() != 0x53 || u8() != 0x31) {
            throw new Error('not a BPS patch');
        }
        if (decode() != rom.length) throw new Error('wrong input file');
        if (crc32(rom) != u32at(patch.length - 12)) {
            throw new Error('wrong input file');
        }

        let out = new Uint8Array(decode());
        let outpos = 0;

        let metalen = decode();
        patchpos += metalen; // can't join these two, JS reads patchpos before calling decode

        let SourceRead = 0;
        let TargetRead = 1;
        let SourceCopy = 2;
        let TargetCopy = 3;

        let inreadpos = 0;
        let outreadpos = 0;

        while (patchpos < patch.length - 12) {
            let thisinstr = decode();
            let len = (thisinstr >> 2) + 1;
            let action = thisinstr & 3;

            switch (action) {
                case SourceRead:
                    {
                        for (let i = 0; i < len; i++) {
                            out[outpos] = rom[outpos];
                            outpos++;
                        }
                    }
                    break;
                case TargetRead:
                    {
                        for (let i = 0; i < len; i++) {
                            out[outpos++] = u8();
                        }
                    }
                    break;
                case SourceCopy:
                    {
                        inreadpos += decodes();
                        for (let i = 0; i < len; i++) out[outpos++] = rom[inreadpos++];
                    }
                    break;
                case TargetCopy:
                    {
                        outreadpos += decodes();
                        for (let i = 0; i < len; i++) out[outpos++] = out[outreadpos++];
                    }
                    break;
            }
        }

        return out;
    }

    handleBps(rom: any, patch: any) {
        let ret;
        try {
            ret = this.applyBps(
                new Uint8Array(rom.bytes),
                new Uint8Array(patch.bytes)
            );
        } catch (e) {
            if (e === 'wrong input file') {
                // maybe a headered rom? skip first 512 bytes for patching
                ret = this.applyBps(
                    new Uint8Array(rom.bytes, 512),
                    new Uint8Array(patch.bytes)
                );
                // if we reached here, there were no errors, so the assumption about a headered rom was correct.
                // now re-add the 512 bytes from the original ROM to the patched one
                let tmpbuf = new Uint8Array(ret.length + 512); // create buffer large enough for rom and header
                tmpbuf.set(new Uint8Array(rom.bytes, 512)); // copy header
                tmpbuf.set(ret, 512); // copy rom data
                ret = tmpbuf;
            } else {
                throw e;
            }
        }
        return Buffer.from(ret);
    }

    tryPatch(rom: Buffer, bps: Buffer) {
        let bpsdata;
        let romdata;
        romdata = { bytes: rom, name: '', mime: 'bps' };
        bpsdata = { bytes: bps, name: bps, mime: 'bps' };
        if (romdata && bpsdata) {
            return this.handleBps(romdata, bpsdata);
        }
        return Buffer.alloc(1);

    }
}

// Copied from ML core. Needed for the packing process.
export class MonkeyPatch_Stringify {
    original: any
    replacement: any

    patch() {
        const BJSON = require('buffer-json')
        this.original = JSON.stringify
        this.replacement = (
            value: any,
            replacer?: (this: any, key: string, value: any) => any,
            space?: string | number
        ) => {
            if (replacer === undefined) {
                return this.original(value, BJSON.replacer, space)
            }
            return this.original(value, replacer, space)
        }
            ; (JSON as any)['stringify'] = this.replacement as Function
    }

    unpatch() {
        ; (JSON as any)['stringify'] = this.original as Function
    }
}

const mp = new MonkeyPatch_Stringify()
mp.patch()

function pad(buf: Buffer) {
    let size = buf.byteLength
    while (size % 0x10 !== 0) {
        size++
    }
    let b = Buffer.alloc(size)
    buf.copy(b)
    return b
}

gulp.task('postinstall', function () {
    return gulp.src('./src')
})

gulp.task('build', function () {
    try {
        let meta = JSON.parse(fs.readFileSync("./src/Z64Online/package.json").toString());
        meta.date = new Date().toUTCString();
        meta.commit = child_process.execSync("git rev-parse --short HEAD").toString().replace("\n", "");
        meta.version = meta.version.split("-")[0];
        meta.version = meta.version + `-nightly@${meta.commit}`;
        fs.writeFileSync("./src/Z64Online/package.json", JSON.stringify(meta, null, 2));
        child_process.execSync('npx tsc');
    } catch (err: any) {
        console.log(err.stack);
    }
    return gulp.src('./src/**/*.ts')
})

gulp.task('_build_production', function () {
    //console.log("enforcing style")
    //child_process.execSync(`npx prettier --write "**/*.ts"`)
    var uprocess = require('uprocess')
    var defines = {
    }
    let back: Map<string, Buffer> = new Map<string, Buffer>()
    recursive('./src', function (err: any, files: any) {
        for (let i = 0; i < files.length; i++) {
            files[i] = path.resolve(`./${files[i]}`)
            if (path.parse(files[i]).ext !== '.ts') {
                continue
            }
            back.set(files[i], fs.readFileSync(files[i]))
            fs.writeFileSync(files[i], uprocess.processFile(files[i], defines))
        }
        console.log('compiling')
        try {
            let meta = JSON.parse(fs.readFileSync("./src/Z64Online/package.json").toString());
            meta.date = new Date().toUTCString();
            fs.writeFileSync("./src/Z64Online/package.json", JSON.stringify(meta, null, 2));
            child_process.execSync('npx tsc')
        } catch (err: any) {
            console.log(err.stack);
        }
        fse.copySync("./src", "./build/src")
        console.log('restoring')
        back.forEach((file: Buffer, name: string) => {
            fs.writeFileSync(name, file)
        })
    })
    return gulp.src('./src/**/*.ts')
})

gulp.task('clean_up_crap', function () {
    let trash: string[] = ['.ts', '.map', '.lock'];
    recursive('./build', function (err: any, files: any) {
        for (let i = 0; i < files.length; i++) {
            files[i] = path.resolve(`./${files[i]}`)
            if (trash.indexOf(path.parse(files[i]).ext) > -1) {
                fs.removeSync(files[i]);
            }
        }
    })
    return gulp.src('./src/**/*.ts')
});

gulp.task('crush', function () {
    recursive('./build', function (err: any, files: any) {
        for (let i = 0; i < files.length; i++) {
            files[i] = path.resolve(`./${files[i]}`)
            if (path.parse(files[i]).ext !== ".js") continue;
            if (files[i].indexOf("node_modules") > -1) continue;
            try {
                fs.writeFileSync(files[i], child_process.execSync(`minify \"${files[i]}\"`).toString());
            } catch (err: any) {
                console.log("Failed to minify " + files[i]);
            }
            let lzma: any = require("lzma");
            let data = Buffer.from(lzma.compress(fs.readFileSync(files[i])));
            fs.writeFileSync(path.resolve(path.parse(files[i]).dir, path.parse(files[i]).name + ".mlz"), data.toString('base64'));
            fs.removeSync(files[i]);
        }
    })
    return gulp.src('./src/**/*.ts')
});

gulp.task("build_production", gulp.series(['_build_production', 'clean_up_crap', 'crush', 'postinstall']))

gulp.task('packassets', function () {
    let c = path.resolve('./cache/Z64O_Assets.content')
    let c2 = path.resolve(
        `./dist/Z64O_Assets_${Date.now().toString(16).toUpperCase()}.content`
    )

    if (fse.existsSync(c)) {
        fse.unlinkSync(c)
    }

    let og = process.cwd()
    let zipFile: zip = new zip()
    process.chdir('./OcarinaofTimeOnline-HolidayAssets')
    zipFile.addLocalFolder('./Rewards', '')
    process.chdir(og)

    const private_key = fse.readFileSync('./OotO.pem', 'utf-8')
    //File to be signed
    let _file = pad(zipFile.toBuffer()).swap32()
    //Signing
    const signer = crypto.createSign('sha256')
    signer.update(_file)
    signer.end()
    const signature = signer.sign(private_key)

    let data: any = { data: _file, sig: signature }
    fse.writeFileSync(c, zlib.deflateSync(serialize(data)));
    fse.writeFileSync(c2, zlib.deflateSync(serialize(data)));
    return gulp.src('.')
});

export function encode(input: string) {
    let str: string = "export const " + path.parse(input).name.split(" ").join("_").split("-").join("_") + ": Buffer = Buffer.from(\"";
    let buf: Buffer = fs.readFileSync(input);
    let hashes: Set<string> = new Set();
    console.log("Calculating hashes...");
    for (let i = 0; i < buf.byteLength; i++) {
        let b = buf.slice(i, i + 1);
        let hash = crypto.createHash('md5').update(b).digest('hex');
        if (!hashes.has(hash)) {
            hashes.add(hash);
        }
    }
    let a = Array.from(hashes);
    console.log(`Processing ${a.length} buffers...`);
    let bufs: Array<Buffer> = [];
    for (let i = 0; i < a.length; i++) {
        let b = Buffer.from(a[i], 'hex');
        bufs.push(b);
    }
    let sb = new SmartBuffer();
    sb.writeString("MODLOADER64");
    sb.writeUInt8(1);
    sb.writeUInt32BE(bufs.length);
    let map: Map<string, number> = new Map();
    console.log("Creating map...");
    for (let i = 0; i < bufs.length; i++) {
        sb.writeBuffer(bufs[i]);
        map.set(bufs[i].toString('hex'), i);
    }
    console.log("Encoding...");
    for (let i = 0; i < buf.byteLength; i++) {
        let b = buf.slice(i, i + 1);
        let hash = crypto.createHash('md5').update(b).digest('hex');
        let index = map.get(hash)!;
        sb.writeUInt8(index);
    }
    str += zlib.deflateSync(sb.toBuffer()).toString('base64');
    str += "\", 'base64');\n";
    fs.writeFileSync(path.resolve(path.parse(input).dir, path.parse(input).name.split(" ").join("_").split("-").join("_") + ".ts"), str);
}

gulp.task('setup', function () {
    let og = process.cwd();
    if (!fs.existsSync("./decomp")) {
        fs.mkdirSync("./decomp");
    }
    if (!fs.existsSync("./decomp/oot")) {
        console.log("Setting up OOT Decomp...");
        child_process.execSync("git clone https://github.com/zeldaret/oot ./decomp/oot");
        fs.copyFileSync("./roms/oot.z64", "./decomp/oot/baserom_original.z64");
        process.chdir("./decomp/oot");
        child_process.execSync('make setup');
        process.chdir(og);
    }
    if (!fs.existsSync("./decomp/mm")) {
        console.log("Setting up MM Decomp...");
        child_process.execSync("git clone https://github.com/zeldaret/mm ./decomp/mm");
        fs.copyFileSync("./roms/mm.z64", "./decomp/mm/baserom.mm.us.rev1.z64");
        process.chdir("./decomp/mm");
        child_process.execSync('make init');
        process.chdir(og);
    }
    let bps = new BPS();
    if (!fs.existsSync("./objects")) {
        fs.mkdirSync("./objects");
    }
    if (!fs.existsSync("./objects/oot")) {
        fs.mkdirSync("./objects/oot");
    }
    if (!fs.existsSync("./objects/oot/ages")) {
        fs.mkdirSync("./objects/oot/ages");
    }
    console.log("Generating age zobjs...");
    fs.writeFileSync("./objects/oot/ages/object_link_boy.zobj", bps.applyBps(fs.readFileSync("./decomp/oot/baserom/object_link_boy"), fs.readFileSync("./patches/oot/object_link_boy.bps")));
    fs.writeFileSync("./objects/oot/ages/object_link_child.zobj", bps.applyBps(fs.readFileSync("./decomp/oot/baserom/object_link_child"), fs.readFileSync("./patches/oot/object_link_child.bps")));
    if (!fs.existsSync("./objects/mm")) {
        fs.mkdirSync("./objects/mm");
    }
    if (!fs.existsSync("./objects/mm/forms")) {
        fs.mkdirSync("./objects/mm/forms");
    }
    console.log("Generating form zobjs...");
    fs.writeFileSync("./objects/mm/forms/object_link_human.zobj", bps.applyBps(fs.readFileSync("./decomp/mm/baserom/object_link_child"), fs.readFileSync("./patches/mm/object_link_child.bps")));
    fs.writeFileSync("./objects/mm/forms/object_link_nuts.zobj", bps.applyBps(fs.readFileSync("./decomp/mm/baserom/object_link_nuts"), fs.readFileSync("./patches/mm/object_link_nuts.bps")));
    fs.writeFileSync("./objects/mm/forms/object_link_goron.zobj", bps.applyBps(fs.readFileSync("./decomp/mm/baserom/object_link_goron"), fs.readFileSync("./patches/mm/object_link_goron.bps")));
    fs.writeFileSync("./objects/mm/forms/object_link_zora.zobj", bps.applyBps(fs.readFileSync("./decomp/mm/baserom/object_link_zora"), fs.readFileSync("./patches/mm/object_link_zora.bps")));
    fs.writeFileSync("./objects/mm/forms/object_link_deity.zobj", bps.applyBps(fs.readFileSync("./decomp/mm/baserom/object_link_boy"), fs.readFileSync("./patches/mm/object_link_boy.bps")));

    fs.readdirSync("./objects/oot/ages").forEach((f: string) => {
        let file = path.resolve("./objects/oot/ages", f);
        encode(file);
    });

    fs.readdirSync("./objects/mm/forms").forEach((f: string) => {
        let file = path.resolve("./objects/mm/forms", f);
        encode(file);
    });

    let jpatch = (src: string, dest: string, patch: string | { offset: string, segment: string, name?: string }) => {
        let jp: any;
        if (typeof (patch) === 'string') {
            jp = JSON.parse(fs.readFileSync(patch).toString());
        } else {
            jp = patch;
        }
        if (Array.isArray(jp)) {
            for (let i = 0; i < jp.length; i++) {
                jpatch(src, dest, jp[i]);
            }
        } else {
            let buf = fs.readFileSync(src);
            let op = optimize(buf, [parseInt(jp.offset)], 0x0, parseInt(jp.segment), true);
            let offset = op.oldOffs2NewOffs.get(parseInt(jp.offset))!;
            let sb = new SmartBuffer();
            sb.writeBuffer(op.zobj);
            while (sb.length % 0x10 !== 0) {
                sb.writeUInt8(0xFF);
            }
            sb.writeUInt8(0xFF);
            while (sb.length % 0x10 !== 0) {
                sb.writeUInt8(0xFF);
            }
            sb.writeOffset = sb.length - 0x4;
            sb.writeUInt32BE(0x06000000 + offset);
            let name = path.parse(dest).name + "_0x" + jp.offset.toString(16) + ".zobj";
            if (jp.hasOwnProperty("name")) {
                name = `${jp.name}.zobj`;
            }
            fs.writeFileSync(`${path.resolve(path.parse(dest).dir, name)}`, sb.toBuffer());
        }
    }

    let mergeBranches = (src: string)=>{
        let buf = fs.readFileSync(src);
        let offsets: Array<number> = [];
        for (let i = 0; i < buf.byteLength; i+=8){
            if (i + 0x4 > buf.byteLength) continue;
            if (buf.readUInt32BE(i) === 0xDE000000){
                offsets.push(buf.readUInt32BE(i + 0x4) & 0x00FFFFFF);
            }
        }
        let op = optimize(buf, offsets, 0, 0x06, true);
        let top = op.oldOffs2NewOffs.get(offsets[offsets.length - 1])!;
        let dfs: Array<number> = [];
        for (let i = 0; i < op.zobj.byteLength; i+=0x8){
            if (op.zobj.readUInt32BE(i) === 0xDF000000){
                dfs.push(i);
            }
        }
        while (dfs.length > 1){
            let offset = dfs.shift();
            op.zobj.writeUInt32BE(0, offset);
        }
        let sb = new SmartBuffer();
        sb.writeBuffer(op.zobj);
        while (sb.length % 0x10 !== 0) {
            sb.writeUInt8(0xFF);
        }
        sb.writeUInt8(0xFF);
        while (sb.length % 0x10 !== 0) {
            sb.writeUInt8(0xFF);
        }
        sb.writeOffset = sb.length - 0x4;
        sb.writeUInt32BE(0x06000000 + top);
        fs.writeFileSync(src, sb.toBuffer());
    }

    let pdir = (dir: string, out: string) => {
        if (!fs.existsSync(out)) {
            fs.mkdirSync(out);
        }
        fs.readdirSync(dir).forEach((f: string) => {
            let file = path.resolve(dir, f);
            let parse = path.parse(file);
            if (parse.ext === ".json") {
                let src = path.resolve(`./decomp/mm/baserom/${parse.name}`);
                let dest = path.resolve(`${out}/${parse.name}.zobj`);
                jpatch(src, dest, file);
            }
        });
        mergeBranches("./objects/mm/gear/object_blade_1.zobj");
        mergeBranches("./objects/mm/gear/object_blade_2.zobj");
        mergeBranches("./objects/mm/gear/object_hilt_2.zobj");
        // Combine.
        let count = 0;
        fs.readdirSync(out).forEach((n: string) => {
            if (path.parse(n).ext === ".ts") {
                return;
            }
            count++;
        });
        let sb = new SmartBuffer();
        sb.writeString("MODLOADER64");
        sb.writeUInt8(1);
        while (count % 2 !== 0) {
            count++;
        }
        sb.writeUInt32BE(count);
        for (let i = 0; i < 0x10; i++) {
            sb.writeUInt8(0);
        }
        // First pass
        let fp = sb.writeOffset;
        for (let i = 0; i < count; i++) {
            sb.writeUInt32BE(0xDE010000);
            sb.writeUInt32BE(0xDEADBEEF);
        }
        let df = sb.writeOffset;
        sb.writeUInt32BE(0xDF000000);
        sb.writeUInt32BE(0x00000000);
        sb.writeOffset = fp;
        // Second pass.
        for (let i = 0; i < count; i++) {
            sb.writeUInt32BE(0xDE010000);
            sb.writeUInt32BE(0x06000000 + df);
        }
        let cur = fp + 0x4;
        sb.writeOffset = sb.length;
        let defines: Array<string> = [];
        fs.readdirSync(out).forEach((n: string) => {
            if (path.parse(n).ext === ".ts") {
                return;
            }
            let file = path.resolve(out, n);
            let buf = fs.readFileSync(file);
            let offset = buf.readUInt32BE(buf.byteLength - 0x4);
            let op = optimize(buf, [offset & 0x00FFFFFF], sb.length, 0x06, true);
            sb.writeUInt32BE(0x06000000 + op.oldOffs2NewOffs.get(offset & 0x00FFFFFF)!, cur);
            sb.writeBuffer(op.zobj);
            defines.push(`export const ${path.parse(n).name.toUpperCase()}: number = 0x${(cur - 0x4 + 0x06000000).toString(16).toUpperCase().padStart(8, '0')};\n`);
            cur += 0x8;
        });
        while (sb.length % 0x10 !== 0) {
            sb.writeUInt8(0xFF);
        }
        let o = path.resolve(out, path.parse(out).name + ".bin");
        fs.writeFileSync(o, sb.toBuffer());
        encode(o);
        let t = path.resolve(path.parse(o).dir, path.parse(o).name + ".ts");
        let str = fs.readFileSync(t).toString();
        str += "\n";
        for (let i = 0; i < defines.length; i++) {
            str += defines[i];
        }
        fs.writeFileSync(t, str);
        fs.unlinkSync(o);
    };

    console.log("Generating mask zobjs...");
    pdir("./patches/mm/gear", "./objects/mm/gear");
    return gulp.src('.')
});

gulp.task('generate_update_file', function(){
    try {
        let meta = JSON.parse(fs.readFileSync("./src/Z64Online/package.json").toString());
        fs.writeFileSync("./dist/update.json", JSON.stringify({
            version: meta.version,
            url: "https://repo.modloader64.com/mods/Z64O/dev/Z64Online.pak"
        }, null, 2));
    } catch (err: any) {
        console.log(err.stack);
    }
    return gulp.src('./src/**/*.ts')
});

gulp.task('remove_nightly_flag', function(){
    try {
        let meta = JSON.parse(fs.readFileSync("./src/Z64Online/package.json").toString());
        meta.date = "";
        meta.commit = "";
        meta.version = meta.version.split("-")[0];
        fs.writeFileSync("./src/Z64Online/package.json", JSON.stringify(meta, null, 2));
    } catch (err: any) {
        console.log(err.stack);
    }
    return gulp.src('./src/**/*.ts')
});

gulp.task('default', gulp.series(['build', 'postinstall']))
