import { IModelReference, registerModel, Z64Online_ModelAllocation, Z64O_CosmeticEvents } from "@Z64Online/common/api/Z64API";
import ArbitraryHook from "@Z64Online/common/lib/ArbitraryHook";
import { Z64O_Logger } from "@Z64Online/common/lib/Logger";
import { getLink } from "@Z64Online/common/types/GameAliases";
import { Scene } from "@Z64Online/common/types/Types";
import { InjectCore } from "modloader64_api/CoreInjection";
import { EventHandler } from "modloader64_api/EventHandler";
import { IModLoaderAPI, ModLoaderEvents } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { LinkState } from "Z64Lib/API/Common/Z64API";
import { Z64 } from "Z64Lib/API/imports";
import { optimize } from "Z64Lib/API/zzoptimize";
import { Z64_GAME } from "Z64Lib/src/Common/types/GameAliases";
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

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IZ64Main;
    models: Map<string, IModelReference> = new Map();
    hook: ArbitraryHook | undefined;
    int: string | undefined;

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
        evt.ref = registerModel(evt.model, true)!;
        if (evt.ref === undefined) return;
        this.models.set(evt.name, evt.ref);
        this.currentNaviModel = evt.ref;
    }

    @EventHandler(ModLoaderEvents.ON_SOFT_RESET_PRE)
    onSoftReset() {
        if (this.currentNaviModel !== undefined) {
            this.currentNaviModel.isDead = true;
            this.currentNaviModel = undefined;
        }
        if (this.hook !== undefined){
            this.hook.clear();
            this.hook = undefined;
        }
    }

    @EventHandler(Z64.OotEvents.ON_SCENE_CHANGE)
    onSceneChanged(scene: Scene) {
        if (this.int !== undefined) return;
        this.int = this.ModLoader.utils.setIntervalFrames(()=>{
            if (getLink(this.core).state !== LinkState.STANDING) return;
            if (this.currentNaviModel !== undefined) {
                if (this.hook === undefined) {
                    this.hook = new ArbitraryHook("Navi", this.ModLoader, this.core, FairyHax.getFairyHax(Z64_GAME)!);
                    this.hook.inject();
                }
                this.currentNaviModel.loadModel();
                this.ModLoader.utils.setTimeoutFrames(() => {
                    this.hook!.runCreate(this.currentNaviModel!.pointer, () => {
                        Z64O_Logger.debug(`Navi successfully hooked.`);
                    });
                }, 20);
            }
            this.ModLoader.utils.clearIntervalFrames(this.int!);
            this.int = undefined;
        }, 1);
    }

}