import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";

export class Z64O_Logger {

    private static ModLoader: IModLoaderAPI;

    static setModLoaderInstance(ModLoader: IModLoaderAPI) {
        this.ModLoader = ModLoader;
    }

    static debug(msg: string) {
        // #ifdef IS_DEV_BUILD
        this.ModLoader.logger.debug(msg);
        // #endif
    }

}