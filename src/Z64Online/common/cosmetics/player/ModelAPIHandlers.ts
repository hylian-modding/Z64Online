import { Z64Online_ModelAllocation, IModelReference, Z64OnlineEvents } from "@Z64Online/common/api/Z64API";
import { BackwardsCompat } from "@Z64Online/common/compat/BackwardsCompat";
import { getChildID } from "@Z64Online/common/types/GameAliases";
import { bus, EventHandler } from "modloader64_api/EventHandler";
import path from "path";
import { AgeOrForm } from "Z64Lib/API/Common/Z64API";
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { Z64_GAME } from "Z64Lib/src/Common/types/GameAliases";
import { UniversalAliasTable, getManifestForForm } from "../UniversalAliasTable";
import { ModelManagerClient } from "./ModelManager";
import fs from 'fs';
import { OOT_to_MM } from "./OOT_to_MM";

export class ModelAPIHandlers {

    parent: ModelManagerClient;

    constructor(parent: ModelManagerClient) {
        this.parent = parent;
    }

    @EventHandler(Z64OnlineEvents.REGISTER_CUSTOM_MODEL)
    onCustomModel_All(evt: Z64Online_ModelAllocation) {
        if (this.parent.managerDisabled) return;
        if (Z64_GAME === Z64LibSupportedGames.MAJORAS_MASK && evt.game === Z64LibSupportedGames.OCARINA_OF_TIME) {
            // An Oot model tried to load. Lets try to convert it.
            OOT_to_MM.convert(evt);
            evt.name += " (OoT)";
        }
        let ref: IModelReference;
        let a = evt.age;
        if (Z64_GAME === Z64LibSupportedGames.MAJORAS_MASK && evt.age === BackwardsCompat.OLD_MM_ADULT_SIZED_FLAG) {
            evt.age = getChildID();
        }
        if (evt.model.indexOf("UNIVERSAL_ALIAS_TABLE_V1.0") === -1) {
            ref = this.parent.allocationManager.registerModel(new UniversalAliasTable().createTable(evt.model, getManifestForForm(evt.age)));
        } else {
            ref = this.parent.allocationManager.registerModel(evt.model);
        }
        if (evt.script !== undefined) {
            ref.script = evt.script;
        }
        evt.ref = ref;
        ref.flags[0] = a;
        this.parent.customModelRegistry.get(evt.age)!.set(evt.name, evt.ref);
    }

    @EventHandler(BackwardsCompat.OLD_OOT_ADULT_EVT)
    onCustomModelAdult_backcompat(evt: Z64Online_ModelAllocation) {
        evt.game = Z64LibSupportedGames.OCARINA_OF_TIME;
        bus.emit(Z64OnlineEvents.REGISTER_CUSTOM_MODEL, evt);
    }

    @EventHandler(BackwardsCompat.OLD_OOT_CHILD_EVT)
    onCustomModelChild_backcompat(evt: Z64Online_ModelAllocation) {
        evt.game = Z64LibSupportedGames.OCARINA_OF_TIME;
        evt.age = AgeOrForm.CHILD;
        bus.emit(Z64OnlineEvents.REGISTER_CUSTOM_MODEL, evt);
    }

    @EventHandler(BackwardsCompat.OLD_MM_MODEL_EVT)
    onCustomModelChild_mm_backcompat(evt: string) {
        if (Z64_GAME === Z64LibSupportedGames.MAJORAS_MASK) {
            if (fs.lstatSync(evt).isDirectory()) {
                return;
            }
            let e = new Z64Online_ModelAllocation(fs.readFileSync(evt), AgeOrForm.HUMAN, Z64LibSupportedGames.MAJORAS_MASK);
            e.name = path.parse(evt).name;
            if (e.model.readUInt8(0x500B) === BackwardsCompat.OLD_MM_ADULT_SIZED_FLAG) {
                e.age = 0x68;
                bus.emit(Z64OnlineEvents.REGISTER_CUSTOM_MODEL, e);
            }
        }
    }

}