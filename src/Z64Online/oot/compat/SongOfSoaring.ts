import { parseFlagChanges } from "@Z64Online/common/lib/parseFlagChanges";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { Z64_SAVE } from "Z64Lib/src/Common/types/GameAliases";

export default class SongOfSoaringCompat{

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;

    isModLoaded(){
        return this.ModLoader.isModLoaded("SongOfSoaring");
    }

    getOwlData(){
        let owl = this.ModLoader.emulator.rdramReadBuffer(Z64_SAVE + 0x12A4, 0x2);
        return owl;
    }

    apply(key: string, data: Buffer){
        if (key === "SongOfSoaring"){
            let owl = this.ModLoader.emulator.rdramReadBuffer(Z64_SAVE + 0x12A4, 0x2);
            parseFlagChanges(data, owl);
            this.ModLoader.emulator.rdramWriteBuffer(Z64_SAVE + 0x12A4, owl);
        }
    }

}