import { Z64Online_ModelAllocation } from "@Z64Online/common/api/Z64API";
import { BackwardsCompat } from "@Z64Online/common/compat/BackwardsCompat";
import { AgeOrForm } from "Z64Lib/API/Common/Z64API";
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { getManifestForFormOot, UniversalAliasTable } from "../UniversalAliasTable";
import { MatrixTranslate } from "../utils/MatrixTranslate";

export class OOT_to_MM {

    static convert(evt: Z64Online_ModelAllocation) {
        console.log(`Attempting to convert OOT model ${evt.name} to MM...`);
        let target: Buffer = Buffer.from("FC127E05", 'hex');
        let replacement: Buffer = Buffer.from("0000000000000000", 'hex');
        let a = evt.model.readUInt8(0x500B);

        let u = new UniversalAliasTable().createTable(evt.model, getManifestForFormOot(evt.age), false, Z64LibSupportedGames.OCARINA_OF_TIME, true);

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

        for (let i = 0; i < evt.model.byteLength; i += 8) {
            if (evt.model.slice(i, i + 4).equals(target)) {
                console.log(`Replacing FC command at ${i.toString(16)} with NOP.`);
                replacement.copy(evt.model, i);
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