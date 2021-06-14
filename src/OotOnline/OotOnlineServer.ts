import { EventHandler, EventsServer, EventServerJoined, EventServerLeft, bus } from 'modloader64_api/EventHandler';
import { ActorHookingManagerServer } from './data/ActorHookingSystem';
import { OotOnlineStorage } from './OotOnlineStorage';
import { ParentReference, SidedProxy, ProxySide } from 'modloader64_api/SidedProxy/SidedProxy';
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import { IModLoaderAPI, IPlugin } from 'modloader64_api/IModLoaderAPI';
import { ServerNetworkHandler, IPacketHeader, LobbyData } from 'modloader64_api/NetworkHandler';
import { Z64_PlayerScene, Z64OnlineEvents } from './Z64API/OotoAPI';
import { Ooto_ScenePacket, Ooto_BottleUpdatePacket, Ooto_DownloadRequestPacket, Ooto_ClientSceneContextUpdate, OotO_isRandoPacket, Ooto_DownloadResponsePacket, OotO_UpdateSaveDataPacket, OotO_UpdateKeyringPacket } from './data/OotOPackets';
import { PuppetOverlordServer } from './data/linkPuppet/PuppetOverlord';
import { WorldEvents } from './WorldEvents/WorldEvents';
import { OotOSaveData } from './data/OotoSaveData';
import { InjectCore } from 'modloader64_api/CoreInjection';
import { IOOTCore } from 'modloader64_api/OOT/OOTAPI';
import { Preinit } from 'modloader64_api/PluginLifecycle';
import { OOTO_PRIVATE_EVENTS } from './data/InternalAPI';
import { PvPServer } from './data/pvp/PvPModule';

export default class OotOnlineServer {

    @InjectCore()
    core!: IOOTCore;
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @ParentReference()
    parent!: IPlugin;
    @SidedProxy(ProxySide.SERVER, ActorHookingManagerServer)
    actorHooks!: ActorHookingManagerServer;
    @SidedProxy(ProxySide.SERVER, PuppetOverlordServer)
    puppets!: PuppetOverlordServer;
    @SidedProxy(ProxySide.SERVER, WorldEvents)
    worldEvents!: WorldEvents;
    // #ifdef IS_DEV_BUILD
    @SidedProxy(ProxySide.SERVER, PvPServer)
    pvp!: PvPServer;
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
            this.ModLoader.logger.info(
                'Server: Player ' +
                packet.player.nickname +
                ' moved to scene ' +
                packet.scene +
                '.'
            );
            bus.emit(Z64OnlineEvents.SERVER_PLAYER_CHANGED_SCENES, new Z64_PlayerScene(packet.player, packet.lobby, packet.scene));
        } catch (err) {
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
        if (storage.saveGameSetup) {
            // Game is running, get data.
            let resp = new Ooto_DownloadResponsePacket(packet.lobby, false);
            resp.save = Buffer.from(JSON.stringify(storage.save));
            resp.keys = storage.keys;
            this.ModLoader.serverSide.sendPacketToSpecificPlayer(resp, packet.player);
        } else {
            // Game is not running, give me your data.
            storage.save = JSON.parse(packet.save.toString());
            storage.saveGameSetup = true;
            let resp = new Ooto_DownloadResponsePacket(packet.lobby, true);
            this.ModLoader.serverSide.sendPacketToSpecificPlayer(resp, packet.player);
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
        storage.saveManager.mergeSave(packet.save, storage.save, ProxySide.SERVER);
        this.ModLoader.serverSide.sendPacket(new OotO_UpdateSaveDataPacket(packet.lobby, Buffer.from(JSON.stringify(storage.save))));
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
        storage.saveManager.processKeyRing(packet.keys, storage.keys, ProxySide.SERVER);
        this.ModLoader.serverSide.sendPacket(new OotO_UpdateKeyringPacket(storage.keys, packet.lobby));
    }

    @ServerNetworkHandler('Ooto_ClientSceneContextUpdate')
    onSceneContextSync_server(packet: Ooto_ClientSceneContextUpdate) {
        this.sendPacketToPlayersInScene(packet);
    }

    @ServerNetworkHandler("OotO_isRandoPacket")
    onRandoPacket(packet: OotO_isRandoPacket) {
    }

}