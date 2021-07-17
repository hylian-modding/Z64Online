import { ServerNetworkHandler } from 'modloader64_api/NetworkHandler';
import { IModLoaderAPI, IPlugin } from 'modloader64_api/IModLoaderAPI';
import { Z64O_WorldActorPossessedPacket, Z64O_WorldActorPossessedUpdatePacket, Z64O_WorldActorSyncPacket } from './WorldPackets';
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import { ParentReference } from 'modloader64_api/SidedProxy/SidedProxy';
import { Preinit } from 'modloader64_api/PluginLifecycle';
import { OotO_RoomPacket, Ooto_ScenePacket } from '../OotOPackets';
import { EventHandler, EventsServer } from 'modloader64_api/EventHandler';
import path from 'path';
import { Worker } from 'worker_threads';
import { OOTO_PRIVATE_EVENTS, SendToScene } from '../InternalAPI';
import { ThreadData } from './ThreadData';

export class WorldServerManager {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @ParentReference()
    parent!: IPlugin;
    thread!: Worker;

    @Preinit()
    preinit() {
        this.thread = new Worker(path.resolve(__dirname, "WorldThread.js"));
        this.thread.postMessage({id: "STARTUP", data: "WEE"});
        this.thread.on('message', (to: ThreadData)=>{
            switch(to.id){
                case "TO_PLAYER":
                    this.ModLoader.serverSide.sendPacketToSpecificPlayer(JSON.parse(to.data.packet), to.data.player);
                    break;
                case "TO_SCENE":
                    this.ModLoader.privateBus.emit(OOTO_PRIVATE_EVENTS.SEND_TO_SCENE, new SendToScene(JSON.parse(to.data.packet), to.data.scene));
                    break;
            }
        });
    }

    @EventHandler(EventsServer.ON_LOBBY_CREATE)
    onLobbyCreate(name: string){
        this.thread.postMessage({id: EventsServer.ON_LOBBY_CREATE, data: name});
    }

    @EventHandler(EventsServer.ON_LOBBY_DESTROY)
    onLobbyDestroy(name: string){
        this.thread.postMessage({id: EventsServer.ON_LOBBY_DESTROY, data: name});
    }

    @ServerNetworkHandler('Ooto_ScenePacket')
    onSceneChange_server(packet: Ooto_ScenePacket) {
        if (packet.scene > 101) return;
        this.thread.postMessage({id: 'Ooto_ScenePacket', data: packet});
    }

    @ServerNetworkHandler('OotO_RoomPacket')
    onRoomChange_server(packet: OotO_RoomPacket){
        if (packet.scene > 101) return;
        this.thread.postMessage({id: 'OotO_RoomPacket', data: packet});
    }

    @ServerNetworkHandler('Z64O_WorldActorSyncPacket')
    onPacket(packet: Z64O_WorldActorSyncPacket) {
        this.thread.postMessage({id: 'Z64O_WorldActorSyncPacket', data: packet});
    }

    @ServerNetworkHandler('Z64O_WorldActorPossessedPacket')
    onZ64O_WorldActorPossessedPacket(packet: Z64O_WorldActorPossessedPacket) {
        this.thread.postMessage({id: 'Z64O_WorldActorPossessedPacket', data: packet});
    }

    @ServerNetworkHandler('Z64O_WorldActorPossessedUpdatePacket')
    onZ64O_WorldActorPossessedUpdatePacket(packet: Z64O_WorldActorPossessedUpdatePacket) {
        this.thread.postMessage({id: 'Z64O_WorldActorPossessedUpdatePacket', data: packet});
    }

}