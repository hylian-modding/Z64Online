import { IModelReference, registerModel, Z64Online_ModelAllocation, Z64O_CosmeticEvents } from "@Z64Online/common/api/Z64API";
import { getCommandBuffer } from "@Z64Online/common/types/GameAliases";
import { Scene } from "@Z64Online/common/types/Types";
import { InjectCore } from "modloader64_api/CoreInjection";
import { EventHandler } from "modloader64_api/EventHandler";
import { IModLoaderAPI, ModLoaderEvents } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { Z64 } from "Z64Lib/API/imports";
import { optimize } from "Z64Lib/API/zzoptimize";
import { Z64_GAME, Z64_GLOBAL_PTR } from "Z64Lib/src/Common/types/GameAliases";
import { UniversalAliasTable } from "../UniversalAliasTable";
import Z64OManifestParser from "../Z64OManifestParser";
import FairyHax from "./FairyHax";

export default class NaviModelManager {

    currentNaviModel: IModelReference | undefined;
    private naviHaxCodePointer: number = -1;
    private naviFnParamsPointer: number = -1;
    private naviFnHook: number = -1;
    private readonly naviFnParamsCount: number = 2;

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IZ64Main;

    models: Map<string, IModelReference> = new Map();

    private loadCode() {
        let hax = FairyHax.getFairyHax(Z64_GAME)!;
        this.naviHaxCodePointer = this.ModLoader.heap!.malloc(hax.byteLength);
        this.ModLoader.emulator.rdramWriteBuffer(this.naviHaxCodePointer, hax);
        let cb = getCommandBuffer(this.core);
        cb.relocateOverlay(this.naviHaxCodePointer, this.naviHaxCodePointer + (hax.byteLength - hax.readUInt32BE(hax.byteLength - 0x4)), 0x80800000).then(() => {
            this.naviFnParamsPointer = this.ModLoader.heap!.malloc(0x10);
            this.ModLoader.emulator.rdramWrite32(this.naviFnParamsPointer + 0x0, 0xDEADBEEF);
            this.ModLoader.emulator.rdramWrite32(this.naviFnParamsPointer + 0x4, this.ModLoader.emulator.rdramRead32(Z64_GLOBAL_PTR));
            this.naviFnHook = this.naviHaxCodePointer + (hax.byteLength - hax.readUInt32BE(hax.byteLength - 0x4)) - 0x10;
            this.naviFnHook = this.ModLoader.emulator.rdramRead32(this.naviFnHook);
        }).catch((err: any) => {
            this.ModLoader.logger.error(err);
        });
    }

    private injectCode() {
        this.ModLoader.emulator.rdramWrite32(this.naviFnParamsPointer, this.currentNaviModel!.pointer + 0x20);
        getCommandBuffer(this.core).arbitraryFunctionCall(this.naviFnHook, this.naviFnParamsPointer, this.naviFnParamsCount);
    }

    @EventHandler(Z64O_CosmeticEvents.LOAD_CUSTOM_NAVI)
    onLoad(evt: Z64Online_ModelAllocation){
        let u = new UniversalAliasTable();
        let sb = u.generateMinimizedScaffolding(1, 0).sb;
        evt.model = Z64OManifestParser.convertZZConvertToZ64O(evt.model);
        let map = Z64OManifestParser.parse(evt.model);
        let offset = map["navi"];
        let op = optimize(evt.model, [offset], sb.writeOffset);
        sb.writeBuffer(op.zobj);
        sb.writeUInt32BE(0x06000000 + op.oldOffs2NewOffs.get(offset)!, 0x24);
        evt.model = sb.toBuffer();
        evt.ref = registerModel(evt.model, true);
        this.models.set(evt.name, evt.ref);
        this.currentNaviModel = evt.ref;
    }

    @EventHandler(ModLoaderEvents.ON_SOFT_RESET_PRE)
    onSoftReset() {
        if (this.naviHaxCodePointer > 0) {
            this.ModLoader.heap!.free(this.naviHaxCodePointer);
            this.naviHaxCodePointer = -1;
        }
        if (this.naviFnParamsPointer > 0) {
            this.ModLoader.heap!.free(this.naviFnParamsPointer);
            this.naviFnParamsPointer = -1;
        }
        if (this.currentNaviModel !== undefined) {
            this.currentNaviModel.isDead = true;
            this.currentNaviModel = undefined;
        }
    }

    @EventHandler(Z64.OotEvents.ON_SCENE_CHANGE)
    onSceneChanged(scene: Scene) {
        if (this.currentNaviModel !== undefined) {
            if (this.naviHaxCodePointer < 0) this.loadCode();
            this.currentNaviModel.loadModel();
            this.ModLoader.utils.setTimeoutFrames(this.injectCode.bind(this), 20);
        }
    }

}