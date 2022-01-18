import ArbitraryHook from "@Z64Online/common/lib/ArbitraryHook";
import { SoTHax_mm } from "@Z64Online/overlay/SoTHax";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";

export default class SoTTrigger {

    private ModLoader: IModLoaderAPI;
    private core: IZ64Main;
    private hook!: ArbitraryHook;

    constructor(ModLoader: IModLoaderAPI, core: IZ64Main) {
        this.ModLoader = ModLoader;
        this.core = core;
    }

    trigger() {
        this.ModLoader.utils.setTimeoutFrames(() => {
            if (this.hook === undefined) {
                this.hook = new ArbitraryHook("SoT Hack", this.ModLoader, this.core, SoTHax_mm);
                this.hook.inject();
            }
            this.ModLoader.utils.setTimeoutFrames(() => {
                this.hook.runCreate(0, () => { });
            }, 1);
        }, 1);
    }

}