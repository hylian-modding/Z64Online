// #ifdef IS_DEV_BUILD

import { Z64OnlineEvents, Z64Online_EquipmentPak } from '@Z64Online/common/api/Z64API';
import fs from 'fs';
import { bus } from 'modloader64_api/EventHandler';
import path from 'path';
import { Z64LibSupportedGames } from 'Z64Lib/API/Utilities/Z64LibSupportedGames';
import { Z64_GAME } from 'Z64Lib/src/Common/types/GameAliases';

export default class CosmeticTests {

    static onEquipmentTest() {
        if (Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME) {
            let p = path.resolve(global.ModLoader.startdir, "test_files", "Sword of the Hero.zobj");
            if (fs.existsSync(p)) {
                let evt = new Z64Online_EquipmentPak("Equipment Test", "Biggoron's Sword", fs.readFileSync(p));
                bus.emit(Z64OnlineEvents.LOAD_EQUIPMENT_PAK, evt);
            }
        }
    }

}

// #endif