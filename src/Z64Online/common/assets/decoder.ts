import crypto from 'crypto';
import { SmartBuffer } from 'smart-buffer';
import zlib from 'zlib';

export function decodeAsset(buf: Buffer, entropy: Buffer) {
    let inp_b = new SmartBuffer().writeBuffer(zlib.inflateSync(buf));
    let count = inp_b.readUInt32BE(0xC);
    inp_b.readOffset = 0x10;
    let decodeHashes: Array<string> = [];
    let stack: Array<string> = [];
    for (let i = 0; i < count; i++) {
        let b = inp_b.readBuffer(0x10);
        decodeHashes.push(b.toString('hex'));
        stack.push(b.toString('hex'));
    }
    let mapSet: Map<string, number> = new Map();
    for (let i = 0; i < entropy.byteLength; i++) {
        if (stack.length === 0) break;
        let b = entropy.slice(i, i + 1);
        let hash = crypto.createHash('md5').update(b).digest('hex');
        let index = stack.indexOf(hash);
        if (index > -1){
            stack.splice(index, 1);
        }
        mapSet.set(hash, i);
    }
    let out = new SmartBuffer();
    while (inp_b.remaining() > 0) {
        let index = inp_b.readUInt8();
        let value = entropy.slice(mapSet.get(decodeHashes[index])!, mapSet.get(decodeHashes[index])! + 1).readUInt8(0);
        out.writeUInt8(value);
    }
    return out.toBuffer();
}