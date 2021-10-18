import { Z64Online_ModelAllocation, IModelReference, Z64OnlineEvents, Z64OnlineAPI_BankModelRequest, Z64Online_EquipmentPak, registerModel } from "@Z64Online/common/api/Z64API";
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
import Z64OEquipmentManifest from "../equipment/Z64OEquipmentManifest";
import { MM_to_OOT } from "./MM_to_OOT";
import Z64OManifestParser from "../Z64OManifestParser";
import * as defines from "../Defines";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";

export class ModelAPIHandlers {

    parent: ModelManagerClient;

    constructor(parent: ModelManagerClient) {
        this.parent = parent;
    }

    @EventHandler(Z64OnlineEvents.REFRESH_EQUIPMENT)
    onRefresh() {
        if (this.parent.managerDisabled) return;
        this.parent.ModLoader.utils.setTimeoutFrames(() => {
            this.parent.onSceneChange(-1);
            this.parent.proxyNeedsSync = true;
        }, 1);
    }

    @EventHandler(Z64OnlineEvents.LOAD_EQUIPMENT_BUFFER)
    onLoadEq(eq: Z64Online_EquipmentPak) {
        if (this.parent.managerDisabled) return;
        this.parent.allocationManager.getLocalPlayerData().equipment.set(eq.category, eq.ref);
        if (eq.remove) {
            this.parent.allocationManager.getLocalPlayerData().equipment.delete(eq.category);
            eq.remove = false;
        }
    }

    @EventHandler(Z64OnlineEvents.LOAD_EQUIPMENT_PAK)
    onLoadEQExternal(eq: Z64Online_EquipmentPak) {
        if (this.parent.managerDisabled) return;
        eq = Z64OEquipmentManifest.processEquipmentPak(eq);
        console.log(eq);
        let ref = this.parent.allocationManager.registerModel(eq.data);
        eq.ref = ref;
        this.parent.customModelFilesEquipment.set(eq.name, eq);
    }

    @EventHandler(Z64OnlineEvents.GET_BANK_MODELS)
    onGetBaseModels(evt: Z64OnlineAPI_BankModelRequest) {
        this.parent.puppetModels.forEach((model: IModelReference, key: AgeOrForm) => {
            evt.puppetModels.set(key, model);
        });
    }

    static processModel(evt: Z64Online_ModelAllocation, ModLoader: IModLoaderAPI){
        if (Z64_GAME === Z64LibSupportedGames.MAJORAS_MASK && evt.game === Z64LibSupportedGames.OCARINA_OF_TIME) {
            // An Oot model tried to load. Lets try to convert it.
            OOT_to_MM.convert(evt);
            evt.name += " (OoT)";
        } else if (Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME && evt.game === Z64LibSupportedGames.MAJORAS_MASK) {
            MM_to_OOT.convert(evt);
            evt.name += " (MM)";
        }
        let ref: IModelReference;
        let a = evt.age;
        if (Z64_GAME === Z64LibSupportedGames.MAJORAS_MASK && evt.age === BackwardsCompat.OLD_MM_ADULT_SIZED_FLAG) {
            evt.age = getChildID();
        }
        if (evt.model.indexOf("UNIVERSAL_ALIAS_TABLE_V1.0") === -1) {
            ref = registerModel(new UniversalAliasTable().createTable(evt.model, getManifestForForm(evt.age), undefined, undefined, undefined, (model: Buffer) => {
                let mtx = Z64OManifestParser.pullMTXFromOldPlayas(ModLoader, evt.model, evt.game);
                if (Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME) {
                    if (mtx.length > 0) {
                        if (mtx.length >= 1) {
                            // All swords had the same mtx in the old version.
                            mtx[0].copy(model, defines.MATRIX_SWORD1_BACK);
                            mtx[0].copy(model, defines.MATRIX_SWORD2_BACK);
                            mtx[0].copy(model, defines.MATRIX_SWORD3_BACK);
                        }
                        if (mtx.length >= 2) {
                            // Same with shields.
                            mtx[1].copy(model, defines.MATRIX_SHIELD1_BACK);
                            mtx[1].copy(model, defines.MATRIX_SHIELD2_BACK);
                            mtx[1].copy(model, defines.MATRIX_SHIELD3_BACK);
                        }
                        if (mtx.length >= 3) {
                            // Item shield
                            mtx[2].copy(model, defines.MATRIX_SHIELD1_ITEM);
                        }
                    }
                } else if (Z64_GAME === Z64LibSupportedGames.MAJORAS_MASK) {
                    if (mtx.length > 0) {
                        if (mtx.length >= 1) {
                            // Copy into all just in case.
                            mtx[1].copy(model, defines.MATRIX_SHIELD1_BACK);
                            mtx[1].copy(model, defines.MATRIX_SHIELD2_BACK);
                            mtx[1].copy(model, defines.MATRIX_SHIELD3_BACK);
                        }
                        if (mtx.length >= 2) {
                            // Hero Shield
                            mtx[1].copy(model, defines.MATRIX_SHIELD1_BACK);
                        }
                        if (mtx.length >= 3) {
                            // Copy into all just in case.
                            mtx[2].copy(model, defines.MATRIX_SWORD1_BACK);
                            mtx[2].copy(model, defines.MATRIX_SWORD2_BACK);
                            mtx[2].copy(model, defines.MATRIX_SWORD3_BACK);
                        }
                        if (mtx.length >= 4) {
                            // Razor Sword
                            mtx[3].copy(model, defines.MATRIX_SWORD3_BACK);
                        }
                    }
                }
            }));
        } else {
            ref = registerModel(evt.model);
        }
        if (evt.script !== undefined) {
            ref.script = evt.script;
        }
        evt.ref = ref;
        ref.flags[0] = a;
        return ref;
    }

    @EventHandler(Z64OnlineEvents.REGISTER_CUSTOM_MODEL)
    onCustomModel_All(evt: Z64Online_ModelAllocation) {
        if (this.parent.managerDisabled) return;
        ModelAPIHandlers.processModel(evt, this.parent.ModLoader);
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
        if (fs.lstatSync(evt).isDirectory()) {
            return;
        }
        let e = new Z64Online_ModelAllocation(fs.readFileSync(evt), AgeOrForm.HUMAN, Z64LibSupportedGames.MAJORAS_MASK);
        e.name = path.parse(evt).name;
        if (e.model.readUInt8(0x500B) === BackwardsCompat.OLD_MM_ADULT_SIZED_FLAG) {
            e.age = 0x68;
        }
        bus.emit(Z64OnlineEvents.REGISTER_CUSTOM_MODEL, e);
    }

    @EventHandler(BackwardsCompat.OLD_OOT_EQUIP_EVT)
    onCustomEquipment_oot_backcompat(evt: any) {
        //this.onLoadEQExternal(evt);
    }

}