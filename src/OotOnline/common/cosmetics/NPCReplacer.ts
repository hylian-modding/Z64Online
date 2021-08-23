import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { Postinit } from "modloader64_api/PluginLifecycle";
import { IModelReference } from "../api/Z64API";
import { EventHandler } from "modloader64_api/EventHandler";
import { OotEvents } from "modloader64_api/OOT/OOTAPI";
import { IActor } from "modloader64_api/OOT/IActor";

export interface INPCFace {
    id: number;
    ModLoader: IModLoaderAPI;
    patchBanks(ovlAddr: number, objAddr: number): void;
}

class MalonFace implements INPCFace {
    id: number = 0xD9;
    ModLoader: IModLoaderAPI;

    constructor(ModLoader: IModLoaderAPI) {
        this.ModLoader = ModLoader;
    }

    patchBanks(ovlAddr: number, objAddr: number): void {
        let offset = 0xED4;
        let eyes: Array<number> = [0x0, 0x400, 0x800];
        let mouth: Array<number> = [0xC00, 0xE00, 0x1000];
        mouth.forEach((p: number) => {
            this.ModLoader.emulator.rdramWrite32(ovlAddr + offset, p + objAddr);
            offset += 0x4;
        });
        eyes.forEach((p: number) => {
            this.ModLoader.emulator.rdramWrite32(ovlAddr + offset, p + objAddr);
            offset += 0x4;
        });
    }
}

export class NPCReplacer {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    facePatches: Map<number, INPCFace> = new Map();
    loadedReplacements: Map<number, IModelReference> = new Map();

    findNPCObject(index: number, size: number) {
        let obj_list: number = 0x801D9C44;
        obj_list += 0xC;
        let offset = index * 0x44;
        obj_list += offset;
        let id = this.ModLoader.emulator.rdramRead16(obj_list);
        obj_list += 0x4;
        let pointer = this.ModLoader.emulator.rdramRead32(obj_list);
        return { pointer, buf: this.ModLoader.emulator.rdramReadBuffer(pointer, size), id };
    }

    @Postinit()
    onPostInit() {
        this.facePatches.set(0xD9, new MalonFace(this.ModLoader));
    }

    @EventHandler(OotEvents.ON_ACTOR_SPAWN)
    onActorSpawn(actor: IActor) {
        /** TODO: Proper implementation. */
    }

}