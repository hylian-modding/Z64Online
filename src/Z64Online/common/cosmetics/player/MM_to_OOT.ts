import { Z64Online_ModelAllocation } from "@Z64Online/common/api/Z64API";
import { BackwardsCompat } from "@Z64Online/common/compat/BackwardsCompat";
import { AgeOrForm } from "Z64Lib/API/Common/Z64API";
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { UniversalAliasTable, getManifestForFormMM } from "../UniversalAliasTable";
import { MatrixTranslate } from "../utils/MatrixTranslate";
import Z64OManifestParser from "../Z64OManifestParser";

export class MM_to_OOT {

    static convert(evt: Z64Online_ModelAllocation) {
        console.log(`Attempting to convert MM model ${evt.name} to OOT...`);
        
        evt.model = Z64OManifestParser.removeMTXData(evt.model);
        let u = new UniversalAliasTable().createTable(evt.model, getManifestForFormMM(evt.age), false, Z64LibSupportedGames.MAJORAS_MASK, true);

        // Sword Matricies.
        MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 0, -440, -211, 0, 1)).copy(u, 0x00005890);
        MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 0, -440, -211, 0, 1)).copy(u, 0x000058D0);
        MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 0, -440, -211, 0, 1)).copy(u, 0x00005910);

        // Shield Matricies
        MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 180, 545, 0, 80, 1)).copy(u, 0x00005950);
        MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 0, 0, 0, 0, 1)).copy(u, 0x00005990);
        MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 180, 545, 0, 80, 1)).copy(u, 0x000059D0);

        // Odd
        MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(90, 90, 0, 0, 0, -90, 1)).copy(u, 0x00005A10);

        evt.model = u;
        if (evt.age === AgeOrForm.HUMAN) {
            evt.age = AgeOrForm.CHILD;
        } else if ((evt.age as number) === BackwardsCompat.OLD_MM_ADULT_SIZED_FLAG) {
            evt.age = AgeOrForm.ADULT;
        }
        evt.game = Z64LibSupportedGames.OCARINA_OF_TIME;
    }

}