import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { ParentReference } from "modloader64_api/SidedProxy/SidedProxy";
import { InjectCore } from "modloader64_api/CoreInjection";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { IMMOClientside } from "../save/IMMOClientside";

export class MMRando {
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI
    @ParentReference()
    parent!: IMMOClientside;
    @InjectCore()
    core!: IZ64Main;


}
