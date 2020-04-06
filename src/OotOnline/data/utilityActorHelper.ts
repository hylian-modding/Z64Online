import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { IOOTCore, OotEvents, Age } from "modloader64_api/OOT/OOTAPI";
import { InjectCore } from "modloader64_api/CoreInjection";
import { EventHandler } from "modloader64_api/EventHandler";
import { Command } from "modloader64_api/OOT/ICommandBuffer";
import { IActor } from "modloader64_api/OOT/IActor";

export class UtilityActorHelper {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;

    @EventHandler(OotEvents.ON_SCENE_CHANGE)
    onSceneChange(scene: number) {
        this.core.commandBuffer.runCommand(Command.SPAWN_ACTOR, 0x80600190, (success: boolean, result: number) => {
            if (success) {
                console.log(result.toString(16));
                let actor: IActor = this.core.actorManager.createIActorFromPointer(result);
                actor.position.x = this.core.link.position.x;
                actor.position.y = this.core.link.position.y;
                actor.position.z = this.core.link.position.z;
            }
        });
    }

}