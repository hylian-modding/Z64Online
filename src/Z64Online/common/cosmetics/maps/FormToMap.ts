import { AgeOrForm } from "Z64Lib/API/Common/Z64API";
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { Z64_GAME } from "Z64Lib/src/Common/types/GameAliases";
import { DUMMY_LINK } from "./DUMMY_LINK";
import { MM_DEITY_LINK } from "./MM_DEITY_LINK";
import { MM_DEKU_LINK } from "./MM_DEKU_LINK";
import { MM_GORON_LINK } from "./MM_GORON_LINK";
import { MM_HUMAN_LINK } from "./MM_HUMAN_LINK";
import { MM_ZORA_LINK } from "./MM_ZORA_LINK";
import { OOT_ADULT_LINK } from "./OOT_ADULT_LINK";
import { OOT_CHILD_LINK } from "./OOT_CHILD_LINK";

export class FormToMap {

    static GetMapFromForm(form: AgeOrForm) {
        if (Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME) {
            switch (form) {
                case AgeOrForm.ADULT:
                    return OOT_ADULT_LINK;
                case AgeOrForm.CHILD:
                    return OOT_CHILD_LINK;
            }
        } else if (Z64_GAME === Z64LibSupportedGames.MAJORAS_MASK) {
            switch (form) {
                case AgeOrForm.DEKU:
                    return MM_DEKU_LINK;
                case AgeOrForm.FD:
                    return MM_DEITY_LINK;
                case AgeOrForm.GORON:
                    return MM_GORON_LINK;
                case AgeOrForm.HUMAN:
                    return MM_HUMAN_LINK;
                case AgeOrForm.ZORA:
                    return MM_ZORA_LINK;
            }
        } else {
            return DUMMY_LINK;
        }
    }

}