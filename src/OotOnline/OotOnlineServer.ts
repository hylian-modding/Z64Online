import { EventHandler, EventsServer, EventServerJoined, EventServerLeft, bus } from 'modloader64_api/EventHandler';
import { OotOnlineSave_Server, OotOnlineStorage } from './OotOnlineStorage';
import { ParentReference, SidedProxy, ProxySide } from 'modloader64_api/SidedProxy/SidedProxy';
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import { IModLoaderAPI, IPlugin } from 'modloader64_api/IModLoaderAPI';
import { ServerNetworkHandler, IPacketHeader, LobbyData } from 'modloader64_api/NetworkHandler';
import { Z64_PlayerScene, Z64OnlineEvents } from './Z64API/OotoAPI';
import { Ooto_ScenePacket, Ooto_BottleUpdatePacket, Ooto_DownloadRequestPacket, Ooto_ClientSceneContextUpdate, Ooto_DownloadResponsePacket, OotO_UpdateSaveDataPacket, OotO_UpdateKeyringPacket, OotO_RoomPacket } from './data/OotOPackets';
import { PuppetOverlordServer } from './data/linkPuppet/PuppetOverlord';
import { WorldEvents } from './WorldEvents/WorldEvents';
import { OotOSaveData } from './data/OotoSaveData';
import { InjectCore } from 'modloader64_api/CoreInjection';
import { InventoryItem, IOOTCore } from 'modloader64_api/OOT/OOTAPI';
import { Preinit } from 'modloader64_api/PluginLifecycle';
import { OOTO_PRIVATE_EVENTS } from './data/InternalAPI';
import { PvPServer } from './data/pvp/PvPModule';
import { WorldServer } from '@OotOnline/data/worldserver/WorldServer';

export default class OotOnlineServer {

    @InjectCore()
    core!: IOOTCore;
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @ParentReference()
    parent!: IPlugin;
    @SidedProxy(ProxySide.SERVER, PuppetOverlordServer)
    puppets!: PuppetOverlordServer;
    @SidedProxy(ProxySide.SERVER, WorldEvents)
    worldEvents!: WorldEvents;
    // #ifdef IS_DEV_BUILD
    @SidedProxy(ProxySide.SERVER, PvPServer)
    pvp!: PvPServer;
    worldTick: any;
    // #endif

    sendPacketToPlayersInScene(packet: IPacketHeader) {
        try {
            let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
                packet.lobby,
                this.parent
            ) as OotOnlineStorage;
            if (storage === null) {
                return;
            }
            Object.keys(storage.players).forEach((key: string) => {
                if (storage.players[key] === storage.players[packet.player.uuid]) {
                    if (storage.networkPlayerInstances[key].uuid !== packet.player.uuid) {
                        this.ModLoader.serverSide.sendPacketToSpecificPlayer(
                            packet,
                            storage.networkPlayerInstances[key]
                        );
                    }
                }
            });
        } catch (err) { }
    }

    @EventHandler(EventsServer.ON_LOBBY_CREATE)
    onLobbyCreated(lobby: string) {
        try {
            this.ModLoader.lobbyManager.createLobbyStorage(lobby, this.parent, new OotOnlineStorage());
            let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
                lobby,
                this.parent
            ) as OotOnlineStorage;
            if (storage === null) {
                return;
            }
            storage.saveManager = new OotOSaveData(this.core, this.ModLoader);
        }
        catch (err) {
            this.ModLoader.logger.error(err);
        }
    }

    @Preinit()
    preinit() {
        this.ModLoader.config.registerConfigCategory("OotO_WorldEvents_Server");
        this.ModLoader.config.setData("OotO_WorldEvents_Server", "Z64OEventsActive", []);
        this.ModLoader.config.setData("OotO_WorldEvents_Server", "Z64OAssetsURL", []);
        this.ModLoader.privateBus.emit(OOTO_PRIVATE_EVENTS.SERVER_EVENT_DATA_GET, (this.ModLoader.config.registerConfigCategory("OotO_WorldEvents_Server") as any)["Z64OEventsActive"]);
        this.ModLoader.privateBus.emit(OOTO_PRIVATE_EVENTS.SERVER_ASSET_DATA_GET, (this.ModLoader.config.registerConfigCategory("OotO_WorldEvents_Server") as any)["Z64OAssetsURL"]);
        this.worldTick = setInterval(()=>{
            let lobbies = this.ModLoader.lobbyManager.getAllLobbies();
            let names = Object.keys(lobbies);
            for (let i = 0; i < names.length; i++){
                lobbies[names[i]]["ModLoader64"]["data"]["OotOnline"]["worldServer"].tick();
            }
        }, 50);
    }

    @EventHandler(EventsServer.ON_LOBBY_DATA)
    onLobbyData(ld: LobbyData) {
        ld.data["Z64OEventsActive"] = (this.ModLoader.config.registerConfigCategory("OotO_WorldEvents_Server") as any)["Z64OEventsActive"];
        ld.data["Z64OAssetsURL"] = (this.ModLoader.config.registerConfigCategory("OotO_WorldEvents_Server") as any)["Z64OAssetsURL"];
    }

    @EventHandler(EventsServer.ON_LOBBY_JOIN)
    onPlayerJoin_server(evt: EventServerJoined) {
        let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            evt.lobby,
            this.parent
        ) as OotOnlineStorage;
        if (storage === null) {
            return;
        }
        storage.players[evt.player.uuid] = -1;
        storage.networkPlayerInstances[evt.player.uuid] = evt.player;
    }

    @EventHandler(EventsServer.ON_LOBBY_LEAVE)
    onPlayerLeft_server(evt: EventServerLeft) {
        let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            evt.lobby,
            this.parent
        ) as OotOnlineStorage;
        if (storage === null) {
            return;
        }
        delete storage.players[evt.player.uuid];
        delete storage.networkPlayerInstances[evt.player.uuid];
    }

    @ServerNetworkHandler('Ooto_ScenePacket')
    onSceneChange_server(packet: Ooto_ScenePacket) {
        try {
            let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
                packet.lobby,
                this.parent
            ) as OotOnlineStorage;
            if (storage === null) {
                return;
            }
            storage.players[packet.player.uuid] = packet.scene;
            storage.players[packet.player.uuid] = packet.room;
            this.ModLoader.logger.info(
                'Server: Player ' +
                packet.player.nickname +
                ' moved to scene ' +
                packet.scene +
                '.'
            );
            if (storage.worldServer.hasWorld(packet.player.data.world)){
                storage.worldServer.getWorld(packet.player.data.world).createScene(packet.scene);
                storage.worldServer.getWorld(packet.player.data.world).getScene(packet.scene).playerEnteredScene(packet.player);
                storage.worldServer.getWorld(packet.player.data.world).getScene(packet.scene).createRoom(packet.player.data.world, packet.scene, packet.room);
                storage.worldServer.getWorld(packet.player.data.world).getScene(packet.scene).getRoom(packet.room).playerEnteredRoom(this.ModLoader, packet.player);
            }
            bus.emit(Z64OnlineEvents.SERVER_PLAYER_CHANGED_SCENES, new Z64_PlayerScene(packet.player, packet.lobby, packet.scene));
        } catch (err) {
        }
    }

    @ServerNetworkHandler('OotO_RoomPacket')
    onRoomChange_server(packet: OotO_RoomPacket){
        let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
        ) as OotOnlineStorage;
        if (storage === null) {
            return;
        }
        let lastRoom = storage.players[packet.player.uuid];
        storage.players[packet.player.uuid] = packet.room;
        if (storage.worldServer.hasWorld(packet.player.data.world)){
            storage.worldServer.getWorld(packet.player.data.world).createScene(packet.scene);
            if (lastRoom !== undefined) storage.worldServer.getWorld(packet.player.data.world).getScene(packet.scene).getRoom(lastRoom).playerLeftRoom(packet.player);
            storage.worldServer.getWorld(packet.player.data.world).getScene(packet.scene).createRoom(packet.player.data.world, packet.scene, packet.room);
            storage.worldServer.getWorld(packet.player.data.world).getScene(packet.scene).getRoom(packet.room).playerEnteredRoom(this.ModLoader, packet.player);
        }
    }

    //------------------------------
    // Subscreen Syncing
    //------------------------------

    @ServerNetworkHandler('Ooto_BottleUpdatePacket')
    onBottle_server(packet: Ooto_BottleUpdatePacket) {
        let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
        ) as OotOnlineStorage;
        if (storage === null) {
            return;
        }
        let world = storage.worlds[packet.player.data.world];
        if (packet.contents === InventoryItem.NONE) return;
        switch (packet.slot) {
            case 0:
                world.save.inventory.bottle_1 = packet.contents;
                break;
            case 1:
                world.save.inventory.bottle_2 = packet.contents;
                break;
            case 2:
                world.save.inventory.bottle_3 = packet.contents;
                break;
            case 3:
                world.save.inventory.bottle_4 = packet.contents;
                break;
        }
    }

    // Client is logging in and wants to know how to proceed.
    @ServerNetworkHandler('Ooto_DownloadRequestPacket')
    onDownloadPacket_server(packet: Ooto_DownloadRequestPacket) {
        let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
        ) as OotOnlineStorage;
        if (storage === null) {
            return;
        }
        if (typeof storage.worlds[packet.player.data.world] === 'undefined'){
            this.ModLoader.logger.info(`Creating world ${packet.player.data.world} for lobby ${packet.lobby}.`);
            storage.worlds[packet.player.data.world] = new OotOnlineSave_Server();
            storage.worldServer.createWorld(packet.player.data.world);
        }
        let world = storage.worlds[packet.player.data.world];
        if (world.saveGameSetup) {
            // Game is running, get data.
            let resp = new Ooto_DownloadResponsePacket(packet.lobby, false);
            resp.save = Buffer.from(JSON.stringify(world.save));
            resp.keys = world.keys;
            this.ModLoader.serverSide.sendPacketToSpecificPlayer(resp, packet.player);
        } else {
            // Game is not running, give me your data.
            world.save = JSON.parse(packet.save.toString());
            world.saveGameSetup = true;
            let resp = new Ooto_DownloadResponsePacket(packet.lobby, true);
            this.ModLoader.serverSide.sendPacketToSpecificPlayer(resp, packet.player);
        }
        if (storage.worldServer.hasWorld(packet.player.data.world)){
            storage.worldServer.getWorld(packet.player.data.world).createScene(packet.scene);
            storage.worldServer.getWorld(packet.player.data.world).getScene(packet.scene).playerEnteredScene(packet.player);
            storage.worldServer.getWorld(packet.player.data.world).getScene(packet.scene).createRoom(packet.player.data.world, packet.scene, packet.room);
            storage.worldServer.getWorld(packet.player.data.world).getScene(packet.scene).getRoom(packet.room).playerEnteredRoom(this.ModLoader, packet.player);
        }
    }

    //------------------------------
    // Flag Syncing
    //------------------------------

    @ServerNetworkHandler('OotO_UpdateSaveDataPacket')
    onSceneFlagSync_server(packet: OotO_UpdateSaveDataPacket) {
        let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
        ) as OotOnlineStorage;
        if (storage === null) {
            return;
        }
        if (typeof storage.worlds[packet.player.data.world] === 'undefined'){
            this.ModLoader.logger.info(`Creating world ${packet.player.data.world} for lobby ${packet.lobby}.`);
            storage.worlds[packet.player.data.world] = new OotOnlineSave_Server();
            storage.worlds[packet.player.data.world].save = JSON.parse(packet.save.toString());
        }
        let world = storage.worlds[packet.player.data.world];
        storage.saveManager.mergeSave(packet.save, world.save, ProxySide.SERVER);
        this.ModLoader.serverSide.sendPacket(new OotO_UpdateSaveDataPacket(packet.lobby, Buffer.from(JSON.stringify(world.save)), packet.player.data.world));
    }

    @ServerNetworkHandler('OotO_UpdateKeyringPacket')
    onKeySync_Server(packet: OotO_UpdateKeyringPacket){
        let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
        ) as OotOnlineStorage;
        if (storage === null) {
            return;
        }
        if (typeof storage.worlds[packet.player.data.world] === 'undefined'){
            this.ModLoader.logger.info(`Creating world ${packet.player.data.world} for lobby ${packet.lobby}.`);
            storage.worlds[packet.player.data.world] = new OotOnlineSave_Server();
        }
        let world = storage.worlds[packet.player.data.world];
        storage.saveManager.processKeyRing(packet.keys, world.keys, ProxySide.SERVER);
        this.ModLoader.serverSide.sendPacket(new OotO_UpdateKeyringPacket(world.keys, packet.lobby, packet.player.data.world));
    }

    @ServerNetworkHandler('Ooto_ClientSceneContextUpdate')
    onSceneContextSync_server(packet: Ooto_ClientSceneContextUpdate) {
        this.sendPacketToPlayersInScene(packet);
    }

}