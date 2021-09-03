import { Z64_GAME, Z64_PLAYER } from "Z64Lib/src/Common/types/GameAliases";
import fs from 'fs';
import path from 'path';
import { AgeOrForm } from "@Z64Online/common/types/Types";
import { setPlayerProxy, Z64_MANIFEST, Z64_OBJECT_TABLE_RAM } from "@Z64Online/common/types/GameAliases";
import { proxy_universal } from "@Z64Online/common/assets/proxy_universal";
import { DumpRam, IModelReference, registerModel, Z64OnlineEvents, Z64Online_ModelAllocation } from "@Z64Online/common/api/Z64API";
import { bus } from "modloader64_api/EventHandler";
import { decodeAsset } from "@Z64Online/common/assets/decoder";
import { Z64RomTools } from "Z64Lib/API/Utilities/Z64RomTools";
import { ModelManagerClient } from "@Z64Online/common/cosmetics/player/ModelManager";
import { IModelManagerShim } from "@Z64Online/common/cosmetics/utils/IModelManagerShim";
import * as defines from "@Z64Online/common/cosmetics/Defines";
import { DummyManifest, UniversalAliasTable } from "@Z64Online/common/cosmetics/UniversalAliasTable";
import * as gear from './zobjs/gear';
import { object_link_human } from "./zobjs/object_link_human";
import { object_link_zora } from "./zobjs/object_link_zora";
import { object_link_nuts } from "./zobjs/object_link_nuts";
import { object_link_deity } from "./zobjs/object_link_deity";
import { object_link_goron } from "./zobjs/object_link_goron";

export class ModelManagerMM implements IModelManagerShim {

    parent!: ModelManagerClient;
    gearRef!: IModelReference;
    //
    MaskMap: Map<string, { offset: number, vrom: number, replacement: number, alias: number }> = new Map();

    constructor(parent: ModelManagerClient) {
        this.parent = parent;
    }

    dummy(): boolean {
        return false;
    }

    safetyCheck(): boolean {
        if (this.parent.core.MM!.helper.isPaused()) return false;
        if (this.dummy() || this.parent.core.MM!.helper.isLinkEnteringLoadingZone()) return false;
        return true;
    }

    unpackModels(evt: any) {
        try {
            fs.mkdirSync(this.parent.cacheDir);
        } catch (err: any) { }
        let extractIfMissing = (p: string, buf: Buffer, rom: Buffer) => {
            if (fs.existsSync(p)) return;
            fs.writeFileSync(p, decodeAsset(buf, rom));
        };
        extractIfMissing(path.join(this.parent.cacheDir, "human.zobj"), object_link_human, evt.rom);
        extractIfMissing(path.join(this.parent.cacheDir, "zora.zobj"), object_link_zora, evt.rom);
        extractIfMissing(path.join(this.parent.cacheDir, "nuts.zobj"), object_link_nuts, evt.rom);
        extractIfMissing(path.join(this.parent.cacheDir, "fd.zobj"), object_link_deity, evt.rom);
        extractIfMissing(path.join(this.parent.cacheDir, "goron.zobj"), object_link_goron, evt.rom);
        extractIfMissing(path.join(this.parent.cacheDir, "gear.zobj"), gear.gear, evt.rom);
        extractIfMissing(path.join(this.parent.cacheDir, "proxy_universal.zobj"), proxy_universal, evt.rom);
        setPlayerProxy(new UniversalAliasTable().createTable(fs.readFileSync(path.join(this.parent.cacheDir, "proxy_universal.zobj")), new DummyManifest()));
    }

    loadHumanModelMM(evt: any) {
        this.parent.loadFormProxy(evt.rom, AgeOrForm.HUMAN, path.join(this.parent.cacheDir, "human.zobj"), path.join(this.parent.cacheDir, "proxy_universal.zobj"), Z64_MANIFEST, 0x0011);
    }

    loadZoraModelMM(evt: any) {
        this.parent.loadFormProxy(evt.rom, AgeOrForm.ZORA, path.join(this.parent.cacheDir, "zora.zobj"), path.join(this.parent.cacheDir, "proxy_universal.zobj"), Z64_MANIFEST, 0x014D);
    }

    loadNutsModelMM(evt: any) {
        this.parent.loadFormProxy(evt.rom, AgeOrForm.ZORA, path.join(this.parent.cacheDir, "nuts.zobj"), path.join(this.parent.cacheDir, "proxy_universal.zobj"), Z64_MANIFEST, 0x0154);
    }

    loadFDModelMM(evt: any) {
        this.parent.loadFormProxy(evt.rom, AgeOrForm.FD, path.join(this.parent.cacheDir, "fd.zobj"), path.join(this.parent.cacheDir, "proxy_universal.zobj"), Z64_MANIFEST, 0x0010);
    }

    loadGoronModelMM(evt: any) {
        this.parent.loadFormProxy(evt.rom, AgeOrForm.FD, path.join(this.parent.cacheDir, "goron.zobj"), path.join(this.parent.cacheDir, "proxy_universal.zobj"), Z64_MANIFEST, 0x014C);
    }

    replaceMasks(evt: any) {
        let tools = new Z64RomTools(this.parent.ModLoader, Z64_GAME);

        let moveAndClear = (dma: number) => {
            let buf = tools.decompressDMAFileFromRom(evt.rom, dma);
            this.parent.ModLoader.utils.clearBuffer(buf);
            return tools.relocateFileToExtendedRom(evt.rom, dma, buf, 0, true)
        };

        this.MaskMap.set("goron_mask_t", { vrom: moveAndClear(678), offset: 0x14A0, replacement: gear.OBJECT_MASK_GORON_SCREAMING, alias: defines.DL_GORON_MASK_SCREAM });
        this.MaskMap.set("zora_mask_t", { vrom: moveAndClear(679), offset: 0xDB0, replacement: gear.OBJECT_MASK_ZORA_SCREAMING, alias: defines.DL_ZORA_MASK_SCREAM });
        this.MaskMap.set("deku_mask_t", { vrom: moveAndClear(680), offset: 0x1D90, replacement: gear.OBJECT_MASK_NUTS_SCREAMING, alias: defines.DL_DEKU_MASK_SCREAM });
        this.MaskMap.set("fd_mask_t", { vrom: moveAndClear(681), offset: 0x900, replacement: gear.OBJECT_MASK_DEITY_SCREAMING, alias: defines.DL_DEITY_MASK_SCREAM });

        this.parent.ModLoader.utils.setTimeoutFrames(() => {
            this.gearRef = registerModel(fs.readFileSync(path.join(this.parent.cacheDir, "gear.zobj")), true);
            this.gearRef.loadModel();
        }, 20);

    }

    onRomPatched(evt: any): void {
        this.unpackModels(evt);
        this.loadHumanModelMM(evt);
        this.loadZoraModelMM(evt);
        this.loadNutsModelMM(evt);
        this.loadFDModelMM(evt);
        this.loadGoronModelMM(evt);
        this.replaceMasks(evt);
    }

    onSceneChange(scene: number): void {
        if (this.parent.managerDisabled) return;
        if (this.parent.lockManager) return;
        this.parent.ModLoader.utils.setTimeoutFrames(() => {
            this.parent.allocationManager.getLocalPlayerData().AgesOrForms.forEach((ref: IModelReference) => {
                ref.loadModel();
            });
            let curRef: IModelReference | undefined;
            let link = this.findLink();
            this.parent.allocationManager.SetLocalPlayerModel(this.parent.core.MM!.save.form, this.parent.allocationManager.getLocalPlayerData().AgesOrForms.get(this.parent.core.MM!.save.form)!);
            let copy = this.parent.ModLoader.emulator.rdramReadBuffer(this.parent.allocationManager.getLocalPlayerData().AgesOrForms.get(this.parent.core.MM!.save.form)!.pointer, defines.ALIAS_PROXY_SIZE);
            this.parent.ModLoader.emulator.rdramWriteBuffer(link, copy);
            let restoreList = this.parent.ModLoader.emulator.rdramReadBuffer(link + 0x5017, 0x4).readUInt32BE(0);
            let count = this.parent.ModLoader.emulator.rdramRead32(restoreList);
            restoreList += 0x4;
            for (let i = 0; i < count; i++) {
                let addr = (i * 0x8) + restoreList;
                let alias = this.parent.ModLoader.emulator.rdramRead32(addr);
                let combiner = this.parent.ModLoader.emulator.rdramRead32(addr + 0x4);
                this.parent.ModLoader.emulator.rdramWrite32(link + alias, combiner);
            }
            if (this.gearRef !== undefined && this.gearRef.isLoaded) {
                let deku = this.gearRef.pointer + (gear.OBJECT_MASK_NUTS_NORMAL & 0x00FFFFFF);
                let goron = this.gearRef.pointer + (gear.OBJECT_MASK_GORON_NORMAL & 0x00FFFFFF);
                let zora = this.gearRef.pointer + (gear.OBJECT_MASK_ZORA_NORMAL & 0x00FFFFFF);
                let fd = this.gearRef.pointer + (gear.OBJECT_MASK_DEITY_NORMAL & 0x00FFFFFF);
                this.parent.ModLoader.emulator.rdramWrite32(link + defines.DL_DEKU_MASK + 0x4, deku);
                this.parent.ModLoader.emulator.rdramWrite32(link + defines.DL_GORON_MASK + 0x4, goron);
                this.parent.ModLoader.emulator.rdramWrite32(link + defines.DL_ZORA_MASK + 0x4, zora);
                this.parent.ModLoader.emulator.rdramWrite32(link + defines.DL_DEITY_MASK + 0x4, fd);
                this.MaskMap.forEach((obj) => {
                    for (let i = 0; i < 5; i++) {
                        this.parent.ModLoader.emulator.rdramWrite32(link + obj.alias + 0x4, (this.gearRef.pointer + (obj.replacement & 0x00FFFFFF)));
                        this.parent.ModLoader.rom.romWrite32(obj.vrom + (obj.offset + (i * 8)), 0xDE010000);
                        this.parent.ModLoader.rom.romWrite32(obj.vrom + (obj.offset + (i * 8) + 4), link + obj.alias);
                    }
                });
                this.parent.ModLoader.emulator.rdramWrite32(link + defines.DL_SWORD_HILT_1 + 0x4, this.gearRef.pointer + (gear.OBJECT_HILT_1 & 0x00FFFFFF));
                this.parent.ModLoader.emulator.rdramWrite32(link + defines.DL_SWORD_BLADE_1 + 0x4, this.gearRef.pointer + (gear.OBJECT_BLADE_1 & 0x00FFFFFF));
                this.parent.ModLoader.emulator.rdramWrite32(link + defines.DL_SWORD_HILT_2 + 0x4, this.gearRef.pointer + (gear.OBJECT_HILT_2 & 0x00FFFFFF));
                this.parent.ModLoader.emulator.rdramWrite32(link + defines.DL_SWORD_BLADE_2 + 0x4, this.gearRef.pointer + (gear.OBJECT_BLADE_2 & 0x00FFFFFF));
                this.parent.ModLoader.emulator.rdramWrite32(link + defines.DL_BOTTLE_EMPTY + 0x4, this.gearRef.pointer + (gear.OBJECT_BOTTLE & 0x00FFFFFF));
                this.parent.ModLoader.emulator.rdramWrite32(link + defines.DL_BOTTLE_FILLING + 0x4, this.gearRef.pointer + (gear.OBJECT_BOTTLE_CONTENT & 0x00FFFFFF));
            }
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
            this.parent.ModLoader.emulator.rdramWrite8(link + 0x5016, 0x1);
            //bus.emit(Z64OnlineEvents.LOCAL_MODEL_CHANGE_FINISHED, new Z64Online_LocalModelChangeProcessEvt(this.parent.allocationManager.getLocalPlayerData().AgesOrForms.get(AgeOrForm.ADULT)!, this.parent.allocationManager.getLocalPlayerData().AgesOrForms.get(AgeOrForm.CHILD)!));
            if (this.parent.mainConfig.diagnosticMode) {
                DumpRam();
            }
        }, 2);
        let link = this.findLink();
        this.parent.ModLoader.emulator.rdramWrite8(link + 0x5016, 0x1);
    }

    findLink() {
        let index = this.parent.ModLoader.emulator.rdramRead8(Z64_PLAYER + 0x1E);
        let obj_list: number = Z64_OBJECT_TABLE_RAM;
        obj_list += 0xC;
        let offset = index * 0x44;
        obj_list += offset;
        obj_list += 0x4;
        let pointer = this.parent.ModLoader.emulator.rdramRead32(obj_list);
        return pointer;
    }

    setupLinkModels(): void {
        this.parent.registerDefaultModel(AgeOrForm.HUMAN, path.join(this.parent.cacheDir, "human.zobj"));
        this.parent.allocationManager.SetLocalPlayerModel(AgeOrForm.HUMAN, this.parent.puppetModels.get(AgeOrForm.HUMAN)!);

        this.parent.registerDefaultModel(AgeOrForm.ZORA, path.join(this.parent.cacheDir, "zora.zobj"));
        this.parent.allocationManager.SetLocalPlayerModel(AgeOrForm.ZORA, this.parent.puppetModels.get(AgeOrForm.ZORA)!);

        this.parent.registerDefaultModel(AgeOrForm.DEKU, path.join(this.parent.cacheDir, "nuts.zobj"));
        this.parent.allocationManager.SetLocalPlayerModel(AgeOrForm.DEKU, this.parent.puppetModels.get(AgeOrForm.DEKU)!);

        this.parent.registerDefaultModel(AgeOrForm.FD, path.join(this.parent.cacheDir, "fd.zobj"));
        this.parent.allocationManager.SetLocalPlayerModel(AgeOrForm.FD, this.parent.puppetModels.get(AgeOrForm.FD)!);

        this.parent.registerDefaultModel(AgeOrForm.GORON, path.join(this.parent.cacheDir, "goron.zobj"));
        this.parent.allocationManager.SetLocalPlayerModel(AgeOrForm.GORON, this.parent.puppetModels.get(AgeOrForm.GORON)!);
    }

}