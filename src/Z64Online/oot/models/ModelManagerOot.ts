import path from 'path';
import fs from 'fs';
import { ModelManagerClient } from '../../common/cosmetics/ModelManager';
import { AgeOrForm, Scene } from '@Z64Online/common/types/Types';
import { Z64_MANIFEST } from '@Z64Online/common/types/GameAliases';
import { DumpRam, IModelReference, Z64OnlineEvents, Z64Online_LocalModelChangeProcessEvt, Z64Online_ModelAllocation } from '@Z64Online/common/api/Z64API';
import { bus } from 'modloader64_api/EventHandler';
import { Z64_PLAYER } from 'Z64Lib/src/Common/types/GameAliases';
import { IModelManagerShim } from '../../common/cosmetics/IModelManagerShim';
import { proxy_universal } from '@Z64Online/common/assets/proxy_universal';
import { decodeAsset } from '@Z64Online/common/assets/decoder';
import { adult } from './zobjs/adult';
import { child } from './zobjs/child';

export class ModelManagerOot implements IModelManagerShim {

    parent!: ModelManagerClient;

    constructor(parent: ModelManagerClient) {
        this.parent = parent;
    }

    safetyCheck(): boolean {
        if (this.parent.core.OOT!.helper.isPaused()) return false;
        if (this.parent.core.OOT!.helper.Player_InBlockingCsMode() || this.parent.core.OOT!.helper.isLinkEnteringLoadingZone()) return false;
        return true;
    }

    setupLinkModels(): void {
        this.parent.registerDefaultModel(AgeOrForm.ADULT, path.join(this.parent.cacheDir, "adult.zobj"));
        this.parent.registerDefaultModel(AgeOrForm.CHILD, path.join(this.parent.cacheDir, "child.zobj"));
        this.parent.allocationManager.SetLocalPlayerModel(AgeOrForm.ADULT, this.parent.puppetModels.get(AgeOrForm.ADULT)!);
        this.parent.allocationManager.SetLocalPlayerModel(AgeOrForm.CHILD, this.parent.puppetModels.get(AgeOrForm.CHILD)!);
    }

    doesLinkObjExist(age: AgeOrForm) {
        let link_object_pointer: number = 0;
        let obj_list: number = 0x801D9C44;
        let obj_id = age === AgeOrForm.ADULT ? 0x00140000 : 0x00150000;
        for (let i = 4; i < 0x514; i += 4) {
            let value = this.parent.ModLoader.emulator.rdramRead32(obj_list + i);
            if (value === obj_id) {
                link_object_pointer = obj_list + i + 4;
                break;
            }
        }
        if (link_object_pointer === 0) return { exists: false, pointer: 0 };
        link_object_pointer = this.parent.ModLoader.emulator.rdramRead32(link_object_pointer);
        return { exists: this.parent.ModLoader.emulator.rdramReadBuffer(link_object_pointer + 0x5000, 0xB).toString() === "MODLOADER64", pointer: link_object_pointer };
    }

    findLink() {
        let index = this.parent.ModLoader.emulator.rdramRead8(Z64_PLAYER + 0x1E);
        let obj_list: number = 0x801D9C44;
        obj_list += 0xC;
        let offset = index * 0x44;
        obj_list += offset;
        obj_list += 0x4;
        let pointer = this.parent.ModLoader.emulator.rdramRead32(obj_list);
        return pointer;
    }

    findGameplayKeep() {
        let obj_list: number = 0x801D9C44;
        let obj_id = 0x00010000;
        for (let i = 4; i < 0x514; i += 4) {
            let value = this.parent.ModLoader.emulator.rdramRead32(obj_list + i);
            if (value === obj_id) {
                return this.parent.ModLoader.emulator.rdramRead32(obj_list + i + 4);
            }
        }
        return -1;
    }

    onSceneChange(scene: Scene): void {
        if (this.parent.managerDisabled) return;
        if (this.parent.lockManager) return;
        this.parent.allocationManager.getLocalPlayerData().AgesOrForms.forEach((ref: IModelReference) => {
            ref.loadModel();
        });
        let curRef: IModelReference | undefined;
        let link = this.doesLinkObjExist(this.parent.core.OOT!.save.age);
        if (link.exists) {
            this.parent.allocationManager.SetLocalPlayerModel(this.parent.core.OOT!.save.age, this.parent.allocationManager.getLocalPlayerData().AgesOrForms.get(this.parent.core.OOT!.save.age)!);
            let copy = this.parent.ModLoader.emulator.rdramReadBuffer(this.parent.allocationManager.getLocalPlayerData().AgesOrForms.get(this.parent.core.OOT!.save.age)!.pointer, 0x6CB0);
            this.parent.ModLoader.emulator.rdramWriteBuffer(link.pointer, copy);
            this.parent.ModLoader.emulator.rdramWrite8(link.pointer + 0x5016, 0x1);
            curRef = this.parent.allocationManager.getLocalPlayerData().AgesOrForms.get(this.parent.core.OOT!.save.age)!;
        }
        if (scene > -1 && this.parent.allocationManager.getLocalPlayerData().currentScript !== undefined && curRef !== undefined) {
            let newRef = this.parent.allocationManager.getLocalPlayerData().currentScript!.onSceneChange(scene, curRef)
            this.parent.ModLoader.utils.setTimeoutFrames(() => {
                let a = new Z64Online_ModelAllocation(Buffer.alloc(1), this.parent.core.OOT!.save.age);
                a.ref = newRef;
                if (this.parent.core.OOT!.save.age === AgeOrForm.ADULT) {
                    bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_ADULT_GAMEPLAY, a);
                } else {
                    bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_CHILD_GAMEPLAY, a);
                }
            }, 1);
        }
        bus.emit(Z64OnlineEvents.LOCAL_MODEL_CHANGE_FINISHED, new Z64Online_LocalModelChangeProcessEvt(this.parent.allocationManager.getLocalPlayerData().AgesOrForms.get(AgeOrForm.ADULT)!, this.parent.allocationManager.getLocalPlayerData().AgesOrForms.get(AgeOrForm.CHILD)!));

        if (this.parent.mainConfig.diagnosticMode) {
            DumpRam();
        }
    }

    loadAdultModelOOT(evt: any) {
        this.parent.loadFormProxy(evt.rom, AgeOrForm.ADULT, path.join(this.parent.cacheDir, "adult.zobj"), path.join(this.parent.cacheDir, "proxy_universal.zobj"), Z64_MANIFEST, 0x0015);
    }

    loadChildModelOOT(evt: any) {
        this.parent.loadFormProxy(evt.rom, AgeOrForm.CHILD, path.join(this.parent.cacheDir, "child.zobj"), path.join(this.parent.cacheDir, "proxy_universal.zobj"), Z64_MANIFEST, 0x0014);
    }

    unpackModels(evt: any){
        try {
            fs.mkdirSync(this.parent.cacheDir);
        } catch (err) { }
        fs.writeFileSync(path.join(this.parent.cacheDir, "adult.zobj"), decodeAsset(adult, evt.rom));
        fs.writeFileSync(path.join(this.parent.cacheDir, "child.zobj"), decodeAsset(child, evt.rom));
        fs.writeFileSync(path.join(this.parent.cacheDir, "proxy_universal.zobj"), decodeAsset(proxy_universal, evt.rom));
    }

    onRomPatched(evt: any) {
        this.unpackModels(evt);
        this.loadAdultModelOOT(evt);
        this.loadChildModelOOT(evt);
    }

}