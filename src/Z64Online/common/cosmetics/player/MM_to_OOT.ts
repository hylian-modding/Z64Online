import { Z64Online_ModelAllocation } from "@Z64Online/common/api/Z64API";
import { BackwardsCompat } from "@Z64Online/common/compat/BackwardsCompat";
import { AgeOrForm } from "Z64Lib/API/Common/Z64API";
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { UniversalAliasTable, getManifestForFormMM } from "../UniversalAliasTable";

export class MM_to_OOT{

    static convert(evt: Z64Online_ModelAllocation){
        console.log(`Attempting to convert MM model ${evt.name} to OOT...`);
        let u = new UniversalAliasTable().createTable(evt.model, getManifestForFormMM(evt.age), false, Z64LibSupportedGames.MAJORAS_MASK);
        evt.model = u;
        if (evt.age === AgeOrForm.HUMAN){
            evt.age = AgeOrForm.CHILD;
        }else if ((evt.age as number) === BackwardsCompat.OLD_MM_ADULT_SIZED_FLAG){
            evt.age = AgeOrForm.ADULT;
        }
        evt.game = Z64LibSupportedGames.OCARINA_OF_TIME;
    }

}