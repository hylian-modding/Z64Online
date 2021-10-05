import { Z64Online_ModelAllocation, IModelReference, Z64OnlineEvents } from "@Z64Online/common/api/Z64API";
import { BackwardsCompat } from "@Z64Online/common/compat/BackwardsCompat";
import { getAdultID, getChildID } from "@Z64Online/common/types/GameAliases";
import { EventHandler } from "modloader64_api/EventHandler";
import path from "path";
import { AgeOrForm } from "Z64Lib/API/Common/Z64API";
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { Z64_GAME } from "Z64Lib/src/Common/types/GameAliases";
import { UniversalAliasTable, getManifestForForm } from "../UniversalAliasTable";
import { ModelManagerClient } from "./ModelManager";
import fs from 'fs';

export class ModelAPIHandlers {

    parent: ModelManagerClient;

    constructor(parent: ModelManagerClient) {
        this.parent = parent;
    }

    @EventHandler(Z64OnlineEvents.REGISTER_CUSTOM_MODEL)
    onCustomModel_All(evt: Z64Online_ModelAllocation) {
        if (this.parent.managerDisabled) return;
        let ref: IModelReference;
        let a = evt.age;
        if (evt.age === BackwardsCompat.OLD_MM_ADULT_SIZED_FLAG){
            evt.age = getChildID();
        }
        ref = this.parent.allocationManager.registerModel(new UniversalAliasTable().createTable(evt.model, getManifestForForm(evt.age)));
        if (evt.script !== undefined) {
            ref.script = evt.script;
        }
        evt.ref = ref;
        ref.flags[0] = a;
        this.parent.customModelRegistry.get(evt.age)!.set(evt.name, evt.ref);
    }

    // Backwards compatibility shit below here.

    @EventHandler(BackwardsCompat.OLD_OOT_ADULT_EVT)
    onCustomModelAdult_backcompat(evt: Z64Online_ModelAllocation) {
        if (Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME) {
            if (this.parent.managerDisabled) return;
            let ref: IModelReference;
            if (evt.model.indexOf("UNIVERSAL_ALIAS_TABLE") === -1) {
                ref = this.parent.allocationManager.registerModel(new UniversalAliasTable().createTable(evt.model, getManifestForForm(getAdultID())));
            } else {
                ref = this.parent.allocationManager.registerModel(evt.model);
            }
            if (evt.script !== undefined) {
                ref.script = evt.script;
            }
            ref.flags[0] = getAdultID();
            evt.ref = ref;
            this.parent.customModelRegistry.get(getAdultID())!.set(evt.name + " (Adult)", evt.ref);
        }
    }

    private onCustomModelChild_Impl(evt: Z64Online_ModelAllocation, label: string = "(Child)", flag_o?: number, flag_v?: number) {
        if (this.parent.managerDisabled) return;
        let ref: IModelReference;
        if (evt.model.indexOf("UNIVERSAL_ALIAS_TABLE") === -1) {
            ref = this.parent.allocationManager.registerModel(new UniversalAliasTable().createTable(evt.model, getManifestForForm(getChildID())));
        } else {
            ref = this.parent.allocationManager.registerModel(evt.model);
        }
        if (evt.script !== undefined) {
            ref.script = evt.script;
        }
        ref.flags[0] = getChildID();
        if (flag_o !== undefined && flag_v !== undefined) {
            ref.flags[flag_o] = flag_v;
        }
        evt.ref = ref;
        this.parent.customModelRegistry.get(getChildID())!.set(evt.name + ` ${label}`, evt.ref);
    }

    @EventHandler(BackwardsCompat.OLD_OOT_CHILD_EVT)
    onCustomModelChild_backcompat(evt: Z64Online_ModelAllocation) {
        if (Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME) {
            this.onCustomModelChild_Impl(evt);
        }
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
                this.onCustomModelChild_Impl(e, "(Adult)", 0, BackwardsCompat.OLD_MM_ADULT_SIZED_FLAG);
            } else {
                this.onCustomModelChild_Impl(e);
            }
        }
    }

}