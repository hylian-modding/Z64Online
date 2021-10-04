import { IModLoaderAPI, IPluginServerConfig } from "modloader64_api/IModLoaderAPI";
import { IZ64GameMain } from "./common/types/Types";
import { ProxySide, SidedProxy } from "modloader64_api/SidedProxy/SidedProxy";
import path from 'path';
import { Z64_GAME } from "Z64Lib/src/Common/types/GameAliases";
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { setCommonConfigInst, Z64O_Common_Config } from "./common/lib/Settings";

export default class Z64Online implements IPluginServerConfig {
    @SidedProxy(ProxySide.UNIVERSAL, path.resolve(__dirname, "oot", "OotOnline.js"), "Z64Lib", () => { return Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME })
    OOT!: IZ64GameMain;
    @SidedProxy(ProxySide.UNIVERSAL, path.resolve(__dirname, "mm", "MMOnline.js"), "Z64Lib", () => { return Z64_GAME === Z64LibSupportedGames.MAJORAS_MASK })
    MM!: IZ64GameMain;

    ModLoader!: IModLoaderAPI;

    init(){
        setCommonConfigInst(this.ModLoader.config.registerConfigCategory("Z64O_Common_Config") as Z64O_Common_Config);
        this.ModLoader.config.setData("Z64O_Common_Config", "nameplates", true);
        this.ModLoader.config.setData("Z64O_Common_Config", "muteNetworkedSounds", false);
        this.ModLoader.config.setData("Z64O_Common_Config", "muteLocalSounds", false);
        this.ModLoader.config.setData("Z64O_Common_Config", "networkedVolume", 1.0);
        this.ModLoader.config.setData("Z64O_Common_Config", "localVolume", 1.0);
    }

    getServerURL(): string {
        if (this.OOT !== undefined) return this.OOT.getServerURL();
        if (this.MM !== undefined) return this.MM.getServerURL();
        return "";
    }
}