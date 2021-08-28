import { onTick } from "modloader64_api/PluginLifecycle";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { Z64_OBJECT_TABLE_RAM } from "@Z64Online/common/types/GameAliases";
import { Z64OnlineEvents, Z64_ObjectSpawn } from "@Z64Online/common/api/Z64API";

export class ObjectManager {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    lastData: Buffer = Buffer.alloc(0x9);

    @onTick()
    onTick() {
        let b = this.ModLoader.emulator.rdramReadBuffer(Z64_OBJECT_TABLE_RAM, 0x9);
        if (this.lastData.equals(b)) return;
        b.copy(this.lastData);
        let start = Z64_OBJECT_TABLE_RAM + 0xC;
        let size = this.ModLoader.emulator.rdramRead8(Z64_OBJECT_TABLE_RAM + 0x8) * 0x44;
        for (let i = 0; i < size; i += 0x4) {
            let raw = this.ModLoader.emulator.rdramRead32(start + i);
            let id = raw >> 16;
            let addr = this.ModLoader.emulator.rdramRead32(start + i + 0x4);
            let segment = ((addr >> 16) >> 8) / -1;
            if (segment !== 0x80) continue;
            if (id <= 0) continue;
            //this.ModLoader.publicBus.emit(Z64OnlineEvents.OBJECT_SPAWN, new Z64_ObjectSpawn(id, start + i + 0x4, addr));
        }
    }

}