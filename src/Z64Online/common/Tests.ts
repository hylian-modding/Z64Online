import { Init } from "modloader64_api/PluginLifecycle";
import CosmeticTests from "./cosmetics/tests/CosmeticTests";

export default class Z64OTests{

    @Init()
    init(){
        // #ifdef IS_DEV_BUILD
        CosmeticTests.onGoronTest();
        //CosmeticTests.onEquipmentTest();
        // #endif
    }

}