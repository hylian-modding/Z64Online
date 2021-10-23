// #ifdef IS_DEV_BUILD

import { IModelReference, registerModel, Z64OnlineEvents, Z64Online_EquipmentPak } from '@Z64Online/common/api/Z64API';
import fs from 'fs';
import { bus } from 'modloader64_api/EventHandler';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import path from 'path';
import { IZ64Main } from 'Z64Lib/API/Common/IZ64Main';
import { Z64LibSupportedGames } from 'Z64Lib/API/Utilities/Z64LibSupportedGames';
import { Z64_GAME, Z64_GLOBAL_PTR } from 'Z64Lib/src/Common/types/GameAliases';

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

    static naviRef: IModelReference | undefined;
    static naviOffset: number = -1;
    static naviCode: number = -1
    static naviParams: number = -1;
    static naviParamsCount: number = 2;

    static onNaviTestSpawn(ModLoader: IModLoaderAPI, core: IZ64Main) {
        if (Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME) {
            if (this.naviRef === undefined) {
                let p = path.resolve(global.ModLoader.startdir, "test_files", "navi.zobj");
                if (fs.existsSync(p)) {
                    let m = fs.readFileSync(p);
                    this.naviOffset = m.indexOf("MODLOADER64");
                    this.naviOffset += 0x20;
                    let ref = registerModel(m, true);
                    this.naviRef = ref;
                }
            }
            if (this.naviRef !== undefined) {
                if (this.naviCode < 0) {
                    ModLoader.logger.debug("[TESTS]: Loading Navi hax...");
                    if (this.naviRef !== undefined) {
                        this.naviRef!.loadModel();
                    }
                    let code = fs.readFileSync(path.resolve(__dirname, "../../../oot/payloads/hax/NaviHax.ovl"));
                    this.naviCode = ModLoader.heap!.malloc(code.byteLength);
                    ModLoader.emulator.rdramWriteBuffer(this.naviCode, code);
                    core.OOT!.commandBuffer.relocateOverlay(this.naviCode, this.naviCode + (code.byteLength - code.readUInt32BE(code.byteLength - 0x4)), 0x80800000).then(() => {
                        this.naviParams = ModLoader.heap!.malloc(0x10);
                        ModLoader.emulator.rdramWrite32(this.naviParams, this.naviRef!.pointer + this.naviOffset);
                        ModLoader.emulator.rdramWrite32(this.naviParams + 0x4, ModLoader.emulator.rdramRead32(Z64_GLOBAL_PTR));
                    });
                }
                ModLoader.utils.setTimeoutFrames(() => {
                    ModLoader.logger.debug("[TESTS]: Engaging Navi hax...");
                    core.OOT!.commandBuffer.arbitraryFunctionCall(ModLoader.emulator.rdramRead32(this.naviCode + 0x110), this.naviParams, this.naviParamsCount);
                }, 20);
            }
        }
    }

}

// #endif