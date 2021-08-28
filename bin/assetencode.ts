#!/usr/bin/env node

import program from 'commander';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SmartBuffer } from 'smart-buffer';
import zlib from 'zlib';

program.option('-i, --input <file>', 'input file');
program.parse(process.argv);

if (program.input) {
    encode(program.input);
}

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