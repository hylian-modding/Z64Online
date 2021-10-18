import { ZZPlayasEmbedParser } from "Z64Lib/API/Utilities/ZZPlayasEmbedParser";
import Z64Serialize from "../storage/Z64Serialize";
import { SmartBuffer } from 'smart-buffer';
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { AgeOrForm } from "Z64Lib/API/Common/Z64API";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";

export default class Z64OManifestParser {

    private static start: string = "!Z64OManifest000";
    private static end: string = "!Z64OManifest999";

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
        let o: any = {};
        let i = buf.indexOf(this.start);
        let e = buf.indexOf(this.end);
        if (i > -1 && e > -1) {
            i += 0x10;
            let s = buf.slice(i, e);
            let map = Z64Serialize.deserializeSync(s);
            Object.keys(map).forEach((key: string) => {
                o[key] = map[key];
            });
        }
        return o;
    }

    static isOldZZConvert(buf: Buffer) {
        return buf.indexOf("!PlayAsManifest0");
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