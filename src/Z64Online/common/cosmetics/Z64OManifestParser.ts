import { ZZPlayasEmbedParser } from "Z64Lib/API/Utilities/ZZPlayasEmbedParser";
import Z64Serialize from "../storage/Z64Serialize";
import { SmartBuffer } from 'smart-buffer';
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { AgeOrForm } from "Z64Lib/API/Common/Z64API";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";

export default class Z64OManifestParser {

    private static start: string = "!Z64OManifest000";
    private static end: string = "!Z64OManifest999";
    private static mtx_start: string = "!Z64OMATRIXDATA0"
    private static mtx_end: string = "!Z64OMATRIXDATA9";

    static isOldZZPlayas(buf: Buffer) {
        return buf.indexOf("MODLOADER64") > -1 && buf.indexOf("UNIVERSAL_ALIAS_TABLE") === -1;
    }

    static pullMTXFromOldPlayas(ModLoader: IModLoaderAPI, buf: Buffer, game: Z64LibSupportedGames) {
        let mtx_arr: Buffer[] = [];
        if (!this.isOldZZPlayas(buf)) return mtx_arr;
        let count = 0;
        let age = buf.readUInt8(0x500B);
        if (game === Z64LibSupportedGames.OCARINA_OF_TIME) {
            if (age === AgeOrForm.CHILD) {
                count += 3;
            } else if (age === AgeOrForm.ADULT) {
                count += 2;
            }
        } else if (game === Z64LibSupportedGames.MAJORAS_MASK) {
            if (age === AgeOrForm.HUMAN || age === 0x68) {
                count += 4;
            }
        }
        let start = 0x5010;
        let cur = start;
        for (let i = 0; i < count; i++) {
            let offset = cur + (0x40 * i);
            let mtx = ModLoader.utils.cloneBuffer(buf.slice(offset, offset + 0x40));
            mtx_arr.push(mtx);
        }
        return mtx_arr;
    }

    static isZ64OPlayas(buf: Buffer) {
        let i = buf.indexOf(this.start);
        let e = buf.indexOf(this.end);
        if (i > -1 && e > -1) return true;
    }

    static parse(buf: Buffer) {
        let o: Record<string, number> = {};
        let i = buf.indexOf(this.start);
        let e = buf.indexOf(this.end);
        if (i > -1 && e > -1) {
            i += 0x10;
            let s = buf.slice(i, e);
            o = Z64Serialize.deserializeSync(s);
        }
        return o;
    }

    static copyMTXData(source: Buffer, dest: Buffer){
        if (!this.hasMTXData(source)) return dest;
        let mtx = this.parseMTXData(source);
        let out = this.writeMTXData(dest, mtx);
        return out;
    }

    static hasMTXData(buf: Buffer) {
        return buf.indexOf(this.mtx_start) > -1 && buf.indexOf(this.mtx_end) > -1;
    }

    static parseMTXData(buf: Buffer) {
        let mtx_arr: Buffer[] = [];
        if (!this.hasMTXData(buf)) return mtx_arr;
        let i = buf.indexOf(this.mtx_start);
        let e = buf.indexOf(this.mtx_end);
        i += 0x10;
        let s = buf.slice(i, e);
        let fake = Z64Serialize.deserializeSync(s);
        mtx_arr.push(...Z64Serialize.FixArray(fake));
        return mtx_arr;
    }

    static removeMTXData(buf: Buffer) {
        if (!this.hasMTXData(buf)) return buf;
        let addn: Buffer[] = [];
        let s = buf.slice(0, buf.indexOf(this.mtx_start));
        addn.push(s);
        if ((buf.indexOf(this.mtx_end) + 0x10) < buf.byteLength) {
            let e = buf.slice(buf.indexOf(this.mtx_end + 0x10));
            addn.push(e);
        }
        let sb: SmartBuffer = new SmartBuffer();
        for (let i = 0; i < addn.length; i++) {
            sb.writeBuffer(addn[i]);
        }
        while (sb.length % 0x10 !== 0) sb.writeUInt8(0);
        return sb.toBuffer();
    }

    static writeMTXData(buf: Buffer, mtx: Buffer[]){
        let sb = new SmartBuffer();
        sb.writeBuffer(buf);
        while (sb.length % 0x10 !== 0) sb.writeUInt8(0);
        sb.writeString(this.mtx_start);
        sb.writeBuffer(Z64Serialize.serializeSync(mtx));
        sb.writeString(this.mtx_end);
        while (sb.length % 0x10 !== 0) sb.writeUInt8(0);
        return sb.toBuffer();
    }

    static isOldZZConvert(buf: Buffer) {
        return buf.indexOf("!PlayAsManifest0") > -1;
    }

    static convertZZConvertToZ64O(buf: Buffer) {
        let parse = new ZZPlayasEmbedParser();
        let m = parse.parse(buf);
        let s = buf.slice(0, buf.indexOf("!PlayAsManifest0"));
        let sb = new SmartBuffer();
        sb.writeBuffer(s);
        while (sb.length % 0x10 !== 0) {
            sb.writeUInt8(0xFF);
        }
        sb.writeString(this.start);
        sb.writeBuffer(Z64Serialize.serializeSync(m));
        sb.writeString(this.end);
        while (sb.length % 0x10 !== 0) {
            sb.writeUInt8(0xFF);
        }
        return sb.toBuffer();
    }

}