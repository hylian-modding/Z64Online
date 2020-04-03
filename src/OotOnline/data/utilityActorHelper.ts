import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { IOOTCore, OotEvents, Age } from "modloader64_api/OOT/OOTAPI";
import { InjectCore } from "modloader64_api/CoreInjection";
import { EventHandler } from "modloader64_api/EventHandler";
import { Command } from "modloader64_api/OOT/ICommandBuffer";

export class UtilityActorHelper {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;
    linkObjPointer: number = -1;

    @EventHandler(OotEvents.ON_SCENE_CHANGE)
    onSceneChange(scene: number) {
        /* this.core.commandBuffer.runCommand(Command.SPAWN_ACTOR, 0x80600190, (success: boolean, result: number) => {
            if (success) {
                this.linkObjPointer = this.ModLoader.emulator.rdramRead32(result + 0x13C);
            }
        }); */
    }

}