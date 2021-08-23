import fs from 'fs';
import { Bone, UniversalAliasTable, ZobjPiece } from './UniversalAliasTable';
import { optimize } from 'Z64Lib/API/zzoptimize';
import { ZZPlayasEmbedParser } from 'Z64Lib/API/ZZPlayasEmbedParser';

function findHierarchy(buf: Buffer) {
    for (let i = 0; i < buf.byteLength; i += 4) {
        // Is this possibly an 06 pointer?
        if (buf.readUInt8(i) === 0x06) {
            let possible = buf.readUInt32BE(i) & 0x00FFFFFF;
            // Does the offset stay within the bounds of the file?
            if (possible <= buf.byteLength) {
                // If we take the next 4 bytes and subtract do we get 0xC or 0x10?
                let possible2 = buf.readUInt32BE(i - 0x4) & 0x00FFFFFF;
                let change = possible - possible2;
                if (change === 0xC || change === 0x10) {
                    // Traverse down until we hit something that doesn't start with 06.
                    let cur = buf.readUInt32BE(i) & 0xFF000000;
                    let pos = i;
                    while (cur === 0x06000000) {
                        pos += 4;
                        cur = buf.readUInt32BE(pos) & 0xFF000000;
                    }
                    pos -= 4;
                    // Hierarchy offset maybe?
                    let a1 = buf.readUInt8(pos + 1);
                    let a2 = buf.readUInt32BE(pos + 5);
                    let format = a2 <= a1 ? 1 : 0;
                    return { pos, change, format };
                }
            }
        }
    }
    return undefined;
}

enum HierarchyType {
    LINK = 0x10,
    NPC = 0xC
}

enum HierarchyFormat {
    NORMAL = 0,
    FLEX = 1
}

export function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** I Blame Poe for this function's existence. */
export function FrankenNPC(og: Buffer, parts: Buffer[], size: number = 0x5000) {
    let set: Set<number> = new Set<number>();
    console.log("Scanning zobj(s)...");
    let h = findHierarchy(og);
    console.log(`Skeleton type: ${HierarchyType[h!.change]}. Format: ${HierarchyFormat[h!.format]}. Offset: ${h!.pos.toString(16)}`);
    let bones = og.readUInt8(h!.pos + 0x4);
    let p = og.readUInt32BE(h!.pos + 0x0) & 0x00FFFFFF;
    let skeleton: Array<Bone> = [];
    let shuffles: Map<string, Array<Bone>> = new Map();
    for (let i = 0; i < bones; i++) {
        let p1 = og.readUInt32BE(p + (i * 4)) & 0x00FFFFFF;
        let unk1 = og.readUInt32BE(p1 + 0x0);
        let unk2 = og.readUInt32BE(p1 + 0x4);
        let dlist = og.readUInt32BE(p1 + 0x8) & 0x00FFFFFF;
        let bone = new Bone(`Limb ${i}`, p1 + 0x8, unk1, unk2, dlist);
        skeleton.push(bone);
        if (dlist > 0) {
            let op = optimize(og, [dlist]);
            bone.piece1 = new ZobjPiece(op.zobj, op.oldOffs2NewOffs.get(dlist)!);
            if (!shuffles.has(bone.name)) shuffles.set(bone.name, []);
            shuffles.get(bone.name)!.push(bone);
            set.add(dlist);
        }
    }
    for (let i = 0; i < parts.length; i++) {
        console.log(`Scanning shit ${i}`);
        let fuck = findHierarchy(parts[i]);
        console.log(fuck);
        let fucking_bones = parts[i].readUInt8(fuck!.pos + 0x4);
        let p = parts[i].readUInt32BE(fuck!.pos + 0x0) & 0x00FFFFFF;
        for (let j = 0; j < fucking_bones; j++) {
            let p1 = parts[i].readUInt32BE(p + (i * 4)) & 0x00FFFFFF;
            let unk1 = parts[i].readUInt32BE(p1 + 0x0);
            let unk2 = parts[i].readUInt32BE(p1 + 0x4);
            let dlist = parts[i].readUInt32BE(p1 + 0x8) & 0x00FFFFFF;
            let bone = new Bone(`Limb ${j}`, p1 + 0x8, unk1, unk2, dlist);
            if (dlist > 0){
                let op = optimize(parts[i], [dlist]);
                bone.piece1 = new ZobjPiece(op.zobj, op.oldOffs2NewOffs.get(dlist)!);
                if (!shuffles.has(bone.name)) shuffles.set(bone.name, []);
                shuffles.get(bone.name)!.push(bone);
            }
        }
    }
    console.log("Generating Proxy...");
    let u = new UniversalAliasTable();
    let scaffold = u.generateMinimizedScaffolding(skeleton.length, size);
    scaffold.sb.writeBuffer(og.slice(0x0, size), 0x0);
    let itr = Array.from(set);
    let mapping: any = {};
    let slot = size + 0x20;
    for (let i = 0; i < itr.length; i++) {
        for (let j = 0; j < skeleton.length; j++) {
            if (skeleton[j].dlist1 > 0) {
                if (skeleton[j].dlist1 === itr[i]) {
                    let sel = getRandomInt(0, shuffles.get(skeleton[j].name)!.length - 1);
                    let part = shuffles.get(skeleton[j].name)![sel];
                    let op = optimize(part.piece1.piece, [part.piece1.offset], scaffold.sb.writeOffset);
                    let offset = op.oldOffs2NewOffs.get(part.piece1.offset)!
                    scaffold.sb.writeBuffer(op.zobj);
                    scaffold.sb.writeUInt32BE(0x06000000 + offset, slot + 0x4);
                    mapping[skeleton[j].name] = { "object": itr[i], "proxy": slot };
                    slot += 0x8;
                    break;
                }
            }
        }
    }
    while (scaffold.sb.length % 0x10 !== 0) {
        scaffold.sb.writeUInt8(0xFF);
    }
    scaffold.sb.writeString("UNIVERSAL_ALIAS_TABLE_V1.0");
    while (scaffold.sb.length % 0x10 !== 0) {
        scaffold.sb.writeUInt8(0xFF);
    }
    fs.writeFileSync("./horror.zobj", scaffold.sb.toBuffer());
    return { zobj: scaffold.sb.toBuffer(), map: mapping };
}

export function ScanNPC(og: Buffer, replace: Buffer, size: number = 0x5000) {
    let set: Set<number> = new Set<number>();
    console.log("Scanning zobj...");
    let h = findHierarchy(og);
    console.log(`Skeleton type: ${HierarchyType[h!.change]}. Format: ${HierarchyFormat[h!.format]}. Offset: ${h!.pos.toString(16)}`);
    let bones = og.readUInt8(h!.pos + 0x4);
    let p = og.readUInt32BE(h!.pos + 0x0) & 0x00FFFFFF;
    let skeleton: Array<Bone> = [];
    for (let i = 0; i < bones; i++) {
        let p1 = og.readUInt32BE(p + (i * 4)) & 0x00FFFFFF;
        let unk1 = og.readUInt32BE(p1 + 0x0);
        let unk2 = og.readUInt32BE(p1 + 0x4);
        let dlist = og.readUInt32BE(p1 + 0x8) & 0x00FFFFFF;
        let bone = new Bone(`Limb ${i}`, p1 + 0x8, unk1, unk2, dlist);
        skeleton.push(bone);
        if (dlist > 0) {
            set.add(dlist);
        }
    }
    console.log("Generating Proxy...");
    let u = new UniversalAliasTable();
    let scaffold = u.generateMinimizedScaffolding(skeleton.length, size);
    scaffold.sb.writeBuffer(og.slice(0x0, size), 0x0);
    scaffold.sb.writeBuffer(replace.slice(0x0, size), 0x0);
    let itr = Array.from(set);
    let mapping: any = {};
    let slot = size + 0x20;
    let parse = new ZZPlayasEmbedParser().parse(replace);
    for (let i = 0; i < itr.length; i++) {
        for (let j = 0; j < skeleton.length; j++) {
            if (skeleton[j].dlist1 > 0) {
                if (skeleton[j].dlist1 === itr[i]) {
                    let op2 = optimize(replace, [parse[skeleton[j].name]], scaffold.sb.writeOffset);
                    let offset = op2.oldOffs2NewOffs.get(parse[skeleton[j].name])!
                    scaffold.sb.writeBuffer(op2.zobj);
                    scaffold.sb.writeUInt32BE(0x06000000 + offset, slot + 0x4);
                    mapping[skeleton[j].name] = { "object": itr[i], "proxy": slot };
                    slot += 0x8;
                    break;
                }
            }
        }
    }
    while (scaffold.sb.length % 0x10 !== 0) {
        scaffold.sb.writeUInt8(0xFF);
    }
    scaffold.sb.writeString("UNIVERSAL_ALIAS_TABLE_V1.0");
    while (scaffold.sb.length % 0x10 !== 0) {
        scaffold.sb.writeUInt8(0xFF);
    }
    return { zobj: scaffold.sb.toBuffer(), map: mapping };
}