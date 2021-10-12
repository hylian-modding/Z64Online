import { Init } from "modloader64_api/PluginLifecycle";
import CosmeticTests from "./cosmetics/tests/CosmeticTests";

export default class Z64OTests{

    @Init()
    init(){
        CosmeticTests.onGoronTest();
        CosmeticTests.onEquipmentTest();
    }

}