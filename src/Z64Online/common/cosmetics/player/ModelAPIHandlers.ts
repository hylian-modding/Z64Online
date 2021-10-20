import { Z64Online_ModelAllocation, IModelReference, Z64OnlineEvents, Z64OnlineAPI_BankModelRequest, Z64Online_EquipmentPak, registerModel } from "@Z64Online/common/api/Z64API";
import { BackwardsCompat } from "@Z64Online/common/compat/BackwardsCompat";
import { getAgeOrForm, getChildID } from "@Z64Online/common/types/GameAliases";
import { bus, EventHandler, PrivateEventHandler } from "modloader64_api/EventHandler";
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
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { number_ref } from "modloader64_api/Sylvain/ImGui";
import { MatrixTranslate } from "../utils/MatrixTranslate";
import { Z64O_PRIVATE_EVENTS } from "@Z64Online/common/api/InternalAPI";
import { CDNClient } from "@Z64Online/common/cdn/CDNClient";

export class ModelAPIHandlers {

    parent: ModelManagerClient;

    constructor(parent: ModelManagerClient) {
        this.parent = parent;
        // Idk why the decorators aren't working in this class, so bind it manually.
        this.parent.ModLoader.privateBus.on(Z64O_PRIVATE_EVENTS.CHANGE_MODEL_INTERNAL, this.onCustomModel_internal.bind(this));
    }

    @EventHandler(Z64OnlineEvents.GET_CURRENT_MODEL)
    onGetModel(evt: { buf: Buffer }) {
        let ref = this.parent.allocationManager.getLocalPlayerData().AgesOrForms.get(getAgeOrForm(this.parent.core))!;
        evt.buf = this.parent.allocationManager.getModel(ref).zobj;
    }

    @EventHandler(Z64OnlineEvents.GET_LINK_OBJECT)
    onGetLink(evt: number_ref) {
        evt[0] = this.parent.child.findLink();
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

    static processModel(evt: Z64Online_ModelAllocation, ModLoader: IModLoaderAPI, cache?: boolean) {
        if (evt.model.byteLength <= 1) return;
        let mtx = Z64OManifestParser.pullMTXFromOldPlayas(ModLoader, evt.model, evt.game);
        if (mtx.length > 0 && Z64OManifestParser.hasMTXData(evt.model)) {
            let addn: Buffer[] = [];
            if (mtx.length === 2) { // Adult Link
                for (let i = 0; i < 3; i++) {
                    addn.push(ModLoader.utils.cloneBuffer(mtx[0]));
                }
                for (let i = 0; i < 3; i++) {
                    addn.push(ModLoader.utils.cloneBuffer(mtx[1]));
                }
                addn.push(MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 0, 0, 0, 0, 1)));
            } else if (mtx.length === 3) { // Child Link
                for (let i = 0; i < 3; i++) {
                    addn.push(ModLoader.utils.cloneBuffer(mtx[0]));
                }
                for (let i = 0; i < 3; i++) {
                    addn.push(ModLoader.utils.cloneBuffer(mtx[1]));
                }
                addn.push(ModLoader.utils.cloneBuffer(mtx[2]));
            } else if (mtx.length === 4) { // Human Link
                addn.push(MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 0, 0, 0, 0, 1)));
                addn.push(ModLoader.utils.cloneBuffer(mtx[1]));
                addn.push(ModLoader.utils.cloneBuffer(mtx[0]));
                addn.push(ModLoader.utils.cloneBuffer(mtx[2]));
                addn.push(ModLoader.utils.cloneBuffer(mtx[2]));
                addn.push(ModLoader.utils.cloneBuffer(mtx[3]));
                addn.push(MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(0, 0, 0, 0, 0, 0, 1)));
            }
            evt.model = Z64OManifestParser.writeMTXData(evt.model, addn);
        }
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
        let model: Buffer;
        if (evt.model.indexOf("UNIVERSAL_ALIAS_TABLE_V1.0") === -1) {
            model = new UniversalAliasTable().createTable(evt.model, getManifestForForm(evt.age));
        } else {
            model = evt.model;
        }
        ref = registerModel(model);
        if (evt.script !== undefined) {
            ref.script = evt.script;
        }
        evt.ref = ref;
        ref.flags[0] = a;
        if (cache !== undefined && cache){
            CDNClient.singleton.registerWithCache(model);
        }
        return ref;
    }

    @EventHandler(Z64OnlineEvents.PREPROCESS_ZOBJ)
    onCustomModel_preprocess(evt: Z64Online_ModelAllocation){
        ModelAPIHandlers.processModel(evt, this.parent.ModLoader, true);
    }

    @PrivateEventHandler(Z64O_PRIVATE_EVENTS.CHANGE_MODEL_INTERNAL)
    onCustomModel_internal(evt: Z64Online_ModelAllocation){
        ModelAPIHandlers.processModel(evt, this.parent.ModLoader, true);
        bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL, evt);
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

    private handleOldCrap(evt: string, game: Z64LibSupportedGames, form: AgeOrForm) {
        if (fs.lstatSync(evt).isDirectory()) {
            return;
        }
        let e = new Z64Online_ModelAllocation(fs.readFileSync(evt), form, game);
        e.name = path.parse(evt).name;
        if (game === Z64LibSupportedGames.MAJORAS_MASK) {
            if (e.model.readUInt8(0x500B) === BackwardsCompat.OLD_MM_ADULT_SIZED_FLAG) {
                e.age = 0x68;
            }
        }
        bus.emit(Z64OnlineEvents.REGISTER_CUSTOM_MODEL, e);
    }

    @EventHandler(BackwardsCompat.EVEN_OLDER_OOT_ADULT_EVT)
    onCustomModelAdult_backcompat2(evt: string) {
        this.handleOldCrap(evt, Z64LibSupportedGames.OCARINA_OF_TIME, AgeOrForm.ADULT);
    }

    @EventHandler(BackwardsCompat.EVEN_OLDER_OOT_CHILD_EVT)
    onCustomModelChild_backcompat2(evt: string) {
        this.handleOldCrap(evt, Z64LibSupportedGames.OCARINA_OF_TIME, AgeOrForm.CHILD);
    }

    @EventHandler(BackwardsCompat.OLD_MM_MODEL_EVT)
    onCustomModelChild_mm_backcompat(evt: string) {
        this.handleOldCrap(evt, Z64LibSupportedGames.MAJORAS_MASK, AgeOrForm.HUMAN);
    }

    @EventHandler(BackwardsCompat.OLD_OOT_EQUIP_EVT)
    onCustomEquipment_oot_backcompat(evt: any) {
        //this.onLoadEQExternal(evt);
    }

}