import { onViUpdate } from "modloader64_api/PluginLifecycle";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { string_ref } from "modloader64_api/Sylvain/ImGui";
import { InjectCore } from "modloader64_api/CoreInjection";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import path from 'path';
import { ImGuiHandlerCommon } from "@Z64Online/common/gui/ImGuiHandlerCommon";
import fse from 'fs-extra';

export class ImGuiHandler_MM extends ImGuiHandlerCommon {

    @ModLoaderAPIInject()
    ModLoader: IModLoaderAPI = {} as any;
    @InjectCore()
    core: IZ64Main = {} as any;
    input: string_ref = [""];
    result: string_ref = [""];

    constructor() {
        super();
        // #ifdef IS_DEV_BUILD
        this.actorNames = JSON.parse(fse.readFileSync(path.resolve(__dirname, "ACTOR_NAMES.json")).toString());
        // #endif
    }

    @onViUpdate()
    onViUpdate() {
        super.onViUpdate();
    }
}