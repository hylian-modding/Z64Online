import ArbitraryHook from "@Z64Online/common/lib/ArbitraryHook";
import { DoorFix_mm, DoorFix_oot } from "@Z64Online/overlay/DoorFix";
import { ZeldaFix_oot } from "@Z64Online/overlay/ZeldaFix";
import { InjectCore } from "modloader64_api/CoreInjection";
import { EventHandler, EventsClient } from "modloader64_api/EventHandler";
import { IModLoaderAPI, ModLoaderEvents } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { onTick } from "modloader64_api/PluginLifecycle";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { IActor, Z64 } from "Z64Lib/API/imports";
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { Z64RomTools } from "Z64Lib/API/Utilities/Z64RomTools";
import { Z64_GAME } from "Z64Lib/src/Common/types/GameAliases";
import fs from 'fs';

class ActorFix {

    hook: ArbitraryHook;

    constructor(hook: ArbitraryHook) {
        this.hook = hook;
    }

    onSetupHook() {
        this.hook.inject();
    }

    onProcess(actor: IActor) {
        this.hook.runCreate(actor.pointer, () => { });
    }

}

export default class ActorFixManager {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IZ64Main;

    fixes: Map<number, ActorFix> = new Map();
    actorsAwaiting: IActor[] = [];
    doorPatch!: ArbitraryHook;
    zeldaPatch!: ArbitraryHook;

    OotHooks() {
        let door = new ActorFix(new ArbitraryHook("Door", this.ModLoader, this.core, DoorFix_oot));
        let setupDoors = (id: number) => {
            this.fixes.set(id, door);
        };
        setupDoors(0x0009);
        setupDoors(0x002E);

        this.fixes.set(0x0179, new ActorFix(new ArbitraryHook("Zelda", this.ModLoader, this.core, ZeldaFix_oot)));
    }

    MMHooks() {
        this.fixes.set(0x001E, new ActorFix(new ArbitraryHook("Door", this.ModLoader, this.core, DoorFix_mm)));
    }

    @EventHandler(EventsClient.ON_INJECT_FINISHED)
    onHeapReady(evt: any) {
        if (Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME) {
            //this.OotHooks();
        } else if (Z64_GAME === Z64LibSupportedGames.MAJORAS_MASK) {
            //this.MMHooks();
        }
        let wait = (hook: ArbitraryHook, tick: number = 20) => {
            this.ModLoader.utils.setTimeoutFrames(() => {
                hook.inject();
            }, tick);
        };
        let i = 1;
        this.fixes.forEach((fix: ActorFix) => {
            wait(fix.hook, i++);
        });
    }

    @EventHandler(Z64.Z64Events.ON_LOADING_ZONE)
    onSceneChange() {
        this.fixes.forEach((fix: ActorFix) => {
            fix.hook.runDestroy(0, () => { });
        });
    }

    @EventHandler(ModLoaderEvents.ON_SOFT_RESET_PRE)
    onSoftReset() {
        this.fixes.clear();
    }

    @EventHandler(Z64.Z64Events.ON_ACTOR_SPAWN)
    onActorSpawn(actor: IActor) {
        this.actorsAwaiting.push(actor);
    }

    @onTick()
    onTick() {
        if (this.actorsAwaiting.length > 0) {
            let actor = this.actorsAwaiting.shift()!;
            if (actor.exists) {
                if (this.fixes.has(actor.actorID)) {
                    this.fixes.get(actor.actorID)!.onProcess(actor);
                }
            }
        }
    }

    fixDinsfire(evt: any) {
        // I tried really hard to find a soft way to deal with this, but it wasn't to be.
        let tools: Z64RomTools = new Z64RomTools(this.ModLoader, Z64LibSupportedGames.OCARINA_OF_TIME);
        // Make Din's Fire not move to Link.
        let dins: Buffer = tools.decompressActorFileFromRom(evt.rom, 0x009F);
        let dhash: string = this.ModLoader.utils.hashBuffer(dins);
        if (dhash === "b08f7991b2beda5394e4a94cff15b50c") {
            this.ModLoader.logger.info("Patching Din's Fire...");
            dins.writeUInt32BE(0x0, 0x150);
            dins.writeUInt32BE(0x0, 0x158);
            dins.writeUInt32BE(0x0, 0x160);
            dins.writeUInt32BE(0x0, 0x19C);
            dins.writeUInt32BE(0x0, 0x1A4);
            dins.writeUInt32BE(0x0, 0x1AC);
        }
        tools.recompressActorFileIntoRom(evt.rom, 0x009F, dins);
    }

    fixDoors_Oot(evt: any) {
        let tools: Z64RomTools = new Z64RomTools(this.ModLoader, Z64LibSupportedGames.OCARINA_OF_TIME);
        let extendo_door = (id: number, offset: number, hash: string) => {
            // Make door instance slightly bigger.
            let door: Buffer = tools.decompressActorFileFromRom(evt.rom, id);
            let door_hash: string = this.ModLoader.utils.hashBuffer(door);
            if (door_hash !== hash) return;
            door.writeUInt32BE(door.readUInt32BE(offset) + 0x10, offset);
            tools.recompressActorFileIntoRom(evt.rom, id, door);
        };

        extendo_door(0x0009, 0xCBC, "78dd06e2505aa466d1bbf57d0f4b8381");
        extendo_door(0x002E, 0x1E1C, "0e069401bb09c107164be13a4b0658eb");
    }

    fixDoors_MM(evt: any){
        let tools: Z64RomTools = new Z64RomTools(this.ModLoader, Z64LibSupportedGames.MAJORAS_MASK);
        let extendo_door = (id: number, offset: number) => {
            // Make door instance slightly bigger.
            let door: Buffer = tools.decompressActorFileFromRom(evt.rom, id);
            let door_hash: string = this.ModLoader.utils.hashBuffer(door);
            door.writeUInt32BE(door.readUInt32BE(offset) + 0x10, offset);
            tools.recompressActorFileIntoRom(evt.rom, id, door);
        };

        extendo_door(0x001E, 0x187C);
    }

    @EventHandler(ModLoaderEvents.ON_ROM_PATCHED)
    onRomPatched(evt: any) {
        if (Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME) {
            this.fixDinsfire(evt);
            this.fixDoors_Oot(evt);
        } else if (Z64_GAME === Z64LibSupportedGames.MAJORAS_MASK) {
            this.fixDoors_MM(evt);
        }
    }

}