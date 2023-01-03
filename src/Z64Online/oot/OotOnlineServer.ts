import { Z64O_PRIVATE_EVENTS } from "@Z64Online/common/api/InternalAPI";
import { Z64OnlineEvents, Z64_PlayerScene } from "@Z64Online/common/api/Z64API";
import { InjectCore } from "modloader64_api/CoreInjection";
import { EventHandler, EventsServer, EventServerJoined, EventServerLeft, bus } from "modloader64_api/EventHandler";
import { IModLoaderAPI, IPlugin } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { IPacketHeader, LobbyData, ServerNetworkHandler } from "modloader64_api/NetworkHandler";
import { Preinit } from "modloader64_api/PluginLifecycle";
import { ParentReference, SidedProxy, ProxySide } from "modloader64_api/SidedProxy/SidedProxy";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { InventoryItem } from "Z64Lib/API/OoT/OOTAPI";
import { Z64O_ScenePacket, Z64O_BottleUpdatePacket, Z64O_DownloadRequestPacket, Z64O_DownloadResponsePacket, Z64O_RomFlagsPacket, Z64O_UpdateSaveDataPacket, Z64O_UpdateKeyringPacket, Z64O_ClientSceneContextUpdate, Z64O_ErrorPacket } from "../common/network/Z64OPackets";
import { OotOSaveData } from "./save/OotoSaveData";
import { OotOnlineStorage, OotOnlineSave_Server } from "./storage/OotOnlineStorage";
import Z64Serialize from "@Z64Online/common/storage/Z64Serialize";
import { OotOnline_ServerModules } from "./OotOnline_ServerModules";
import { markIsServer } from "@Z64Online/common/types/GameAliases";

export default class OotOnlineServer {

    @InjectCore()
    core!: IZ64Main;
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @ParentReference()
    parent!: IPlugin;
    @SidedProxy(ProxySide.SERVER, OotOnline_ServerModules)
    modules!: OotOnline_ServerModules;

    constructor(){
        markIsServer();
    }

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
        } catch (err: any) { }
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
            storage.saveManager = new OotOSaveData(this.core.OOT!, this.ModLoader);
        }
        catch (err: any) {
            this.ModLoader.logger.error(err);
        }
    }

    @Preinit()
    preinit() {
        this.ModLoader.config.registerConfigCategory("Z64O_WorldEvents_Server");
        this.ModLoader.config.setData("Z64O_WorldEvents_Server", "Z64OEventsActive", []);
        this.ModLoader.config.setData("Z64O_WorldEvents_Server", "Z64OAssetsURL", []);
        this.ModLoader.privateBus.emit(Z64O_PRIVATE_EVENTS.SERVER_EVENT_DATA_GET, (this.ModLoader.config.registerConfigCategory("Z64O_WorldEvents_Server") as any)["Z64OEventsActive"]);
        this.ModLoader.privateBus.emit(Z64O_PRIVATE_EVENTS.SERVER_ASSET_DATA_GET, (this.ModLoader.config.registerConfigCategory("Z64O_WorldEvents_Server") as any)["Z64OAssetsURL"]);
    }

    @EventHandler(EventsServer.ON_LOBBY_DATA)
    onLobbyData(ld: LobbyData) {
        ld.data["Z64OEventsActive"] = (this.ModLoader.config.registerConfigCategory("Z64O_WorldEvents_Server") as any)["Z64OEventsActive"];
        ld.data["Z64OAssetsURL"] = (this.ModLoader.config.registerConfigCategory("Z64O_WorldEvents_Server") as any)["Z64OAssetsURL"];
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

    @ServerNetworkHandler('Z64O_ScenePacket')
    onSceneChange_server(packet: Z64O_ScenePacket) {
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
        } catch (err: any) {
        }
    }

    //------------------------------
    // Subscreen Syncing
    //------------------------------

    @ServerNetworkHandler('Z64O_BottleUpdatePacket')
    onBottle_server(packet: Z64O_BottleUpdatePacket) {
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
    @ServerNetworkHandler('Z64O_DownloadRequestPacket')
    onDownloadPacket_server(packet: Z64O_DownloadRequestPacket) {
        let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
        ) as OotOnlineStorage;
        if (storage === null) {
            return;
        }
        if (typeof storage.worlds[packet.player.data.world] === 'undefined') {
            this.ModLoader.logger.info(`Creating world ${packet.player.data.world} for lobby ${packet.lobby}.`);
            storage.worlds[packet.player.data.world] = new OotOnlineSave_Server();
        }
        let world = storage.worlds[packet.player.data.world];
        if (world.saveGameSetup) {
            // Game is running, get data.
            let resp = new Z64O_DownloadResponsePacket(packet.lobby, false);
            Z64Serialize.serialize(world.save).then((buf: Buffer) => {
                resp.save = buf;
                resp.keys = world.keys;
                this.ModLoader.serverSide.sendPacketToSpecificPlayer(resp, packet.player);
            }).catch(() => { });
        } else {
            // Game is not running, give me your data.
            Z64Serialize.deserialize(packet.save).then((data: any) => {
                Object.keys(data).forEach((key: string) => {
                    let obj = data[key];
                    world.save[key] = obj;
                });
                world.saveGameSetup = true;
                let resp = new Z64O_DownloadResponsePacket(packet.lobby, true);
                this.ModLoader.serverSide.sendPacketToSpecificPlayer(resp, packet.player);
            });
        }
    }

    @ServerNetworkHandler('Z64O_RomFlagsPacket')
    onRomFlags_server(packet: Z64O_RomFlagsPacket) {
        let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
        ) as OotOnlineStorage;
        if (storage === null) {
            return;
        }
        if (typeof storage.worlds[packet.player.data.world] === 'undefined') {
            this.ModLoader.logger.info(`Creating world ${packet.player.data.world} for lobby ${packet.lobby}.`);
            storage.worlds[packet.player.data.world] = new OotOnlineSave_Server();
        }
        let world = storage.worlds[packet.player.data.world];
        world.save.isVanilla = packet.isVanilla;
        world.save.isOotR = packet.isRando;
        world.save.hasFastBunHood = packet.hasFastBunHood;
        world.save.hasPotsanity = packet.hasPotsanity;
        world.save.PotsanityFlagSize = packet.potsanityFlagSize;
        if (world.save.PotsanityFlagSize > -1){
            this.ModLoader.logger.debug(`Setting up potsanity for lobby ${packet.lobby}`);
            world.save.collectible_override_flags = Buffer.alloc(world.save.PotsanityFlagSize);
        }
    }

    //------------------------------
    // Flag Syncing
    //------------------------------

    @ServerNetworkHandler('Z64O_UpdateSaveDataPacket')
    onSceneFlagSync_server(packet: Z64O_UpdateSaveDataPacket) {
        let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
        ) as OotOnlineStorage;
        if (storage === null) {
            return;
        }
        if (typeof storage.worlds[packet.player.data.world] === 'undefined') {
            if (packet.player.data.world === undefined){
                this.ModLoader.serverSide.sendPacket(new Z64O_ErrorPacket("The server has encountered an error with your world. (world id is undefined)", packet.lobby));
                return;
            }else{
                storage.worlds[packet.player.data.world] = new OotOnlineSave_Server();
            }
        }
        let world = storage.worlds[packet.player.data.world];
        storage.saveManager.mergeSave(storage, packet.save, world.save, ProxySide.SERVER).then((bool: boolean) => {
            if (bool) {
                Z64Serialize.serialize(world.save).then((buf: Buffer) => {
                    this.ModLoader.serverSide.sendPacket(new Z64O_UpdateSaveDataPacket(packet.lobby, buf, packet.player.data.world));
                }).catch((err: string) => { });
            }
        });
    }

    @ServerNetworkHandler('Z64O_UpdateKeyringPacket')
    onKeySync_Server(packet: Z64O_UpdateKeyringPacket) {
        let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
        ) as OotOnlineStorage;
        if (storage === null) {
            return;
        }
        if (typeof storage.worlds[packet.player.data.world] === 'undefined') {
            this.ModLoader.logger.info(`Creating world ${packet.player.data.world} for lobby ${packet.lobby}.`);
            storage.worlds[packet.player.data.world] = new OotOnlineSave_Server();
        }
        let world = storage.worlds[packet.player.data.world];
        storage.saveManager.processKeyRing(storage, packet.keys, world.keys, ProxySide.SERVER);
        this.ModLoader.serverSide.sendPacket(new Z64O_UpdateKeyringPacket(world.keys, packet.lobby, packet.player.data.world));
    }

    @ServerNetworkHandler('Z64O_ClientSceneContextUpdate')
    onSceneContextSync_server(packet: Z64O_ClientSceneContextUpdate) {
        this.sendPacketToPlayersInScene(packet);
    }

}