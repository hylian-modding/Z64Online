import { ZZPlayasEmbedParser } from "Z64Lib/API/Utilities/ZZPlayasEmbedParser";
import Z64Serialize from "../storage/Z64Serialize";
import { SmartBuffer } from 'smart-buffer';

export default class Z64OManifestParser {

    private static start: string = "!Z64OManifest000";
    private static end: string = "!Z64OManifest999";

    static isOldZZPlayas(buf: Buffer) {
        return buf.indexOf("MODLOADER64") > -1 && buf.indexOf("UNIVERSAL_ALIAS_TABLE") === -1;
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

    static isOldZZConvert(buf: Buffer){
        return buf.indexOf("!PlayAsManifest0");
    }

    static convertZZConvertToZ64O(buf: Buffer){
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