import { Z64_GAME, Z64_PLAYER } from "Z64Lib/src/Common/types/GameAliases";
import fs from 'fs';
import path from 'path';
import { AgeOrForm } from "@Z64Online/common/types/Types";
import { setPlayerProxy, Z64_MANIFEST, Z64_OBJECT_TABLE_RAM } from "@Z64Online/common/types/GameAliases";
import { proxy_universal } from "@Z64Online/common/assets/proxy_universal";
import { DumpRam, IModelReference, registerModel, Z64OnlineEvents, Z64Online_ModelAllocation } from "@Z64Online/common/api/Z64API";
import { bus } from "modloader64_api/EventHandler";
import { decodeAsset } from "@Z64Online/common/assets/decoder";
import { fd } from "./zobjs/fd";
import { goron } from "./zobjs/goron";
import { human } from "./zobjs/human";
import { DEITY_MASK_GI, DEITY_MASK_NORMAL, DEITY_MASK_SCREAMING, DEKU_MASK_GI, DEKU_MASK_NORMAL, DEKU_MASK_SCREAMING, GORON_MASK_GI, GORON_MASK_NORMAL, GORON_MASK_SCREAMING, masks, ZORA_MASK_GI, ZORA_MASK_NORMAL, ZORA_MASK_SCREAMING } from "./zobjs/masks";
import { nuts } from "./zobjs/nuts";
import { zora } from "./zobjs/zora";
import { swords } from "./zobjs/swords";
import { bottle } from "./zobjs/bottle";
import { stick } from "./zobjs/stick";
import { Z64RomTools } from "Z64Lib/API/Utilities/Z64RomTools";
import { optimize } from "Z64Lib/API/zzoptimize";
import { ModelManagerClient } from "@Z64Online/common/cosmetics/player/ModelManager";
import { IModelManagerShim } from "@Z64Online/common/cosmetics/utils/IModelManagerShim";
import { SmartBuffer } from 'smart-buffer';
import { DL_DEITY_MASK, DL_DEITY_MASK_GI, DL_DEITY_MASK_SCREAM, DL_DEKU_MASK, DL_DEKU_MASK_GI, DL_DEKU_MASK_SCREAM, DL_GORON_MASK, DL_GORON_MASK_GI, DL_GORON_MASK_SCREAM, DL_ZORA_MASK, DL_ZORA_MASK_GI, DL_ZORA_MASK_SCREAM } from "@Z64Online/common/cosmetics/Defines";
import { DummyManifest, UniversalAliasTable } from "@Z64Online/common/cosmetics/UniversalAliasTable";

export class ModelManagerMM implements IModelManagerShim {

    parent!: ModelManagerClient;
    maskRef!: IModelReference;
    swordRef!: IModelReference;
    bottleRef!: IModelReference;
    stickRef!: IModelReference;
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
        } catch (err) { }
        let extractIfMissing = (p: string, buf: Buffer, rom: Buffer) => {
            if (fs.existsSync(p)) return;
            fs.writeFileSync(p, decodeAsset(buf, rom));
        };
        extractIfMissing(path.join(this.parent.cacheDir, "human.zobj"), human, evt.rom);
        extractIfMissing(path.join(this.parent.cacheDir, "zora.zobj"), zora, evt.rom);
        extractIfMissing(path.join(this.parent.cacheDir, "nuts.zobj"), nuts, evt.rom);
        extractIfMissing(path.join(this.parent.cacheDir, "fd.zobj"), fd, evt.rom);
        extractIfMissing(path.join(this.parent.cacheDir, "goron.zobj"), goron, evt.rom);
        extractIfMissing(path.join(this.parent.cacheDir, "masks.zobj"), masks, evt.rom);
        extractIfMissing(path.join(this.parent.cacheDir, "swords.zobj"), swords, evt.rom);
        extractIfMissing(path.join(this.parent.cacheDir, "bottle.zobj"), bottle, evt.rom);
        extractIfMissing(path.join(this.parent.cacheDir, "stick.zobj"), stick, evt.rom);
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

        this.MaskMap.set("goron_mask_t", { vrom: moveAndClear(678), offset: 0x14A0, replacement: GORON_MASK_SCREAMING, alias: DL_GORON_MASK_SCREAM });
        this.MaskMap.set("goron_mask_gi", { vrom: moveAndClear(801), offset: 0xBA0, replacement: GORON_MASK_GI, alias: DL_GORON_MASK_GI });
        this.MaskMap.set("zora_mask_t", { vrom: moveAndClear(679), offset: 0xDB0, replacement: ZORA_MASK_SCREAMING, alias: DL_ZORA_MASK_SCREAM });
        this.MaskMap.set("zora_mask_gi", { vrom: moveAndClear(802), offset: 0x7D0, replacement: ZORA_MASK_GI, alias: DL_ZORA_MASK_GI });
        this.MaskMap.set("deku_mask_t", { vrom: moveAndClear(680), offset: 0x1D90, replacement: DEKU_MASK_SCREAMING, alias: DL_DEKU_MASK_SCREAM });
        this.MaskMap.set("deku_mask_gi", { vrom: moveAndClear(933), offset: 0xB50, replacement: DEKU_MASK_GI, alias: DL_DEKU_MASK_GI });
        this.MaskMap.set("fd_mask_t", { vrom: moveAndClear(681), offset: 0x900, replacement: DEITY_MASK_SCREAMING, alias: DL_DEITY_MASK_SCREAM });
        this.MaskMap.set("fd_mask_gi", { vrom: moveAndClear(1047), offset: 0xB90, replacement: DEITY_MASK_GI, alias: DL_DEITY_MASK_GI });

        this.parent.ModLoader.utils.setTimeoutFrames(() => {
            this.maskRef = registerModel(fs.readFileSync(path.join(this.parent.cacheDir, "masks.zobj")), true);
            this.maskRef.loadModel();

            this.swordRef = registerModel(fs.readFileSync(path.join(this.parent.cacheDir, "swords.zobj")), true);
            this.swordRef.loadModel();

            this.bottleRef = registerModel(fs.readFileSync(path.join(this.parent.cacheDir, "bottle.zobj")), true);
            this.bottleRef.loadModel();

            this.stickRef = registerModel(fs.readFileSync(path.join(this.parent.cacheDir, "stick.zobj")), true);
            this.stickRef.loadModel();
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
        let fn = (buf: Buffer, dlists: Array<number>, segment: number = 0x06) => {
            fs.writeFileSync("./temp.zobj", buf);
            for (let i = 0; i < dlists.length; i++) {
                let op = optimize(buf, [dlists[i]], 0, segment, true);
                let offset = op.oldOffs2NewOffs.get(dlists[i])!;
                let sb = new SmartBuffer();
                sb.writeBuffer(op.zobj);
                while (sb.length % 0x10 !== 0) {
                    sb.writeUInt8(0xFF);
                }
                sb.writeUInt8(0xFF);
                while (sb.length % 0x10 !== 0) {
                    sb.writeUInt8(0xFF);
                }
                sb.writeOffset = sb.length - 4;
                sb.writeUInt32BE(offset);
                fs.writeFileSync(`./0x${dlists[i].toString(16)}.zobj`, sb.toBuffer());
            }
        };
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
        let copy = this.parent.ModLoader.emulator.rdramReadBuffer(this.parent.allocationManager.getLocalPlayerData().AgesOrForms.get(this.parent.core.MM!.save.form)!.pointer, 0x6BE0);
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
        if (this.maskRef !== undefined && this.maskRef.isLoaded) {
            let deku = this.maskRef.pointer + (DEKU_MASK_NORMAL & 0x00FFFFFF);
            let goron = this.maskRef.pointer + (GORON_MASK_NORMAL & 0x00FFFFFF);
            let zora = this.maskRef.pointer + (ZORA_MASK_NORMAL & 0x00FFFFFF);
            let fd = this.maskRef.pointer + (DEITY_MASK_NORMAL & 0x00FFFFFF);
            this.parent.ModLoader.emulator.rdramWrite32(link + DL_DEKU_MASK + 0x4, deku);
            this.parent.ModLoader.emulator.rdramWrite32(link + DL_GORON_MASK + 0x4, goron);
            this.parent.ModLoader.emulator.rdramWrite32(link + DL_ZORA_MASK + 0x4, zora);
            this.parent.ModLoader.emulator.rdramWrite32(link + DL_DEITY_MASK + 0x4, fd);
            this.MaskMap.forEach((obj) => {
                for (let i = 0; i < 5; i++) {
                    this.parent.ModLoader.emulator.rdramWrite32(link + obj.alias + 0x4, (this.maskRef.pointer + (obj.replacement & 0x00FFFFFF)));
                    this.parent.ModLoader.rom.romWrite32(obj.vrom + (obj.offset + (i * 8)), 0xDE010000);
                    this.parent.ModLoader.rom.romWrite32(obj.vrom + (obj.offset + (i * 8) + 4), link + obj.alias);
                }
            });
        }
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
        let obj_list: number = Z64_OBJECT_TABLE_RAM;
        obj_list += 0xC;
        let offset = index * 0x44;
        obj_list += offset;
        obj_list += 0x4;
        let pointer = this.parent.ModLoader.emulator.rdramRead32(obj_list);
        return pointer;
    }

    findGK() {
        let index = 0;
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