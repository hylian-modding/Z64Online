import { Z64Online_ModelAllocation } from "@Z64Online/common/api/Z64API";
import { AgeOrForm } from "Z64Lib/API/Common/Z64API";
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { getManifestForFormOot, UniversalAliasTable } from "../UniversalAliasTable";

export class OOT_to_MM {

    static convert(evt: Z64Online_ModelAllocation) {
        console.log(`Attempting to convert OOT model ${evt.name} to MM...`);
        let target: Buffer = Buffer.from("FC127E05", 'hex');
        let replacement: Buffer = Buffer.from("0000000000000000", 'hex');
        let a = evt.model.readUInt8(0x500B);

        let u = new UniversalAliasTable().createTable(evt.model, getManifestForFormOot(evt.age), false, Z64LibSupportedGames.OCARINA_OF_TIME);
        evt.model = u;

        for (let i = 0; i < evt.model.byteLength; i += 8) {
            if (evt.model.slice(i, i + 4).equals(target)) {
                console.log(`Replacing FC command at ${i.toString(16)} with NOP.`);
                replacement.copy(evt.model, i);
            }
        }

        if (a === AgeOrForm.ADULT) {
            evt.age = 0x68;
        } else {
            evt.age = AgeOrForm.HUMAN;
        }

        evt.game = Z64LibSupportedGames.MAJORAS_MASK;
    }

}