import { IModelReference, registerModel, Z64Online_ModelAllocation, Z64O_CosmeticEvents } from "@Z64Online/common/api/Z64API";
import { Z64O_Logger } from "@Z64Online/common/lib/Logger";
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

const enum NaviHaxStatus {
    UNINITIALIZED,
    OK,
    ERRORED,
    DEAD
}

export default class NaviModelManager {

    currentNaviModel: IModelReference | undefined;
    private naviHaxInstancePointer: number = -1;
    private naviHaxCodePointer: number = -1;
    private naviFnParamsPointer: number = -1;
    private naviFnHook: number = -1;
    private readonly naviFnParamsCount: number = 3;
    private naviHaxInstanceSize = -1;

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
            Z64O_Logger.debug(`Navi code successfully injected at ${this.naviHaxCodePointer.toString(16)}`);
            this.naviFnParamsPointer = this.ModLoader.heap!.malloc(0x10);
            this.naviHaxInstanceSize = hax.readUInt32BE(hax.byteLength - hax.readUInt32BE(hax.byteLength - 0x4) - 0x10 - 0x4);
            while (this.naviHaxInstanceSize % 0x10 !== 0) {
                this.naviHaxInstanceSize++;
            }
            this.naviHaxInstancePointer = this.ModLoader.heap!.malloc(this.naviHaxInstanceSize);
            this.ModLoader.emulator.rdramWrite32(this.naviFnParamsPointer + 0x0, this.naviHaxInstancePointer);
            this.ModLoader.emulator.rdramWrite32(this.naviFnParamsPointer + 0x4, this.ModLoader.emulator.rdramRead32(Z64_GLOBAL_PTR));
            this.ModLoader.emulator.rdramWrite32(this.naviFnParamsPointer + 0x8, 0xDEADBEEF);
            this.naviFnHook = this.naviHaxCodePointer + (hax.byteLength - hax.readUInt32BE(hax.byteLength - 0x4)) - 0x10;
            this.naviFnHook = this.ModLoader.emulator.rdramRead32(this.naviFnHook);
            Z64O_Logger.debug(`Hook function: ${this.naviFnHook.toString(16)}`);
            Z64O_Logger.debug(`Navi context: ${this.naviHaxInstancePointer.toString(16)}. Size: ${this.naviHaxInstanceSize.toString(16)}`);
        }).catch((err: any) => {
            this.ModLoader.logger.error(err);
        });
    }

    private clearInstance(inst: number, size: number) {
        this.ModLoader.emulator.rdramWriteBuffer(inst, this.ModLoader.utils.clearBuffer(this.ModLoader.emulator.rdramReadBuffer(inst, size)));
    }

    private injectCode() {
        this.ModLoader.emulator.rdramWrite32(this.naviFnParamsPointer + 8, this.currentNaviModel!.pointer);
        this.clearInstance(this.naviHaxInstancePointer, this.naviHaxInstanceSize);
        getCommandBuffer(this.core).arbitraryFunctionCall(this.naviFnHook, this.naviFnParamsPointer, this.naviFnParamsCount).then(() => {
            let status = this.ModLoader.emulator.rdramRead32(this.naviHaxInstancePointer);
            if (status === NaviHaxStatus.ERRORED) {
                Z64O_Logger.debug("Navi error code 2: Navi does not exist.");
            } else if (status === NaviHaxStatus.OK) {
                Z64O_Logger.debug("Navi hooked successfully.");
            }
        });
    }

    private unhookCode() {
        this.ModLoader.emulator.rdramWrite32(this.naviFnParamsPointer + 8, 0);
        getCommandBuffer(this.core).arbitraryFunctionCall(this.naviFnHook, this.naviFnParamsPointer, this.naviFnParamsCount).then(() => {
            let status = this.ModLoader.emulator.rdramRead32(this.naviHaxInstancePointer);
            if (status === NaviHaxStatus.DEAD) {
                Z64O_Logger.debug("Navi unhooked successfully.");
            }
        });
    }

    @EventHandler(Z64O_CosmeticEvents.LOAD_CUSTOM_NAVI)
    onLoad(evt: Z64Online_ModelAllocation) {
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
        if (this.naviHaxInstancePointer > 0) {
            this.ModLoader.heap!.free(this.naviHaxInstancePointer);
            this.naviHaxInstancePointer = -1;
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