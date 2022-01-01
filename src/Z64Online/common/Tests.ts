// #ifdef IS_DEV_BUILD

import { InjectCore } from "modloader64_api/CoreInjection";
import { EventHandler } from "modloader64_api/EventHandler";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { Init } from "modloader64_api/PluginLifecycle";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { Z64 } from "Z64Lib/API/imports";
import CosmeticTests from "./tests/CosmeticTests";
import GeneralTests from "./tests/GeneralTests";

export default class Z64OTests{

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IZ64Main;

    @Init()
    init(){
        //CosmeticTests.onEquipmentTest();
        CosmeticTests.onNaviTest();
    }

    @EventHandler(Z64.OotEvents.ON_SCENE_CHANGE)
    onSceneChange(){
    }

}

// #endif