import { InjectCore } from "modloader64_api/CoreInjection";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { IOOTCore } from "modloader64_api/OOT/OOTAPI";

export class PvPModule{

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;

}