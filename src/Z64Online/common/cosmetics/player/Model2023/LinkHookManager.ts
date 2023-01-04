import ArbitraryHook from '@Z64Online/common/lib/ArbitraryHook';
import { LinkHookManager_mm, LinkHookManager_oot10 } from '@Z64Online/overlay/LinkHookManager';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { IZ64Main } from 'Z64Lib/API/Common/IZ64Main';
import { Z64LibSupportedGames } from 'Z64Lib/API/Utilities/Z64LibSupportedGames';
import { Z64_GAME } from 'Z64Lib/src/Common/types/GameAliases';
import ModHook from 'Z64Lib/src/Common/CommandBuffer/ModHook';
import MipsAssembler from 'Z64Lib/API/Utilities/MipsAssembler';

export const enum LinkHookEnum {
    READY = "LINKHOOKS::READY"
}

export class LinkHookManager {

    hook!: ArbitraryHook;

    setup(ModLoader: IModLoaderAPI, core: IZ64Main) {
        let payload: Buffer = LinkHookManager_oot10;
        if (Z64_GAME !== Z64LibSupportedGames.OCARINA_OF_TIME) payload = LinkHookManager_mm;

        this.hook = new ArbitraryHook("LinkHookManager", ModLoader, core, payload);
        this.hook.injectPromise().then(() => {
            this.hook.runCreate(0, () => {
                /* Copy relocated payload */
                let c = ModLoader.emulator.rdramReadBuffer(this.hook.payloadPointer, payload.byteLength);
                let target = Buffer.from("LINKHOOK");
                /* Find LINKHOOK in binary */
                let index = c.indexOf(target);
                /* Copy LINKHOOK struct */
                let data = c.subarray(index, index + 0x18);
                let hook = ModLoader.emulator.rdramRead32(this.hook.instancePointer + 0x0C);
                ModHook.addHook(ModLoader, hook);
                /* nop problematic code */
                ModLoader.utils.setIntervalFrames(()=>{
                    if (ModLoader.emulator.rdramRead8(0x803A8AE0) > 0){
                    }
                }, 1);
                ModLoader.publicBus.emit(LinkHookEnum.READY, { ModLoader, data });
                console.log(this.hook.instancePointer.toString(16));
            });
        });
    }

    static inject(ModLoader: IModLoaderAPI, pointer: number, size: number, data: Buffer, callback: () => void) {
        /* Copy relocated payload */
        let c = ModLoader.emulator.rdramReadBuffer(pointer, size);
        let target = Buffer.from("LINKHOOK");
        /* Find LINKHOOK in binary */
        let index = c.indexOf(target);
        ModLoader.emulator.rdramWriteBuffer(pointer + index, data);
        callback();
    }

}