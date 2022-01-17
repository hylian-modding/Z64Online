import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { ParentReference } from "modloader64_api/SidedProxy/SidedProxy";
import { InjectCore } from "modloader64_api/CoreInjection";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { IMMOClientside } from "../save/IMMOClientside";
import { Z64RomTools } from "Z64Lib/API/Utilities/Z64RomTools";
import { Z64_GAME } from "Z64Lib/src/Common/types/GameAliases";
import { SmartBuffer } from "smart-buffer";
import { Z64OnlineEvents, Z64Online_ModelAllocation } from "@Z64Online/common/api/Z64API";
import { AgeOrForm } from "Z64Lib/API/Common/Z64API";
import { Z64O_Logger } from "@Z64Online/common/lib/Logger";
import { BackwardsCompat } from "@Z64Online/common/compat/BackwardsCompat";

export class MMRando {
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI
    @ParentReference()
    parent!: IMMOClientside;
    @InjectCore()
    core!: IZ64Main;


}

export class MMR_Cosmetics {

    private static ADULT_HASH: string = "008016389d11e6ddf1627f0ca7581c7a";
    private static KAFEI_HASH: string = "76103b0cc8a2dda41e7af8b31a98e284";
    private static OOT_HASH: string = "22f6e9fde6154e34814dbbc851aa23dd";
    private static MM_HASH: string = "3ba745c40f036c584c1f02b150402cbf";
    private static Kafei_Manifest: Buffer = Buffer.from('21506C617941734D616E6966657374300003576169737400000098F048616E642E520000001A8848616E642E4C0000001D08FFFFFFFFFFFFFFFFFFFFFFFFFFFF', 'hex');
    private static Adult_Manifest: Buffer = Buffer.from('21506C617941734D616E69666573743000035761697374000000BB0048616E642E520000010D5048616E642E4C0000010000FFFFFFFFFFFFFFFFFFFFFFFFFFFF', 'hex');
    private static Oot_Manifest: Buffer = Buffer.from('21506C617941734D616E69666573743000035761697374000000B0F048616E642E52000000D05848616E642E4C000000D528FFFFFFFFFFFFFFFFFFFFFFFFFFFF', 'hex');
    private static MM_Manifest: Buffer = Buffer.from('21506C617941734D616E69666573743000035761697374000000BDB048616E642E52000000D05848616E642E4C000000D528FFFFFFFFFFFFFFFFFFFFFFFFFFFF', 'hex');

    static extractMMRModel(ModLoader: IModLoaderAPI, rom: Buffer) {
        ModLoader.logger.info("Extracting MMR model...");
        let tools = new Z64RomTools(ModLoader, Z64_GAME);
        let zobj: Buffer = tools.decompressObjectFileFromRom(rom, 0x0011);
        let sb: SmartBuffer = new SmartBuffer();
        let hash = ModLoader.utils.hashBuffer(zobj.slice(0, 0x5000));
        Z64O_Logger.debug(`MMR Model hash: ${hash}`);
        sb.writeBuffer(zobj);
        switch (hash) {
            case this.KAFEI_HASH:
                sb.writeBuffer(this.Kafei_Manifest);
                break;
            case this.ADULT_HASH:
                sb.writeBuffer(this.Adult_Manifest);
                break;
            case this.OOT_HASH:
                sb.writeBuffer(this.Oot_Manifest);
                break;
            case this.MM_HASH:
                sb.writeBuffer(this.MM_Manifest);
                break;
        }
        let evt = new Z64Online_ModelAllocation(sb.toBuffer(), AgeOrForm.HUMAN, Z64_GAME);
        if (hash === this.ADULT_HASH) {
            evt.age = BackwardsCompat.OLD_MM_ADULT_SIZED_FLAG;
        }
        evt.name = "MMR Model";
        ModLoader.publicBus.emit(Z64OnlineEvents.REGISTER_CUSTOM_MODEL, evt);
    }

}