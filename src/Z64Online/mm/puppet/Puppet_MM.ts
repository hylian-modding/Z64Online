import { PuppetAbstract } from "@Z64Online/common/puppet/PuppetAbstract";
import { IZ64Clientside } from "@Z64Online/common/storage/Z64Storage";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { INetworkPlayer } from "modloader64_api/NetworkHandler";
import { IZ64Core } from "Z64Lib/API/Common/Z64API";
import PuppetData_MM from "./PuppetData_MM";

export default class Puppet_MM extends PuppetAbstract {
    constructor(
        player: INetworkPlayer,
        core: IZ64Core,
        ModLoader: IModLoaderAPI,
        parent: IZ64Clientside
    ) {
        super(player, core, ModLoader, parent);
        this.data = new PuppetData_MM(this, 0, this.ModLoader);
    }
}