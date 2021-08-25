import { IModelManagerShim } from "@Z64Online/common/cosmetics/IModelManagerShim";
import { ModelManagerClient } from "@Z64Online/common/cosmetics/ModelManager";
import { Z64_PLAYER } from "Z64Lib/src/Common/types/GameAliases";
import fs from 'fs';
import path from 'path';
import { object_link_child_zzconvert_manifest } from "./zobjs/MM/object_link_child_zzconvert_manifest";
import { AgeOrForm } from "@Z64Online/common/types/Types";
import { Z64_MANIFEST } from "@Z64Online/common/types/GameAliases";
import { proxy_universal } from "@Z64Online/common/assets/proxy_universal";
import { DumpRam, IModelReference, Z64OnlineEvents, Z64Online_ModelAllocation } from "@Z64Online/common/api/Z64API";
import { bus } from "modloader64_api/EventHandler";

export class ModelManagerMM implements IModelManagerShim {

    parent!: ModelManagerClient;

    constructor(parent: ModelManagerClient) {
        this.parent = parent;
        try {
            fs.mkdirSync(this.parent.cacheDir);
        } catch (err) { }
        fs.writeFileSync(path.join(this.parent.cacheDir, "human.zobj"), object_link_child_zzconvert_manifest);
        fs.writeFileSync(path.join(this.parent.cacheDir, "proxy_universal.zobj"), proxy_universal);
    }

    loadHumanModelMM(evt: any) {
        this.parent.loadFormProxy(evt.rom, AgeOrForm.HUMAN, path.join(this.parent.cacheDir, "human.zobj"), path.join(this.parent.cacheDir, "proxy_universal.zobj"), Z64_MANIFEST, 0x0011);
    }

    onRomPatched(evt: any): void {
        this.loadHumanModelMM(evt);
    }

    onSceneChange(scene: number): void {
        if (this.parent.managerDisabled) return;
        if (this.parent.lockManager) return;
        this.parent.allocationManager.getLocalPlayerData().AgesOrForms.forEach((ref: IModelReference) => {
            ref.loadModel();
        });
        let curRef: IModelReference | undefined;
        let link = this.findLink();
        this.parent.allocationManager.SetLocalPlayerModel(this.parent.core.MM!.save.form, this.parent.allocationManager.getLocalPlayerData().AgesOrForms.get(this.parent.core.MM!.save.form)!);
        let copy = this.parent.ModLoader.emulator.rdramReadBuffer(this.parent.allocationManager.getLocalPlayerData().AgesOrForms.get(this.parent.core.MM!.save.form)!.pointer, 0x6FB0);
        this.parent.ModLoader.emulator.rdramWriteBuffer(link, copy);
        this.parent.ModLoader.emulator.rdramWrite8(link + 0x5016, 0x1);
        curRef = this.parent.allocationManager.getLocalPlayerData().AgesOrForms.get(this.parent.core.MM!.save.form)!;
        if (scene > -1 && this.parent.allocationManager.getLocalPlayerData().currentScript !== undefined && curRef !== undefined) {
            let newRef = this.parent.allocationManager.getLocalPlayerData().currentScript!.onSceneChange(scene, curRef)
            this.parent.ModLoader.utils.setTimeoutFrames(() => {
                let a = new Z64Online_ModelAllocation(Buffer.alloc(1), this.parent.core.MM!.save.form);
                a.ref = newRef;
                if (this.parent.core.MM!.save.form === AgeOrForm.HUMAN) {
                    bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_CHILD_GAMEPLAY, a);
                }
            }, 1);
        }
        //bus.emit(Z64OnlineEvents.LOCAL_MODEL_CHANGE_FINISHED, new Z64Online_LocalModelChangeProcessEvt(this.parent.allocationManager.getLocalPlayerData().AgesOrForms.get(AgeOrForm.ADULT)!, this.parent.allocationManager.getLocalPlayerData().AgesOrForms.get(AgeOrForm.CHILD)!));

        if (this.parent.mainConfig.diagnosticMode) {
            DumpRam();
        }
    }

    findLink() {
        let index = this.parent.ModLoader.emulator.rdramRead8(Z64_PLAYER + 0x1E);
        let obj_list: number = 0x803FE8A8;
        obj_list += 0xC;
        let offset = index * 0x44;
        obj_list += offset;
        obj_list += 0x4;
        let pointer = this.parent.ModLoader.emulator.rdramRead32(obj_list);
        return pointer;
    }

    setupLinkModels(): void {
        this.parent.registerDefaultModel(AgeOrForm.HUMAN, path.join(this.parent.cacheDir, "human.zobj"));
        this.parent.allocationManager.SetLocalPlayerModel(AgeOrForm.CHILD, this.parent.puppetModels.get(AgeOrForm.HUMAN)!);
    }

}