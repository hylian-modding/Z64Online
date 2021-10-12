import { Z64Online_EquipmentPak } from "@Z64Online/common/api/Z64API";
import { CostumeHelper } from "@Z64Online/common/events/CostumeHelper";
import Z64Serialize from "@Z64Online/common/storage/Z64Serialize";
import { optimize } from "Z64Lib/API/zzoptimize";
import { UniversalAliasTable } from "../UniversalAliasTable";
import Z64OManifestParser from "../Z64OManifestParser";

export default class Z64OEquipmentManifest {

    static start: string = "!Z64OEQUIPMENT00";
    static end: string = "!Z64OEQUIPMENT99";

    static parse(buf: Buffer) {
        let o: any = Z64OManifestParser.parse(buf);
        return o;
    }

    static isOldEquipmentPak(buf: Buffer) {
        return buf.indexOf("EQUIPMANIFEST") > -1;
    }

    static convertOldEquipmentPak(buf: Buffer): Z64Online_EquipmentPak {
        let name = CostumeHelper.getCostumeName(buf);
        let cat = CostumeHelper.getEquipmentCategory(buf);
        if (Z64OManifestParser.isOldZZConvert(buf)) {
            buf = Z64OManifestParser.convertZZConvertToZ64O(buf);
        }
        let evt = new Z64Online_EquipmentPak(name, cat, buf);
        return evt;
    }

    static processEquipmentPak(eq: Z64Online_EquipmentPak) {
        if (Z64OEquipmentManifest.isOldEquipmentPak(eq.data)) {
            let eq2 = Z64OEquipmentManifest.convertOldEquipmentPak(eq.data);
            if (eq2.name === "" && eq.name !== ""){
                eq2.name = eq.name;
            }
            eq = eq2;
        }
        let map: any = {};
        let parse = this.parse(eq.data);
        let u = new UniversalAliasTable();
        let sb = u.generateMinimizedScaffolding(Object.keys(parse).length, 0).sb;
        Object.keys(parse).forEach((key: string)=>{
            if (key.includes("Limb")) return;
            let op = optimize(eq.data, [parse[key]]);
            let offset = op.oldOffs2NewOffs.get(parse[key])!;
            let op2 = optimize(op.zobj, [offset], sb.writeOffset);
            let offset2 = op2.oldOffs2NewOffs.get(offset)!;
            sb.writeBuffer(op2.zobj);
            parse[key] = offset2;
        });
        sb.writeOffset = 0x20;

        Object.keys(parse).forEach((key: string) => {
            map[key] = sb.writeOffset;
            sb.writeUInt32BE(0xDE010000);
            sb.writeUInt32BE(0x06000000 + parse[key]);
        });
        sb.writeOffset = sb.length;
        while (sb.length % 0x10 !== 0) {
            sb.writeUInt8(0xFF);
        }
        sb.writeString(this.start);
        sb.writeBuffer(Z64Serialize.serializeSync(map));
        sb.writeString(this.end);
        while (sb.length % 0x10 !== 0) {
            sb.writeUInt8(0xFF);
        }
        eq.data = sb.toBuffer();
        return eq;
    }

    static getEquipmentMap(buf: Buffer){
        let s = buf.indexOf(this.start);
        s+=0x10;
        let e = buf.indexOf(this.end);
        let slice = buf.slice(s, e);
        let data = Z64Serialize.deserializeSync(slice);
        return data;
    }

}