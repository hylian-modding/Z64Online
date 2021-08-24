import { SmartBuffer } from 'smart-buffer';
import { MatrixTranslate } from './MatrixTranslate';
import fs from 'fs';
import path from 'path';
import { IOptimized, optimize } from 'Z64Lib/API/zzoptimize';
import { ZZPlayasEmbedParser } from 'Z64Lib/API/ZZPlayasEmbedParser';
import crypto from 'crypto';
import { zzplayas_to_zzconvert } from 'Z64Lib/API/OOT/backwards_compat/zzplayas_to_zzconvert';
import { AgeOrForm } from '../types/Types';
import { Age } from 'modloader64_api/OOT/OOTAPI';

const OOT_ADULT_LINK: any = {
    "Cube": 0x000053C8,
    "Sheath": 0x000050C8,
    "FPS.Hookshot": 0x00005170,
    "Hilt.2": 0x000050E0,
    "Blade.2": 0x000050F8,
    "Hookshot.Spike": 0x00005158,
    "Hookshot": 0x00005148,
    "Fist.L": 0x000050A0,
    "Fist.R": 0x000050B8,
    "FPS.Forearm.L": 0x00005248,
    "FPS.Forearm.R": 0x00005168,
    "Gauntlet.Fist.L": 0x00005208,
    "Gauntlet.Fist.R": 0x00005220,
    "Gauntlet.Forearm.L": 0x000051F8,
    "Gauntlet.Forearm.R": 0x00005210,
    "Gauntlet.Hand.L": 0x00005200,
    "Gauntlet.Hand.R": 0x00005218,
    "Bottle.Hand.L": 0x000050A8,
    "FPS.Hand.L": 0x00005250,
    "FPS.Hand.R": 0x00005258,
    "Bow.String": 0x00005140,
    "Bow": 0x00005138,
    "Blade.3.Break": 0x000051E8,
    "Blade.3": 0x00005100,
    "Bottle": 0x00005120,
    "Broken.Blade.3": 0x000051E0,
    "Foot.2.L": 0x00005228,
    "Foot.2.R": 0x00005230,
    "Foot.3.L": 0x00005238,
    "Foot.3.R": 0x00005240,
    "Hammer": 0x000051F0,
    "Hilt.3": 0x000050E8,
    "Hookshot.Aiming.Reticule": 0x00005160,
    "Hookshot.Chain": 0x00005150,
    "Ocarina.2": 0x00005128,
    "Shield.2": 0x00005110,
    "Shield.3": 0x00005118,
    "Limb 1": 0x00005020,
    "Limb 3": 0x00005028,
    "Limb 4": 0x00005030,
    "Limb 5": 0x00005038,
    "Limb 6": 0x00005040,
    "Limb 7": 0x00005048,
    "Limb 8": 0x00005050,
    "Limb 10": 0x00005058,
    "Limb 11": 0x00005060,
    "Limb 12": 0x00005068,
    "Limb 13": 0x00005070,
    "Limb 14": 0x00005078,
    "Limb 15": 0x00005098,
    "Limb 16": 0x00005080,
    "Limb 17": 0x00005088,
    "Limb 18": 0x000050B0,
    "Limb 20": 0x00005090
};

const OOT_CHILD_LINK: any = {
    "Cube": 0x000053C8,
    "Limb 1": 0x00005020,
    "Limb 3": 0x00005028,
    "Limb 4": 0x00005030,
    "Limb 5": 0x00005038,
    "Limb 6": 0x00005040,
    "Limb 7": 0x00005048,
    "Limb 8": 0x00005050,
    "Limb 10": 0x00005058,
    "Limb 11": 0x00005060,
    "Limb 12": 0x00005068,
    "Limb 13": 0x00005070,
    "Limb 14": 0x00005078,
    "Limb 15": 0x00005098,
    "Limb 16": 0x00005080,
    "Limb 17": 0x00005088,
    "Limb 18": 0x000050B0,
    "Limb 20": 0x00005090,
    "Slingshot.String": 0x00005188,
    "Sheath": 0x000050C0,
    "Blade.2": 0x00005520,
    "Blade.1": 0x000050F0,
    "Boomerang": 0x00005178,
    "Fist.L": 0x000050A0,
    "Fist.R": 0x000050B8,
    "Hilt.1": 0x000050D8,
    "Shield.1": 0x00005108,
    "Slingshot": 0x00005180,
    "Ocarina.1": 0x00005190,
    "Bottle": 0x00005120,
    "Ocarina.2": 0x00005128,
    "Bottle.Hand.L": 0x000050A8,
    "GoronBracelet": 0x00005198,
    "Mask.Skull": 0x000051A0,
    "Mask.Spooky": 0x000051A8,
    "Mask.Gerudo": 0x000051D0,
    "Mask.Goron": 0x000051C0,
    "Mask.Keaton": 0x000051B0,
    "Mask.Truth": 0x000051B8,
    "Mask.Zora": 0x000051C8,
    "FPS.Forearm.R": 0x00005168,
    "DekuStick": 0x00005130,
    "Shield.2": 0x00005110
};

const MM_HUMAN_LINK: any = {
    "Cube": 0x000053C8,
    "Sheath.1": 0x000050C0,
    "Sheath.2": 0x000050C8,
    "Sheath.3": 0x000050D0,
    "Sword.4": 0x00005290,
    "FPS.Hookshot": 0x00005170,
    "Hilt.1": 0x000050D8, 
    "Hilt.2": 0x000050E0,
    "Blade.1": 0x000050F0,
    "Blade.2": 0x000050F8,
    "Hookshot.Spike": 0x00005158,
    "Hookshot": 0x00005148,
    "Fist.L": 0x000050A0,
    "Fist.R": 0x000050B8,
    "FPS.Forearm.R": 0x00005168,
    "Bottle.Hand.L": 0x000050A8,
    "Bow.String": 0x00005140,
    "Bow": 0x00005138,
    "Blade.3": 0x00005100,
    "Bottle": 0x00005120,
    "Bottle.Filling": 0x00005548,
    "Broken.Blade.3": 0x000051E0,
    "Hilt.3": 0x000050E8,
    "Hookshot.Aiming.Reticule": 0x00005160,
    "Hookshot.Chain": 0x00005150,
    "Ocarina": 0x00005128,
    "DekuStick": 0x00005130,
    "Shield.2": 0x00005110,
    "Shield.3.Face": 0x00005548,
    "Shield.3": 0x00005118,
    "Mask.Deku": 0x00005260,
    "Mask.Goron": 0x00005268,
    "Mask.Zora": 0x00005270,
    "Mask.Deity": 0x00005278,
    "Limb 1": 0x00005020,
    "Limb 3": 0x00005028,
    "Limb 4": 0x00005030,
    "Limb 5": 0x00005038,
    "Limb 6": 0x00005040,
    "Limb 7": 0x00005048,
    "Limb 8": 0x00005050,
    "Limb 10": 0x00005058,
    "Limb 11": 0x00005060,
    "Limb 12": 0x00005068,
    "Limb 13": 0x00005070,
    "Limb 14": 0x00005078,
    "Limb 15": 0x00005098,
    "Limb 16": 0x00005080,
    "Limb 17": 0x00005088,
    "Limb 18": 0x000050B0,
    "Limb 20": 0x00005090
};

const MM_DEKU_LINK: any = {
    "Cube": 0x000053C8,
    "Sheath": 0x000050C0,
    "Fist.L": 0x000050A0,
    "Fist.R": 0x000050B8,
    "Bottle.Hand.L": 0x000050A8,
    "Bottle": 0x00005120,
    "Bottle.Filling": 0x00005548,
    "Shield": 0x00005298,
    "Pipe.Mouth": 0x000052A0,
    "Pipe.Right": 0x000052A8,
    "Pipe.Up": 0x000052B0,
    "Pipe.Down": 0x000052B8,
    "Pipe.Left": 0x000052C0,
    "Pipe.A": 0x000052C8,
    "Flower.Stem.R": 0x000052D0,
    "Flower.Stem.L": 0x000052D8,
    "Flower.Petal": 0x000052E0,
    "Flower.Propeller.Closed": 0x000052E8,
    "Flower.Center.Closed": 0x000052F0,
    "Flower.Propeller.Open": 0x000052F8,
    "Flower.Center.Open": 0x00005300,
    "Pad.Wood": 0x00005308,
    "Pad.Grass": 0x00005310,
    "Pad.Open": 0x00005318,
    "Limb 1": 0x00005020,
    "Limb 3": 0x00005028,
    "Limb 4": 0x00005030,
    "Limb 5": 0x00005038,
    "Limb 6": 0x00005040,
    "Limb 7": 0x00005048,
    "Limb 8": 0x00005050,
    "Limb 10": 0x00005058,
    "Limb 11": 0x00005060,
    "Limb 12": 0x00005068,
    "Limb 13": 0x00005070,
    "Limb 14": 0x00005078,
    "Limb 15": 0x00005098,
    "Limb 16": 0x00005080,
    "Limb 17": 0x00005088,
    "Limb 18": 0x000050B0,
    "Limb 20": 0x00005090
};

const MM_GORON_LINK: any = {
    "Cube": 0x000053C8,
    "Sheath": 0x000050C0,
    "Fist.L": 0x000050A0,
    "Fist.R": 0x000050B8,
    "Bottle.Hand.L": 0x000050A8,
    "Bottle": 0x00005120,
    "Bottle.Filling": 0x00005548,
    "Shield": 0x00005298,
    "Drum.Strap": 0x00005330,
    "Drum.Up": 0x00005330,
    "Drum.Left": 0x00005338,
    "Drum.Right": 0x00005340,
    "Drum.Down": 0x00005348,
    "Drum.A": 0x00005350,
    "FirePunch": 0x00005320,
    "Limb 1": 0x00005020,
    "Limb 3": 0x00005028,
    "Limb 4": 0x00005030,
    "Limb 5": 0x00005038,
    "Limb 6": 0x00005040,
    "Limb 7": 0x00005048,
    "Limb 8": 0x00005050,
    "Limb 10": 0x00005058,
    "Limb 11": 0x00005060,
    "Limb 12": 0x00005068,
    "Limb 13": 0x00005070,
    "Limb 14": 0x00005078,
    "Limb 15": 0x00005098,
    "Limb 16": 0x00005080,
    "Limb 17": 0x00005088,
    "Limb 18": 0x000050B0,
    "Limb 20": 0x00005090
};

const MM_ZORA_LINK: any = {
    "Cube": 0x000053C8,
    "Sheath": 0x000053B0,
    "Fist.L": 0x000050A0,
    "Fist.R": 0x000050B8,
    "Bottle.Hand.L": 0x000050A8,
    "Bottle": 0x00005120,
    "Bottle.Filling": 0x00005548,
    "Shield": 0x00005298,
    "Fin.L": 0x00005388,
    "Fin.Swim.L": 0x00005398,
    "Fin.R": 0x00005398,
    "Fin.Swim.R": 0x000053A0,
    "Hand.Guitar.L": 0x000053A8,
    "Electricity": 0x000053B8,
    "Guitar": 0x00005540,
    "Limb 1": 0x00005020,
    "Limb 3": 0x00005028,
    "Limb 4": 0x00005030,
    "Limb 5": 0x00005038,
    "Limb 6": 0x00005040,
    "Limb 7": 0x00005048,
    "Limb 8": 0x00005050,
    "Limb 10": 0x00005058,
    "Limb 11": 0x00005060,
    "Limb 12": 0x00005068,
    "Limb 13": 0x00005070,
    "Limb 14": 0x00005078,
    "Limb 15": 0x00005098,
    "Limb 16": 0x00005080,
    "Limb 17": 0x00005088,
    "Limb 18": 0x000050B0,
    "Limb 20": 0x00005090
};

const MM_DEITY_LINK: any = {
    "Cube": 0x000053C8,
    "Sheath": 0x000053B0,
    "Fist.L": 0x000050A0,
    "Fist.R": 0x000050B8,
    "Bottle.Hand.L": 0x000050A8,
    "Bottle": 0x00005120,
    "Bottle.Filling": 0x00005548,
    "Sword": 0x000053C0,
    "Limb 1": 0x00005020,
    "Limb 3": 0x00005028,
    "Limb 4": 0x00005030,
    "Limb 5": 0x00005038,
    "Limb 6": 0x00005040,
    "Limb 7": 0x00005048,
    "Limb 8": 0x00005050,
    "Limb 10": 0x00005058,
    "Limb 11": 0x00005060,
    "Limb 12": 0x00005068,
    "Limb 13": 0x00005070,
    "Limb 14": 0x00005078,
    "Limb 15": 0x00005098,
    "Limb 16": 0x00005080,
    "Limb 17": 0x00005088,
    "Limb 18": 0x000050B0,
    "Limb 20": 0x00005090
};

const TABLE_SIZE: number = 256;
const MAX_BONE_SIZE: number = 0xFF;
const PAD_VALUE: number = 0xFF;

export class ZobjPiece {
    piece: Buffer;
    hash: string;
    offset: number;
    newOffset: number = -1;

    constructor(piece: Buffer, offset: number) {
        this.piece = piece;
        this.offset = offset;
        this.hash = crypto.createHash('md5').update(this.piece).digest('hex');
    }
}

export class Bone {
    name: string;
    pointer: number;
    unk1: number;
    unk2: number;
    dlist1: number;
    piece1!: ZobjPiece;

    constructor(name: string, pointer: number, unk1: number, unk2: number, dlist1: number) {
        this.name = name;
        this.pointer = pointer;
        this.unk1 = unk1;
        this.unk2 = unk2;
        this.dlist1 = dlist1;
    }
}

export function getManifestForForm(form: AgeOrForm) {
    switch (form) {
        case Age.ADULT:
            return new OotAdultLinkManifest();
        case Age.CHILD:
            return new OotChildLinkManifest();
        default:
            return new DummyManifest();
    }
}

interface IManifest {
    build(sb: SmartBuffer, model_data: IOptimized, pieces: Map<string, ZobjPiece>): void;
}

export class Z64SkeletonHeader {
    pointer: number;
    total: number;
    visible: number;

    constructor(pointer: number, total: number, visible: number) {
        this.pointer = pointer;
        this.total = total;
        this.visible = visible;
    }
}

export class OotAdultLinkManifest implements IManifest {

    build(sb: SmartBuffer, model_data: IOptimized, pieces: Map<string, ZobjPiece>): void {
        // Sword Matricies.
        sb.writeBuffer(MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 0, -715, -310, 78, 1)), 0x00005890);
        sb.writeBuffer(MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 0, -715, -310, 78, 1)), 0x000058D0);
        sb.writeBuffer(MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 0, -715, -310, 78, 1)), 0x00005910);

        // Shield Matricies
        sb.writeBuffer(MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 180, 935, 94, 29, 1)), 0x00005950);
        sb.writeBuffer(MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 180, 935, 94, 29, 1)), 0x00005990);
        sb.writeBuffer(MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 180, 935, 94, 29, 1)), 0x000059D0);

        pieces.forEach((p: ZobjPiece, name: string) => {
            if (OOT_ADULT_LINK.hasOwnProperty(name)) {
                let __off = OOT_ADULT_LINK[name];
                sb.writeUInt32BE(model_data.oldOffs2NewOffs.get(p.newOffset)! + 0x06000000, __off + 0x4);
            }
        });
    }
}

export class OotChildLinkManifest implements IManifest {
    build(sb: SmartBuffer, model_data: IOptimized, pieces: Map<string, ZobjPiece>): void {
        // Sword Matricies.
        sb.writeBuffer(MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 0, -440, -211, 0, 1)), 0x00005890);
        sb.writeBuffer(MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 0, -440, -211, 0, 1)), 0x000058D0);
        sb.writeBuffer(MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 0, -440, -211, 0, 1)), 0x00005910);

        // Shield Matricies
        sb.writeBuffer(MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 180, 545, 0, 80, 1)), 0x00005950);
        sb.writeBuffer(MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 0, 0, 0, 0, 1)), 0x00005990);
        sb.writeBuffer(MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 180, 545, 0, 80, 1)), 0x000059D0);

        // Odd
        sb.writeBuffer(MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(90, 90, 0, 0, 0, -90, 1)), 0x00005A10);

        pieces.forEach((p: ZobjPiece, name: string) => {
            if (OOT_CHILD_LINK.hasOwnProperty(name)) {
                let __off = OOT_CHILD_LINK[name];
                sb.writeUInt32BE(model_data.oldOffs2NewOffs.get(p.newOffset)! + 0x06000000, __off + 0x4);
            }
        });
    }
}

export class DummyManifest implements IManifest {
    build(sb: SmartBuffer, model_data: IOptimized, pieces: Map<string, ZobjPiece>): void {
    }
}

const BANK_OBJECTS: Map<string, ZobjPiece> = new Map<string, ZobjPiece>();
export const CUBE: Map<string, ZobjPiece> = new Map<string, ZobjPiece>();

export class UniversalAliasTable {

    constructor() {
        this.loadBankObjects();
    }

    private *createJump(sb: SmartBuffer, offset: number, r: boolean = false) {
        let back = new SharedArrayBuffer(0x8);
        let buf = Buffer.from(back);
        buf.fill(PAD_VALUE);
        buf.writeUInt32BE(0xDE000000, 0x0);
        if (!r) {
            buf.writeUInt8(0x01, 0x1);
        }
        buf.writeUInt32BE(0x06000000 + offset, 0x4);
        yield buf;
        sb.writeBuffer(buf);
        yield true;
    }

    private *createNop(sb: SmartBuffer) {
        let back = new SharedArrayBuffer(0x8);
        let buf = Buffer.from(back);
        buf.fill(0);
        yield buf;
        sb.writeBuffer(buf);
        yield true;
    }

    private *createMatrix(sb: SmartBuffer) {
        let back = new SharedArrayBuffer(0x40);
        let buf = Buffer.from(back);
        buf.fill(PAD_VALUE);
        yield buf;
        sb.writeBuffer(buf);
        yield true;
    }

    private *createDF(sb: SmartBuffer) {
        let back = new SharedArrayBuffer(0x8);
        let buf = Buffer.from(back);
        buf.fill(PAD_VALUE);
        buf.writeUInt32BE(0xDF000000, 0x0);
        buf.writeUInt32BE(0x00000000, 0x4);
        yield buf;
        let off = sb.writeOffset;
        sb.writeBuffer(buf);
        while (sb.length % 0x10 !== 0) {
            sb.writeUInt8(PAD_VALUE);
        }
        yield off;
    }

    private *createHeader(sb: SmartBuffer) {
        let h = new SmartBuffer();
        h.writeString("MODLOADER64");
        /* Version */ h.writeUInt8(0x1);
        /* Dlist Count */ h.writeUInt32BE(256 >> 2);
        /* Obj ID */ h.writeUInt16BE(0);
        /* Embedded overlay */ h.writeUInt32BE(0);
        /* Padding */
        h.writeUInt8(0x0);
        for (let i = 0; i < 4; i++) {
            h.writeUInt8(PAD_VALUE);
        }
        /* Form ID */ h.writeUInt8(0x69);
        /* Skeleton Section Pointer */ h.writeUInt32BE(0x06005830);
        let buf = h.toBuffer();
        yield buf;
        sb.writeBuffer(buf);
        yield true;
    }

    private *createSkelSection(sb: SmartBuffer, skel1: Z64SkeletonHeader, skel2: Z64SkeletonHeader, skel3: Z64SkeletonHeader, skel4: Z64SkeletonHeader) {
        let buf = new SmartBuffer();
        let pad = () => {
            while (buf.length % 0x10 !== 0) {
                buf.writeUInt8(PAD_VALUE);
            }
        };
        buf.writeUInt32BE(skel1.pointer);
        buf.writeUInt8(skel1.total);
        buf.writeUInt32BE(skel1.visible);
        pad();
        buf.writeUInt32BE(skel2.pointer);
        buf.writeUInt8(skel2.total);
        buf.writeUInt32BE(skel2.visible);
        pad();
        buf.writeUInt32BE(skel3.pointer);
        buf.writeUInt8(skel3.total);
        buf.writeUInt32BE(skel3.visible);
        pad();
        buf.writeUInt32BE(skel4.pointer);
        buf.writeUInt8(skel4.total);
        buf.writeUInt32BE(skel4.visible);
        pad();
        yield buf.toBuffer();
        sb.writeBuffer(buf.toBuffer());
        yield true;
    }

    private *createZoraHex(sb: SmartBuffer) {
        let b = new SmartBuffer();
        b.writeBuffer(Buffer.from('FF142040FE0A204003142040F40A4020', 'hex'));
        b.writeBuffer(Buffer.from('0300000106005000FC00000106005008', 'hex'));
        let buf = b.toBuffer();
        yield buf;
        sb.writeBuffer(buf);
        yield true;
    }

    private *createDebugLabel(name: string, sb: SmartBuffer) {
        let b = new SmartBuffer();
        let tag = sb.writeOffset;
        let off = sb.writeOffset;
        b.writeString(name);
        off += b.writeOffset;
        while (b.length % 0x10 !== 0) {
            b.writeUInt8(PAD_VALUE);
            off += 0x1;
        }
        b.writeUInt32BE(0x00000000);
        b.writeUInt32BE(0x06000000 + tag);
        yield b;
        sb.writeBuffer(b.toBuffer());
        yield off;
    }

    private *createMtxPushPop(name: string, sb: SmartBuffer, dlist: Buffer) {
        let b = new SmartBuffer();
        let tag = sb.writeOffset;
        let off = sb.writeOffset;
        b.writeString(name);
        off += b.writeOffset;
        while (b.length % 0x10 !== 0) {
            b.writeUInt8(PAD_VALUE);
            off += 0x1;
        }
        b.writeUInt32BE(0x00000000);
        b.writeUInt32BE(0x06000000 + tag);
        b.writeUInt32BE(0xDA380000);
        let r = b.writeOffset;
        b.writeUInt32BE(0xDEADBEEF);
        b.writeBuffer(dlist);
        b.writeUInt32BE(0xD8380002);
        b.writeUInt32BE(0x00000040);
        b.writeOffset = r;
        yield b;
        sb.writeBuffer(b.toBuffer());
        yield off;
    }

    private *createLimbTable(sb: SmartBuffer) {
        let b = new SharedArrayBuffer(MAX_BONE_SIZE * 0x4);
        let buf = Buffer.from(b);
        buf.fill(0);
        yield buf;
        sb.writeBuffer(buf);
        yield true;
    }

    addHeader(sb: SmartBuffer, form: number, objectID: number = 0) {
        let HEADER_GENERATOR = this.createHeader(sb);
        let HEADER: Buffer = HEADER_GENERATOR.next().value! as Buffer;
        HEADER.writeUInt8(form, 0x1B);
        HEADER.writeUInt16BE(objectID, 0x10);
        HEADER_GENERATOR.next();
    }

    addMatrix(sb: SmartBuffer, r: number, p: number, h: number, x: number, y: number, z: number, s: number) {
        let MTX_GENERATOR = this.createMatrix(sb);
        let MTX: Buffer = MTX_GENERATOR.next().value! as Buffer;
        MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(r, p, h, x, y, z, s)).copy(MTX);
        MTX_GENERATOR.next();
    }

    addEntry(sb: SmartBuffer, offset: number, r: boolean = false) {
        let DL_GENERATOR = this.createJump(sb, offset, r);
        let DL: Buffer = DL_GENERATOR.next().value! as Buffer;
        DL_GENERATOR.next();
    }

    addDF(sb: SmartBuffer) {
        let DF_GENERATOR = this.createDF(sb);
        let DF: Buffer = DF_GENERATOR.next().value! as Buffer;
        return DF_GENERATOR.next().value! as number;
    }

    addSkelSection(sb: SmartBuffer, skel1: Z64SkeletonHeader, skel2: Z64SkeletonHeader, skel3: Z64SkeletonHeader, skel4: Z64SkeletonHeader) {
        let SKEL_GENERATOR = this.createSkelSection(sb, skel1, skel2, skel3, skel4);
        let SKEL = SKEL_GENERATOR.next().value! as Buffer;
        SKEL_GENERATOR.next();
    }

    addZoraHex(sb: SmartBuffer) {
        let ZORA_GENERATOR = this.createZoraHex(sb);
        let ZORA = ZORA_GENERATOR.next().value! as Buffer;
        ZORA_GENERATOR.next();
    }

    addMtxPushPop(sb: SmartBuffer, name: string, mtx: number, dlist: Buffer) {
        let MTX_GENERATOR = this.createMtxPushPop(name, sb, dlist);
        let _MTX = MTX_GENERATOR.next().value! as SmartBuffer;
        _MTX.writeUInt32BE(mtx + 0x06000000);
        return MTX_GENERATOR.next().value! as number;
    }

    addNop(sb: SmartBuffer) {
        let NOP_GENERATOR = this.createNop(sb);
        let _NOP = NOP_GENERATOR.next().value! as Buffer;
        NOP_GENERATOR.next();
    }

    addDebugLabel(sb: SmartBuffer, name: string) {
        let DEBUG_GENERATOR = this.createDebugLabel(name, sb);
        let _DEBUG = DEBUG_GENERATOR.next()!.value as SmartBuffer;
        return DEBUG_GENERATOR.next()!.value as number;
    }

    addLimbTable(sb: SmartBuffer) {
        let LIMB_GENERATOR = this.createLimbTable(sb);
        let _LIMB_TABLE = LIMB_GENERATOR.next()!.value as Buffer;
        LIMB_GENERATOR.next();
    }

    private loadBankObjects() {
        if (BANK_OBJECTS.size === 0) {
            let parse = new ZZPlayasEmbedParser();

            let zobj_adult = fs.readFileSync("./cache/adult.zobj");
            let parse_adult = parse.parse(zobj_adult);
            Object.keys(parse_adult).forEach((key: string) => {
                let o = optimize(zobj_adult, [parse_adult[key]]);
                let piece = new ZobjPiece(o.zobj, o.oldOffs2NewOffs.get(parse_adult[key])!);
                BANK_OBJECTS.set(piece.hash, piece);
            });

            let zobj_child = fs.readFileSync("./cache/child.zobj");
            let parse_child = parse.parse(zobj_child);
            Object.keys(parse_child).forEach((key: string) => {
                let o = optimize(zobj_child, [parse_child[key]]);
                let piece = new ZobjPiece(o.zobj, o.oldOffs2NewOffs.get(parse_child[key])!);
                BANK_OBJECTS.set(piece.hash, piece);
            });
        }
        if (CUBE.size === 0) {
            let p = optimize(fs.readFileSync(path.resolve(__dirname, "cube.zobj")), [0x388]);
            CUBE.set("cube", new ZobjPiece(p.zobj, p.oldOffs2NewOffs.get(0x388)!));
        }
    }

    generateScaffolding() {
        // Step 3: Create scaffolding for new Zobj.
        let sb = new SmartBuffer();
        sb.writeBuffer(crypto.randomBytes(0x5000));
        this.addHeader(sb, 1);
        for (let i = 0; i < TABLE_SIZE; i++) {
            this.addEntry(sb, 0x00005818);
        }
        let df = this.addDF(sb);
        sb.writeUInt32BE(0x06000000 + df, 0x00005818 + 0x4);
        let dummy_skel = new Z64SkeletonHeader(0, 0, 0);
        let skelsec = sb.writeOffset;
        this.addSkelSection(sb, dummy_skel, dummy_skel, dummy_skel, dummy_skel);
        this.addZoraHex(sb);
        for (let i = 0; i < 13; i++) {
            this.addMatrix(sb, 0, 0, 0, 0, 0, 0, 1);
        }
        let limbtablepos = sb.writeOffset;
        for (let i = 0; i < 5; i++) {
            this.addLimbTable(sb);
        }
        while (sb.length % 0x10 !== 0) {
            sb.writeUInt8(PAD_VALUE);
        }
        return { sb, skelsec, limbtablepos };
    }

    generateMinimizedScaffolding(length: number, top: number = 0x5000) {
        let sb = new SmartBuffer();
        sb.writeBuffer(crypto.randomBytes(top));
        this.addHeader(sb, 1);
        while (length % 2 !== 0) {
            length++;
        }
        sb.writeUInt32BE(length >> 2, top + 0xC);
        sb.writeUInt32BE(0, top + 0x1C);
        for (let i = 0; i < length; i++) {
            this.addEntry(sb, 0xDEADBEEF);
        }
        let df = this.addDF(sb);
        for (let i = 0; i < length; i++) {
            sb.writeUInt32BE(0x06000000 + df, top + 0x20 + (i * 8) + 4);
        }
        while (sb.length % 0x10 !== 0) {
            sb.writeUInt8(PAD_VALUE);
        }
        return { sb };
    }

    findHierarchy(buf: Buffer) {
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
                        let count = 0;
                        while (cur === 0x06000000) {
                            pos += 4;
                            cur = buf.readUInt32BE(pos) & 0xFF000000;
                            count++;
                        }
                        pos -= 4;
                        // Hierarchy offset maybe?
                        let a1 = buf.readUInt8(pos + 4);
                        let a2 = buf.readUInt32BE(pos + 5);
                        if (a1 !== count) {
                            continue;
                        }
                        let format = a2 <= a1 ? 1 : 0;
                        return { pos, change, format };
                    }
                }
            }
        }
        return undefined;
    }

    createTable(p: Buffer, manifest: IManifest, nostub: boolean = false) {
        if (p.indexOf("UNIVERSAL_ALIAS_TABLE") > -1) return p;
        let pieces: Map<string, ZobjPiece> = new Map();
        let parse = new ZZPlayasEmbedParser();
        p = new zzplayas_to_zzconvert().convert_adult(p);
        let zobj = p;
        let m = parse.parse(zobj);
        let __defines = fs.readFileSync(path.resolve(__dirname, "Defines.h")).toString().split("\n");
        let defines: Map<string, number> = new Map();
        for (let i = 0; i < __defines.length; i++) {
            let split = __defines[i].split(/\s+/);
            let name = split[1];
            let value = parseInt(split[2]);
            defines.set(name, value);
        }

        // Step 1: Find Bank objects and stub them.
        // If dlist isn't from the bank store it.
        Object.keys(m).forEach((key: string) => {
            let o = optimize(zobj, [m[key]]);
            let piece = new ZobjPiece(o.zobj, o.oldOffs2NewOffs.get(m[key])!);
            if (BANK_OBJECTS.has(piece.hash) && !nostub) {
                pieces.set(key, new ZobjPiece(new SmartBuffer().writeUInt32BE(0xDF000000).writeUInt32BE(0x00000000).toBuffer(), 0x0));
            } else {
                pieces.set(key, piece);
            }
        });
        pieces.set("Cube", CUBE.get("cube")!)

        // Step 2: Scan Skeleton.
        let skeleton: Array<Bone> = [];
        let skel2: number = 0;
        let skel3: number = 0;
        let bones: number = 0;
        let __bones: number = 0;

        skel2 = this.findHierarchy(zobj)!.pos & 0x00FFFFFF;
        skel3 = zobj.readUInt32BE(skel2) & 0x00FFFFFF;
        bones = zobj.readUInt32BE(skel2 + 0x5);
        __bones = zobj.readUInt8(skel2 + 0x4);
        for (let i = 0; i < __bones; i++) {
            let pointer = zobj.readUInt32BE(skel3 + (i * 0x4)) & 0x00FFFFFF;
            let unk1 = zobj.readUInt32BE(pointer);
            let unk2 = zobj.readUInt32BE(pointer + 0x4);
            let dlist1 = zobj.readUInt32BE(pointer + 0x8) & 0x00FFFFFF;
            let limb = new Bone(`Limb ${i}`, pointer, unk1, unk2, dlist1);
            if (dlist1 > 0) {
                let op = optimize(zobj, [dlist1]);
                limb.piece1 = new ZobjPiece(op.zobj, op.oldOffs2NewOffs.get(dlist1)!);
            }
            skeleton.push(limb);
        }

        // Step 3: Create scaffolding for new Zobj.
        let scaffold = this.generateScaffolding();
        let sb: SmartBuffer = scaffold.sb;

        // Step 4: Deduplicate assets and copy into new zobj.
        let temp = new SmartBuffer();
        temp.writeBuffer(zobj.slice(0, 0x5000));
        let off: Array<number> = [];
        let existingPieces: Map<string, number> = new Map();
        let processPiece = (p: ZobjPiece, name: string) => {
            if (existingPieces.has(p.hash)) {
                p.newOffset = existingPieces.get(p.hash)!;
            } else {
                let a = optimize(p.piece, [p.offset], temp.writeOffset);
                temp.writeBuffer(a.zobj);
                p.newOffset = a.oldOffs2NewOffs.get(p.offset)!;
                existingPieces.set(p.hash, p.newOffset);
                off.push(p.newOffset);
            }
        };
        pieces.forEach(processPiece);
        skeleton.forEach((limb: Bone) => {
            if (limb.piece1 !== undefined) {
                processPiece(limb.piece1, `${limb.name} dlist1`);
            }
        });
        let model_data = optimize(temp.toBuffer(), off, sb.writeOffset, 0x06, true);
        sb.writeBuffer(temp.toBuffer().slice(0x0, 0x5000), 0x0);
        sb.writeBuffer(model_data.zobj);

        skeleton.forEach((limb: Bone) => {
            if (limb.piece1 !== undefined) {
                limb.piece1.newOffset = model_data.oldOffs2NewOffs.get(limb.piece1.newOffset)!;
            }
        });

        // Step 5: Call form specific function.
        manifest.build(sb, model_data, pieces);

        // Step 6: Create combined display lists.
        let wrapGen = (name: string, dl1: string, mtx1: string | undefined, dl2: Array<string>) => {
            let off = 0;
            if (mtx1 !== undefined) {
                off = this.addMtxPushPop(sb, name, defines.get(mtx1)!, this.createJump(sb, defines.get(dl1)!, true).next().value! as Buffer);
            } else {
                off = this.addDebugLabel(sb, name);
                this.addEntry(sb, defines.get(dl1)!, true);
            }
            for (let i = 0; i < dl2.length; i++) {
                this.addEntry(sb, defines.get(dl2[i])!, true);
            }
            this.addDF(sb);
            sb.writeUInt32BE(off + 0x06000000, defines.get(name)! + 0x4);
        };

        for (let i = 1; i < 4; i++) {
            wrapGen(`DL_SWORD${i}_SHEATHED`, `DL_SWORD_HILT_${i}`, `MATRIX_SWORD${i}_BACK`, [`DL_SWORD_SHEATH_${i}`]);
            wrapGen(`DL_SHIELD${i}_BACK`, `DL_SHIELD_${i}`, `MATRIX_SHIELD${i}_BACK`, []);
            for (let j = 1; j < 4; j++) {
                wrapGen(`DL_SWORD${j}_SHIELD${i}`, `DL_SWORD${j}_SHEATHED`, undefined, [`DL_SHIELD${i}_BACK`]);
                wrapGen(`DL_SWORD${j}_SHIELD${i}_SHEATH`, `DL_SHIELD${i}_BACK`, undefined, [`DL_SWORD_SHEATH_${j}`]);
            }
            wrapGen(`DL_LFIST_SWORD${i}`, `DL_SWORD_HILT_${i}`, undefined, [`DL_SWORD_BLADE_${i}`, `DL_LFIST`]);
            wrapGen(`DL_RFIST_SHIELD_${i}`, `DL_SHIELD_${i}`, undefined, [`DL_RFIST`]);
        }
        wrapGen('DL_LFIST_SWORD3_BROKEN', 'DL_SWORD_HILT_3', undefined, ['DL_SWORD_BLADE_3_BROKEN', 'DL_LFIST']);
        wrapGen(`DL_LFIST_HAMMER`, `DL_HAMMER`, undefined, [`DL_LFIST`]);
        wrapGen(`DL_LFIST_SWORD4`, `DL_SWORD4`, undefined, [`DL_LFIST`]);
        wrapGen(`DL_RFIST_HOOKSHOT`, `DL_HOOKSHOT`, undefined, [`DL_RFIST`]);
        wrapGen(`DL_RHAND_OCARINA_FAIRY`, `DL_OCARINA_1`, undefined, [`DL_RHAND`]);
        wrapGen(`DL_RHAND_OCARINA_TIME`, `DL_OCARINA_2`, undefined, [`DL_RHAND`]);
        wrapGen(`DL_RFIST_BOW`, `DL_BOW`, undefined, [`DL_RFIST`]);
        wrapGen(`DL_FPS_RHAND_BOW`, `DL_BOW`, undefined, [`DL_RHAND`]);
        wrapGen(`DL_FPS_LHAND_HOOKSHOT`, `DL_FPS_HOOKSHOT`, undefined, [`DL_FPS_RHAND`]);
        wrapGen(`DL_SHIELD1_ODD`, `DL_SHIELD_1`, 'MATRIX_SHIELD1_ITEM', []);
        wrapGen(`DL_LFIST_BOOMERANG`, `DL_BOOMERANG`, undefined, [`DL_LFIST`]);
        wrapGen(`DL_RFIST_SLINGSHOT`, `DL_SLINGSHOT`, undefined, ['DL_RFIST'])
        wrapGen(`DL_FPS_RARM_SLINGSHOT`, `DL_SLINGSHOT`, undefined, [`DL_FPS_RFOREARM`]);
        wrapGen(`DL_FPS_RARM_BOW`, `DL_BOW`, undefined, [`DL_FPS_RFOREARM`]);
        wrapGen(`DL_FPS_RARM_HOOKSHOT`, `DL_HOOKSHOT`, undefined, [`DL_FPS_HOOKSHOT`]);
        wrapGen(`DL_SHIELD_MIRROR_COMBINED`, `DL_SHIELD_MIRROR`, undefined, [`DL_SHIELD_MIRROR_FACE`]);

        // Step 7: Build skeleton.
        let _boneoffs: Array<number> = [];
        let skeletonInfo: any = {};
        skeleton.forEach((limb: Bone) => {
            let _boneoff = sb.writeOffset;
            sb.writeUInt32BE(limb.unk1);
            sb.writeUInt32BE(limb.unk2);
            if (limb.piece1 !== undefined) {
                sb.writeUInt32BE(limb.piece1.newOffset + 0x06000000);
                sb.writeUInt32BE(limb.piece1.newOffset + 0x06000000);
                skeletonInfo[limb.name] = limb.piece1.newOffset;
            } else {
                sb.writeUInt32BE(0);
                sb.writeUInt32BE(0);
            }
            _boneoffs.push(0x06000000 + _boneoff);
        });
        for (let i = 0; i < _boneoffs.length; i++) {
            sb.writeUInt32BE(_boneoffs[i], scaffold.limbtablepos + (i * 0x4));
        }
        let skelh = new SmartBuffer();
        skelh.writeUInt32BE(scaffold.limbtablepos + 0x06000000);
        skelh.writeUInt8(__bones);
        skelh.writeUInt32BE(bones);
        sb.writeBuffer(skelh.toBuffer(), scaffold.skelsec);
        while (sb.length % 0x10 !== 0) {
            sb.writeUInt8(PAD_VALUE);
        }
        sb.writeString("UNIVERSAL_ALIAS_TABLE_V1.0");
        while (sb.length % 0x10 !== 0) {
            sb.writeUInt8(PAD_VALUE);
        }
        return sb.toBuffer();
    }
}