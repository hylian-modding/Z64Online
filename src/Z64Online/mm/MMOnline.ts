import { IZ64GameMain } from "@Z64Online/common/types/Types";
import { ProxySide, SidedProxy } from "modloader64_api/SidedProxy/SidedProxy";
import path from 'path';
import { Preinit } from "modloader64_api/PluginLifecycle";
import { setupMM } from "@Z64Online/common/types/GameAliases";

export default class MMOnline implements IZ64GameMain {
    @SidedProxy(ProxySide.CLIENT, path.resolve(__dirname, "MMOnlineClient.js"))
    client: any;
    @SidedProxy(ProxySide.SERVER, path.resolve(__dirname, "MMOnlineServer.js"))
    server: any;

    @Preinit()
    preinit(): void {
        setupMM();
    }

    getServerURL(): string {
        return "";
    }
}