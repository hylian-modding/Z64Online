import { InjectCore } from "modloader64_api/CoreInjection";
import { IModLoaderAPI, ModLoaderEvents } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { IOOTCore, IOvlPayloadResult, OotEvents } from "modloader64_api/OOT/OOTAPI";
import { IWorldEvent } from "../WorldEvents";
import { EventHandler, EventsClient } from "modloader64_api/EventHandler";
import { AssetHeap } from "../AssetHeap";
import { Init, Postinit, Preinit } from "modloader64_api/PluginLifecycle";
import path from "path";
import fs from 'fs';

export class MM implements IWorldEvent {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;
    moon!: IOvlPayloadResult;
    heap!: AssetHeap;
    moonPointer!: number;

    @Preinit()
    preinit() {
        this.heap = new AssetHeap(this.ModLoader, "MM", undefined, path.resolve(global.ModLoader.startdir, "MM"));
        this.heap.makeSilent(true);
        this.heap.preinit();
    }

    @Init()
    init() {
        this.heap.init();
    }

    @Postinit()
    postinit() {
        this.heap.postinit();
    }

    @EventHandler(ModLoaderEvents.ON_ROM_PATCHED)
    onRomPatched(evt: any) {
        this.heap.onRomPatched(evt);
    }

    @EventHandler(ModLoaderEvents.ON_SOFT_RESET_PRE)
    onSoftReset1() {
        this.heap.pre_reset();
    }

    @EventHandler(ModLoaderEvents.ON_SOFT_RESET_POST)
    onSoftReset2() {
        this.heap.post_reset();
    }

    @EventHandler(EventsClient.ON_INJECT_FINISHED)
    onPayload() {
        fs.writeFileSync(path.resolve(__dirname, "rendering.ovl"), this.heap.assets.get("assets/payloads/E0/moon.ovl")!);
        fs.writeFileSync(path.resolve(__dirname, "rendering.json"), this.heap.assets.get("assets/payloads/E0/moon.json")!);
        let evt = {result: this.ModLoader.payloadManager.parseFile(path.resolve(__dirname, "rendering.ovl"))};
        this.ModLoader.utils.setTimeoutFrames(() => {
            let result: IOvlPayloadResult = evt.result;
            this.moonPointer = this.heap.heap!.malloc(0x10);
            this.ModLoader.emulator.rdramWrite32(this.moonPointer, result.params);
            this.moon = result;
        }, 20);
    }

    @EventHandler(OotEvents.ON_SCENE_CHANGE)
    onScene(scene: number) {
        this.ModLoader.utils.setTimeoutFrames(() => {
            this.moon.spawn(this.moon, (success: boolean, result: number) => {
                if (success) {
                    console.log(result.toString(16));
                    let a = this.core.actorManager.createIActorFromPointer(result);
                    a.position.x = 0;
                    a.position.y = 5000.0;
                    a.position.z = 0;
                }
                return {};
            });
        }, 20);
    }
}