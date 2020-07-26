import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { IOOTCore, OotEvents, Age, IOotHelper, IOvlPayloadResult } from "modloader64_api/OOT/OOTAPI";
import { InjectCore } from "modloader64_api/CoreInjection";
import { EventHandler } from "modloader64_api/EventHandler";
import { Command } from "modloader64_api/OOT/ICommandBuffer";
import { IActor } from "modloader64_api/OOT/IActor";
import fs from 'fs';
import path from 'path';
import { onTick } from "modloader64_api/PluginLifecycle";
import { IOotOnlineHelpers } from "@OotOnline/OotoAPI/OotoAPI";
import { ParentReference } from "modloader64_api/SidedProxy/SidedProxy";

export class UtilityActorHelper {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;
    @ParentReference()
    parent!: IOotOnlineHelpers;
    sceneList: any;
    currentBank!: IActor;
    lastKnownBalance: number = 0;

    constructor() {
        this.sceneList = JSON.parse(fs.readFileSync(path.resolve(__dirname, "atm_locations.json")).toString());
    }

    @EventHandler(OotEvents.ON_SCENE_CHANGE)
    onSceneChange(scene: number) {
        //@ts-ignore
        this.currentBank = undefined;
        /* if (this.sceneList.hasOwnProperty(scene) || this.ModLoader.emulator.rdramRead8(0x80718000)) {
            (this.parent.getClientStorage()!.overlayCache["bank.ovl"] as IOvlPayloadResult).spawn((this.parent.getClientStorage()!.overlayCache["bank.ovl"] as IOvlPayloadResult), (success: boolean, result: number) => {
                if (success) {
                    console.log(result.toString(16));
                    let actor: IActor = this.core.actorManager.createIActorFromPointer(result);
                    actor.room = 0xFF;
                    try {
                        actor.position.x = this.sceneList[scene].x;
                        actor.position.y = this.sceneList[scene].y;
                        actor.position.z = this.sceneList[scene].z;
                    } catch (err) {
                        actor.position.x = 0;
                        actor.position.y = 0;
                        actor.position.z = 0;
                    }
                    this.currentBank = actor;
                }
                return {};
            });
        } */
    }

    @onTick()
    onTick() {
        if (this.ModLoader.emulator.rdramRead8(0x80718002) === 1 && this.currentBank !== undefined) {
            if (this.sceneList.hasOwnProperty(this.core.global.scene)) {
                this.currentBank.position.x = this.sceneList[this.core.global.scene].x;
                this.currentBank.position.y = this.sceneList[this.core.global.scene].y;
                this.currentBank.position.z = this.sceneList[this.core.global.scene].z;
            } else {
                this.currentBank.destroy();
                //@ts-ignore
                this.currentBank = undefined;
            }
            this.ModLoader.emulator.rdramWrite8(0x80718002, 0);
        }
    }

    makeRamDump() {
        fs.writeFileSync(global.ModLoader["startdir"] + "/ram_dump.bin", this.ModLoader.emulator.rdramReadBuffer(0x0, (16 * 1024 * 1024)));
    }

}