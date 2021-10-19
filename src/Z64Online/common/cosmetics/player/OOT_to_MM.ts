import { Z64Online_ModelAllocation } from "@Z64Online/common/api/Z64API";
import { BackwardsCompat } from "@Z64Online/common/compat/BackwardsCompat";
import { SmartBuffer } from "smart-buffer";
import { AgeOrForm } from "Z64Lib/API/Common/Z64API";
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { getManifestForFormOot, UniversalAliasTable } from "../UniversalAliasTable";
import { MatrixTranslate } from "../utils/MatrixTranslate";
import Z64OManifestParser from "../Z64OManifestParser";

export class OOT_to_MM {

    static convert(evt: Z64Online_ModelAllocation) {
        console.log(`Attempting to convert OOT model ${evt.name} to MM...`);
        let a = evt.model.readUInt8(0x500B);

        evt.model = Z64OManifestParser.removeMTXData(evt.model);
        let colorhax: number = 0;
        let u = new UniversalAliasTable().createTable(evt.model, getManifestForFormOot(evt.age), false, Z64LibSupportedGames.OCARINA_OF_TIME, true, (sb: SmartBuffer) => {
            colorhax = sb.writeOffset;
            sb.writeUInt32BE(0xE7000000);
            sb.writeUInt32BE(0x00000000);
            sb.writeUInt32BE(0xFB000000);
            sb.writeUInt32BE(0x1E691BFF);
            sb.writeUInt32BE(0x00000000);
            sb.writeUInt32BE(0x00000000);
            sb.writeUInt32BE(0xDF000000);
            sb.writeUInt32BE(0x00000000);
        });

        /**
         * These get translated wrong. Correct them.
         */
        // Kokiri Sword
        MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 0, -578, -221, -32, 1)).copy(u, 0x00005890);
        // Razor Sword
        MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 0, -480, -240, -14, 1)).copy(u, 0x000058D0);
        // Gilded Sword
        MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 0, -578, -221, -32, 1)).copy(u, 0x00005910);

        // Shield 2
        MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 182, 552, 0, 0, 1)).copy(u, 0x00005990);
        // Shield 3
        MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 182, 552, 0, -50, 1)).copy(u, 0x000059D0);

        evt.model = u;

        let limbtable = 0x5BF0;

        for (let i = 0; i < 21; i++) {
            let offset = evt.model.readUInt32BE(limbtable + (i * 4)) & 0x00FFFFFF;
            let dlist = evt.model.readUInt32BE(offset + 8);
            if (dlist > 0) {
                dlist = dlist & 0x00FFFFFF;
                let cmd = evt.model.readUInt32BE(dlist);
                if (cmd === 0xE7000000) {
                    evt.model.writeUInt32BE(0xDE000000, dlist);
                    evt.model.writeUInt32BE(0x06000000 + colorhax, dlist + 4);
                }
            }
        }

        if (a === AgeOrForm.ADULT) {
            evt.age = BackwardsCompat.OLD_MM_ADULT_SIZED_FLAG;
        } else {
            evt.age = AgeOrForm.HUMAN;
        }

        evt.game = Z64LibSupportedGames.MAJORAS_MASK;
    }

}