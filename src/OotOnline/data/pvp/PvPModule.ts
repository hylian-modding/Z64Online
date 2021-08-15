import { InjectCore } from "modloader64_api/CoreInjection";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";

export class PvPModule{

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IZ64Main;

}

export class PvPServer{

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;

}