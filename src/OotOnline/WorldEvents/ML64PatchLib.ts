import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import { SmartBuffer } from 'smart-buffer';

enum PatchCommands {
    NOT_ACTUALLY_A_COMMAND,
    COPY_LITERALLY_1_BYTE,
    COPY_u8,
    COPY_u16,
    COPY_u32,
    OVERWRITE_LITERALLY_1_BYTE,
    OVERWRITE_u8,
    OVERWRITE_u16,
    OVERWRITE_u32,
    COPY_OFFSET_u8,
    COPY_OFFSET_u16,
    COPY_OFFSET_u32,
    END = 0xFF
}

export class MLPatchLib {

    byteThrottle = 6;
    throttleLimit = 6;

    create(rom_name: string, og: Buffer, mod: Buffer): Buffer {

        let hash = (buf: Buffer) => {
            return crypto.createHash('md5').update(buf).digest('hex');
        }

        let cache: any = {};
        let cacheFlag: boolean = false;
        let cfile: string = "./" + path.parse(rom_name).name + ".json";
        if (fs.existsSync(cfile)) {
            cache = JSON.parse(fs.readFileSync(cfile).toString());
            cacheFlag = true;
        }

        let cur: number = 0;
        let per: number = -1;
        let lastFind = -1;
        let chunks: SmartBuffer = new SmartBuffer();
        let firstChunk = new SmartBuffer();
        firstChunk.writeString("MODLOADER64");
        firstChunk.writeUInt8(0);
        firstChunk.writeUInt32BE(0x10);
        while (cur < mod.byteLength) {
            let a = Math.floor((cur / mod.byteLength) * 100);
            if (a > per) {
                per = a;
                //fs.writeFileSync(cfile, JSON.stringify(cache));
                console.log(per + "% complete.");
            }
            let chunk = new SmartBuffer();;
            if (og[cur] !== mod[cur]) {
                // Different bytes.
                let p = new SmartBuffer();
                let length = 0;
                while (og[cur] !== mod[cur] && length < 0xFFFFFFFF) {
                    p.writeUInt8(mod[cur]);
                    length++;
                    cur++;
                    if (cur > mod.byteLength) {
                        break;
                    }
                }
                let data = p.toBuffer();
                if (length > this.byteThrottle) {
                    let find = -1;
                    let skip2ndPass: boolean = false;
                    if (lastFind < 0) {
                        lastFind = 0;
                        skip2ndPass = true;
                    }
                    let _hash = hash(data);
                    if (cache.hasOwnProperty(_hash)) {
                        find = cache[_hash];
                    } else {
                        find = og.indexOf(data, lastFind);
                        if (find === -1 && !skip2ndPass) {
                            find = og.slice(0, lastFind).indexOf(data);
                        }
                    }
                    lastFind = find;
                    this.generateCommand(length, find, cache, _hash, chunk, data);
                } else {
                    //console.log("Doing straight overwrite due to small length. (" + length + ")");
                    if (length === 1) {
                        chunk.writeUInt8(PatchCommands.OVERWRITE_LITERALLY_1_BYTE);
                        chunk.writeUInt8(data[0]);
                    } else if (length < 0xFF) {
                        chunk.writeUInt8(PatchCommands.OVERWRITE_u8);
                        chunk.writeUInt8(length);
                        chunk.writeBuffer(data);
                    } else if (length < 0xFFFF) {
                        chunk.writeUInt8(PatchCommands.OVERWRITE_u16);
                        chunk.writeUInt16BE(length);
                        chunk.writeBuffer(data);
                    } else {
                        chunk.writeUInt8(PatchCommands.OVERWRITE_u32);
                        chunk.writeUInt32BE(length);
                        chunk.writeBuffer(data);
                    }
                }
            } else {
                let length = 0;
                while (og[cur] === mod[cur] && length < 0xFFFF) {
                    length++;
                    cur++;
                    if (cur > mod.byteLength) {
                        break;
                    }
                }
                if (length === 1) {
                    chunk.writeUInt8(PatchCommands.COPY_LITERALLY_1_BYTE);
                } else if (length < 0xFF) {
                    chunk.writeUInt8(PatchCommands.COPY_u8);
                    chunk.writeUInt8(length);
                } else if (length < 0xFFFF) {
                    chunk.writeUInt8(PatchCommands.COPY_u16);
                    chunk.writeUInt16BE(length);
                } else {
                    chunk.writeUInt8(PatchCommands.COPY_u32);
                    chunk.writeUInt32BE(length);
                }
            }
            chunks.writeBuffer(chunk.toBuffer());
        }
        let lastChunk = new SmartBuffer();
        lastChunk.writeUInt8(PatchCommands.END);
        lastChunk.writeBuffer(Buffer.from(hash(mod)));
        chunks.writeBuffer(lastChunk.toBuffer());
        fs.writeFileSync(cfile, JSON.stringify(cache));
        let c = new SmartBuffer();
        Object.keys(cache).forEach((key: string) => {
            c.writeBuffer(Buffer.from(key, 'hex'));
            c.writeInt32BE(cache[key]);
        });
        fs.writeFileSync("./bcache.bin", c.toBuffer());
        let patch = new SmartBuffer();
        patch.writeBuffer(firstChunk.toBuffer());
        patch.writeBuffer(zlib.deflateSync(chunks.toBuffer()));
        return patch.toBuffer();
    }

    private generateCommand(length: number, find: number, cache: any, _hash: string, chunk: SmartBuffer, data: Buffer) {
        if (find === -1) {
            cache[_hash] = -1;
            //console.log("Doing straight overwrite with a length of " + length + ".");
            if (length === 1) {
                chunk.writeUInt8(PatchCommands.OVERWRITE_LITERALLY_1_BYTE);
                chunk.writeUInt8(data[0]);
            } else if (length < 0xFF) {
                chunk.writeUInt8(PatchCommands.OVERWRITE_u8);
                chunk.writeUInt8(length);
                chunk.writeBuffer(data);
            } else if (length < 0xFFFF) {
                chunk.writeUInt8(PatchCommands.OVERWRITE_u16);
                chunk.writeUInt16BE(length);
                chunk.writeBuffer(data);
            } else {
                chunk.writeUInt8(PatchCommands.OVERWRITE_u32);
                chunk.writeUInt32BE(length);
                chunk.writeBuffer(data);
            }
            if (this.byteThrottle < this.throttleLimit) {
                this.byteThrottle++
            }
        } else {
            //console.log("Doing offset copy with a length of " + length + ".");
            cache[_hash] = find;
            if (length < 0xFF) {
                chunk.writeUInt8(PatchCommands.COPY_OFFSET_u8);
                chunk.writeUInt8(length);
                chunk.writeUInt32BE(find);
            } else if (length < 0xFFFF) {
                chunk.writeUInt8(PatchCommands.COPY_OFFSET_u16);
                chunk.writeUInt16BE(length);
                chunk.writeUInt32BE(find);
            } else {
                chunk.writeUInt8(PatchCommands.COPY_OFFSET_u16);
                chunk.writeUInt32BE(length);
                chunk.writeUInt32BE(find);
            }
        }
    }

    apply(og: Buffer, patch: Buffer): Buffer {
        let _og = new SmartBuffer();
        _og.writeBuffer(og);
        let offsetInFile = patch.readUInt32BE(0xC);
        let __patch = zlib.inflateSync(patch.slice(offsetInFile));
        let _patch = new SmartBuffer();
        _patch.writeBuffer(__patch);
        let out = new SmartBuffer();
        while (_patch.remaining() > 0) {
            let byte = _patch.readUInt8();
            switch (byte) {
                case PatchCommands.COPY_LITERALLY_1_BYTE:
                    out.writeUInt8(_og.readUInt8());
                    break;
                case PatchCommands.COPY_u8:
                    let lengthfuck = _patch.readUInt8();
                    out.writeBuffer(_og.readBuffer(lengthfuck));
                    break;
                case PatchCommands.COPY_u16:
                    let length = _patch.readUInt16BE();
                    out.writeBuffer(_og.readBuffer(length));
                    break;
                case PatchCommands.COPY_u32:
                    out.writeBuffer(_og.readBuffer(_patch.readUInt32BE()));
                    break;
                case PatchCommands.OVERWRITE_u8:
                    let l4 = _patch.readUInt8();
                    out.writeBuffer(_patch.readBuffer(l4));
                    _og.readBuffer(l4);
                    break;
                case PatchCommands.OVERWRITE_u16:
                    let l5 = _patch.readUInt16BE();
                    out.writeBuffer(_patch.readBuffer(l5));
                    _og.readBuffer(l5);
                    break;
                case PatchCommands.OVERWRITE_u32:
                    let l6 = _patch.readUInt32BE();
                    out.writeBuffer(_patch.readBuffer(l6));
                    _og.readBuffer(l6);

                    break;
                case PatchCommands.OVERWRITE_LITERALLY_1_BYTE:
                    out.writeBuffer(_patch.readBuffer(1));
                    _og.readBuffer(1);
                    break;
                case PatchCommands.COPY_OFFSET_u8:
                    let l = _patch.readUInt8();
                    let o = _patch.readUInt32BE();
                    out.writeBuffer(og.slice(o, o + l));
                    _og.readBuffer(l);
                    break;
                case PatchCommands.COPY_OFFSET_u16:
                    let l2 = _patch.readUInt16BE();
                    let o2 = _patch.readUInt32BE();
                    out.writeBuffer(og.slice(o2, o2 + l2));
                    _og.readBuffer(l2);
                    break;
                case PatchCommands.COPY_OFFSET_u32:
                    let l3 = _patch.readUInt32BE();
                    let o3 = _patch.readUInt32BE();
                    out.writeBuffer(og.slice(o3, o3 + l3));
                    _og.readBuffer(l3);
                    break;
                case PatchCommands.END:
                    _patch.readBuffer(_patch.remaining());
                    break;
                default:
                    return og;

            }
        }
        return out.toBuffer();
    }
}