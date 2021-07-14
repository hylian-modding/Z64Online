import { NetworkHandler } from "modloader64_api/NetworkHandler";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { Z64O_WorldActorSpawnPacket } from "./WorldPackets";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { IOOTCore } from "modloader64_api/OOT/OOTAPI";
import { InjectCore } from "modloader64_api/CoreInjection";
import { IActor } from "modloader64_api/OOT/IActor";
import { EventHandler, EventsClient } from "modloader64_api/EventHandler";
import fs from 'fs';
import path from 'path';

export class WorldClient{

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;
    dummy: number = 0;

    @NetworkHandler('Z64O_WorldActorSpawnPacket')
    onRoomSpawn(packet: Z64O_WorldActorSpawnPacket){
        for (let i = 0; i < packet.actors.length; i++){
            this.core.commandBuffer.spawnActor(packet.actors[i].actorID, packet.actors[i].variable, packet.actors[i].rot, packet.actors[i].pos).then((actor: IActor)=>{
                this.ModLoader.math.rdramWriteV3i16(actor.pointer + 0xB4, packet.actors[i].rot);
                if (packet.actors[i].dummy){
                    actor.rdramWrite32(0x130, this.dummy);
                }
            });
        }
    }

    @EventHandler(EventsClient.ON_HEAP_READY)
    onHeapReady() {
        let buf = fs.readFileSync(path.resolve(__dirname, "dummy.ovl"));
        let final = this.ModLoader.heap!.malloc(buf.byteLength);
        this.ModLoader.emulator.rdramWriteBuffer(final, buf);
        this.core.commandBuffer.relocateOverlay(final, final + (buf.byteLength - buf.readUInt32BE(buf.byteLength - 0x4)), 0x80800000).then(()=>{
        });
        this.dummy = final + 0x390;
    }

}