import { Z64O_PRIVATE_EVENTS } from "@Z64Online/common/api/InternalAPI";
import { Z64OnlineEvents, Z64_PlayerScene } from "@Z64Online/common/api/Z64API";
import { CDNServer } from "@Z64Online/common/cdn/CDNServer";
import { parseFlagChanges } from "@Z64Online/common/lib/parseFlagChanges";
import Z64Serialize from "@Z64Online/common/storage/Z64Serialize";
import { markIsServer } from "@Z64Online/common/types/GameAliases";
import { WorldEvents } from "@Z64Online/common/WorldEvents/WorldEvents";
import { InjectCore } from "modloader64_api/CoreInjection";
import { EventHandler, EventsServer, EventServerJoined, EventServerLeft, bus } from "modloader64_api/EventHandler";
import { IModLoaderAPI, IPlugin } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { IPacketHeader, LobbyData, ServerNetworkHandler } from "modloader64_api/NetworkHandler";
import { Preinit } from "modloader64_api/PluginLifecycle";
import { ParentReference, SidedProxy, ProxySide } from "modloader64_api/SidedProxy/SidedProxy";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { InventoryItem } from "Z64Lib/API/MM/MMAPI";
import { Z64O_ScenePacket, Z64O_BottleUpdatePacket, Z64O_DownloadRequestPacket, Z64O_DownloadResponsePacket, Z64O_RomFlagsPacket, Z64O_UpdateSaveDataPacket, Z64O_UpdateKeyringPacket, Z64O_ClientSceneContextUpdate, Z64O_ErrorPacket } from "../common/network/Z64OPackets";
import { MMO_PictoboxPacket, Z64O_FlagUpdate, Z64O_MMR_QuestStorage, Z64O_MMR_Sync, Z64O_PermFlagsPacket, Z64O_SoTPacket, Z64O_SyncSettings } from "./network/MMOPackets";
import { PuppetOverlordServer_MM } from "./puppet/PuppetOverlord_MM";
//import { MM_PuppetOverlordServer } from "./puppet/MM_PuppetOverlord";
//import { PvPServer } from "./pvp/PvPModule";
import { mergePhotoData, MMOSaveData, PhotoSave } from "./save/MMOSaveData";
import TimeSyncServer from "./time/MMOTimeSyncServer";
import { MMOnlineStorage, MMOnlineSave_Server } from "./storage/MMOnlineStorage";
import bitwise from 'bitwise';

export default class MMOnlineServer {

    @InjectCore()
    core!: IZ64Main;
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @ParentReference()
    parent!: IPlugin;
    @SidedProxy(ProxySide.SERVER, PuppetOverlordServer_MM)
    puppets!: PuppetOverlordServer_MM;
    @SidedProxy(ProxySide.SERVER, WorldEvents)
    worldEvents!: WorldEvents;
    @SidedProxy(ProxySide.SERVER, CDNServer)
    cdn!: CDNServer;
    @SidedProxy(ProxySide.SERVER, TimeSyncServer)
    timeSync!: TimeSyncServer;

    sotActive: boolean = false;

    constructor() {
        markIsServer();
    }

    sendPacketToPlayersInScene(packet: IPacketHeader) {
        try {
            let storage: MMOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
                packet.lobby,
                this.parent
            ) as MMOnlineStorage;
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
            this.ModLoader.lobbyManager.createLobbyStorage(lobby, this.parent, new MMOnlineStorage());
            let storage: MMOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
                lobby,
                this.parent
            ) as MMOnlineStorage;
            if (storage === null) {
                return;
            }
            storage.saveManager = new MMOSaveData(this.core.MM!, this.ModLoader);
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
        let storage: MMOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            evt.lobby,
            this.parent
        ) as MMOnlineStorage;
        if (storage === null) {
            return;
        }
        storage.players[evt.player.uuid] = -1;
        storage.networkPlayerInstances[evt.player.uuid] = evt.player;
    }

    @EventHandler(EventsServer.ON_LOBBY_LEAVE)
    onPlayerLeft_server(evt: EventServerLeft) {
        let storage: MMOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            evt.lobby,
            this.parent
        ) as MMOnlineStorage;
        if (storage === null) {
            return;
        }
        delete storage.players[evt.player.uuid];
        delete storage.networkPlayerInstances[evt.player.uuid];
    }

    @ServerNetworkHandler('Z64O_ScenePacket')
    onSceneChange_server(packet: Z64O_ScenePacket) {
        try {
            let storage: MMOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
                packet.lobby,
                this.parent
            ) as MMOnlineStorage;
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
        let storage: MMOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
        ) as MMOnlineStorage;
        if (storage === null) {
            return;
        }
        let world = storage.worlds[packet.player.data.world];
        if (packet.contents === InventoryItem.NONE) return;
        switch (packet.slot) {
            case 0:
                world.save.inventory.FIELD_BOTTLE1 = packet.contents;
                break;
            case 1:
                world.save.inventory.FIELD_BOTTLE2 = packet.contents;
                break;
            case 2:
                world.save.inventory.FIELD_BOTTLE3 = packet.contents;
                break;
            case 3:
                world.save.inventory.FIELD_BOTTLE4 = packet.contents;
                break;
            case 4:
                world.save.inventory.FIELD_BOTTLE5 = packet.contents;
                break;
            case 5:
                world.save.inventory.FIELD_BOTTLE6 = packet.contents;
                break;
        }
    }

    // Client is logging in and wants to know how to proceed.
    @ServerNetworkHandler('Z64O_DownloadRequestPacket')
    onDownloadPacket_server(packet: Z64O_DownloadRequestPacket) {
        let storage: MMOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
        ) as MMOnlineStorage;
        if (storage === null) {
            return;
        }
        if (typeof storage.worlds[packet.player.data.world] === 'undefined') {
            this.ModLoader.logger.info(`Creating world ${packet.player.data.world} for lobby ${packet.lobby}.`);
            storage.worlds[packet.player.data.world] = new MMOnlineSave_Server();
        }
        let world = storage.worlds[packet.player.data.world];
        if (world.saveGameSetup) {
            // Game is running, get data.
            let resp = new Z64O_DownloadResponsePacket(packet.lobby, false);
            Z64Serialize.serialize(world.save).then((buf: Buffer) => {
                resp.save = buf;
                resp.keys = world.keys;
                this.ModLoader.serverSide.sendPacketToSpecificPlayer(resp, packet.player);
            }).catch((err: string) => { });
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
        let storage: MMOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
        ) as MMOnlineStorage;
        if (storage === null) {
            return;
        }
        if (typeof storage.worlds[packet.player.data.world] === 'undefined') {
            this.ModLoader.logger.info(`Creating world ${packet.player.data.world} for lobby ${packet.lobby}.`);
            storage.worlds[packet.player.data.world] = new MMOnlineSave_Server();
        }
        let world = storage.worlds[packet.player.data.world];
        world.save.isVanilla = packet.isVanilla;
        world.save.isMMR = packet.isRando;
    }

    @ServerNetworkHandler('MMO_PictoboxPacket')
    onPictobox(packet: MMO_PictoboxPacket) {
        let storage: MMOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
        ) as MMOnlineStorage;
        if (storage === null) {
            return;
        }
        let image = new PhotoSave();
        image.fromPhoto(packet.photo);
        if (storage.photoStorage.timestamp < image.timestamp) {
            mergePhotoData(storage.photoStorage, image);
            this.ModLoader.serverSide.sendPacket(packet);
        }
    }
    
    //------------------------------
    // Flag Syncing
    //------------------------------

    @ServerNetworkHandler('Z64O_UpdateSaveDataPacket')
    onSceneFlagSync_server(packet: Z64O_UpdateSaveDataPacket) {
        let storage: MMOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
        ) as MMOnlineStorage;
        if (storage === null) {
            return;
        }
        if (typeof storage.worlds[packet.player.data.world] === 'undefined') {
            if (packet.player.data.world === undefined) {
                this.ModLoader.serverSide.sendPacket(new Z64O_ErrorPacket("The server has encountered an error with your world. (world id is undefined)", packet.lobby));
                return;
            } else {
                storage.worlds[packet.player.data.world] = new MMOnlineSave_Server();
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
        let storage: MMOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
        ) as MMOnlineStorage;
        if (storage === null) {
            return;
        }
        if (typeof storage.worlds[packet.player.data.world] === 'undefined') {
            this.ModLoader.logger.info(`Creating world ${packet.player.data.world} for lobby ${packet.lobby}.`);
            storage.worlds[packet.player.data.world] = new MMOnlineSave_Server();
        }
        let world = storage.worlds[packet.player.data.world];
        storage.saveManager.processKeyRing(storage, packet.keys, world.keys, ProxySide.SERVER);
        this.ModLoader.serverSide.sendPacket(new Z64O_UpdateKeyringPacket(world.keys, packet.lobby, packet.player.data.world));
    }

    @ServerNetworkHandler('Z64O_PermFlagsPacket')
    onPermFlags(packet: Z64O_PermFlagsPacket) {
        let storage: MMOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
        ) as MMOnlineStorage;
        if (storage === null) {
            return;
        }
        parseFlagChanges(packet.flags, storage.permFlags);
        parseFlagChanges(packet.eventFlags, storage.permEvents);
        this.ModLoader.serverSide.sendPacket(new Z64O_PermFlagsPacket(storage.permFlags, storage.permEvents, packet.lobby));
    }

    @ServerNetworkHandler('Z64O_FlagUpdate')
    onFlagUpdate(packet: Z64O_FlagUpdate) {
        let storage: MMOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
        ) as MMOnlineStorage;
        if (storage === null) {
            return;
        }
        console.log("onFlagUpdate Server")
        if (this.sotActive) {
            this.ModLoader.logger.info(`Resetting server event flags on SoT`);
            storage.eventFlags = packet.eventFlags;
            return;
        }
        
        const indexBlacklist = [0x8, 0x1F, 0x49, 0x4B, 0x4C, 0x52, 0x5C];

        for (let i = 0; i < storage.eventFlags.byteLength; i++) {
            let byteStorage = storage.eventFlags.readUInt8(i);
            let bitsStorage = bitwise.byte.read(byteStorage as any);
            let byteIncoming = packet.eventFlags.readUInt8(i);
            let bitsIncoming = bitwise.byte.read(byteIncoming as any);

            if (!indexBlacklist.includes(i) && byteStorage !== byteIncoming) {
                console.log(`Server: Parsing flag: 0x${i.toString(16)}, byteIncoming: 0x${byteIncoming.toString(16)}, bitsIncoming: 0x${bitsIncoming} `);
                parseFlagChanges(packet.eventFlags, storage.eventFlags);
            }
            else if (indexBlacklist.includes(i) && byteStorage !== byteIncoming) {
                console.log(`Server: indexBlacklist: 0x${i.toString(16)}`);
                for (let j = 0; j <= 7; j++) {
                    switch (i) {
                        case 0x8: //Minigame_Disable_All_But_B_Button
                            if (j !== 0) bitsStorage[j] = bitsIncoming[j];
                            else console.log(`Server: Blacklisted event: 0x${i}, bit: ${j}`)
                            break;
                        case 0x1F: //Took Ride with Cremia (resets after ride?)
                            if (j !== 7) bitsStorage[j] = bitsIncoming[j];
                            else console.log(`Server: Blacklisted event: 0x${i}, bit: ${j}`)
                            break;
                        case 0x49: //Bombers Hide & Seek completed???
                            if (j !== 5) bitsStorage[j] = bitsIncoming[j];
                            else console.log(`Server: Blacklisted event: 0x${i}, bit: ${j}`)
                            break;
                        case 0x4B: //Bombers Hide & Seek completed twice??? || Bombers have shown Code?
                            if (j !== 6 && j !== 5) bitsStorage[j] = bitsIncoming[j];
                            else console.log(`Server: Blacklisted event: 0x${i}, bit: ${j}`)
                            break;
                        case 0x4C: //Caught all Bombers
                           if (j !== 6) bitsStorage[j] = bitsIncoming[j];
                           else console.log(`Server: Blacklisted event: 0x${i}, bit: ${j}`)
                           break;
                        case 0x52: //Disable__Hide_C_Buttons2, Disable__Hide_C_Buttons1
                            if (j !== 5 && j !== 3) bitsStorage[j] = bitsIncoming[j];
                            else console.log(`Server: Blacklisted event: 0x${i}, bit: ${j}`)
                            break;
                        case 0x5C: //Started Race with Gorman Brothers once?
                            if (j !== 0) bitsStorage[j] = bitsIncoming[j];
                            else console.log(`Server: Blacklisted event: 0x${i}, bit: ${j}`)
                            break;
                    }
                    let newByteStorage = bitwise.byte.write(bitsStorage); //write our updated bits into a byte
                    //console.log(`Server: Parsing flag: 0x${i.toString(16)}, byteStorage: 0x${byteStorage.toString(16)}, newByteStorage: 0x${newByteStorage.toString(16)} `);
                    if (newByteStorage !== byteStorage) {  //make sure the updated byte is different than the original
                        byteStorage = newByteStorage;
                        storage.eventFlags.writeUInt8(byteStorage, i); //write new byte into the event flag at index i
                        console.log(`Server: Parsing flag: 0x${i.toString(16)}, byteStorage: 0x${byteStorage.toString(16)}, newByteStorage: 0x${newByteStorage.toString(16)} `);
                    }
                }
            }
        }
        this.ModLoader.serverSide.sendPacket(new Z64O_FlagUpdate(storage.eventFlags, packet.lobby));
    }

    @ServerNetworkHandler('Z64O_SoTPacket')
    onSOT(packet: Z64O_SoTPacket) {
        console.log(`sotActive server: ${packet.isTriggered}`)
        this.sotActive = packet.isTriggered;
        this.ModLoader.serverSide.sendPacket(new Z64O_SoTPacket(packet.isTriggered, packet.lobby));
    }

    @ServerNetworkHandler('Z64O_MMR_QuestStorage')
    onQuestStorage(packet: Z64O_MMR_QuestStorage) {
        let storage: MMOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
        ) as MMOnlineStorage;
        if (storage === null) {
            return;
        }
        if (!storage.questStorage.equals(packet.questStorage)) {
            console.log(`onQuestStorage Server: questStorage updated`);

            let s = storage.questStorage;
            let i = packet.questStorage;

            for (let k = 0; k < s.byteLength; k++) {
                let tempStorage = s.readUInt8(k);
                let tempIncoming = i.readUInt8(k);

                if (tempStorage !== tempIncoming) {
                    tempStorage = tempIncoming;
                }
                s.writeUInt8(tempStorage, k);
            }
            storage.questStorage = s;

            this.ModLoader.serverSide.sendPacket(new Z64O_MMR_QuestStorage(storage.questStorage, packet.lobby));
        }
    }

    @ServerNetworkHandler('Z64O_ClientSceneContextUpdate')
    onSceneContextSync_server(packet: Z64O_ClientSceneContextUpdate) {
        this.sendPacketToPlayersInScene(packet);
    }

    @ServerNetworkHandler('Z64O_SyncSettings')
    Z64O_SyncSettings_server(packet: Z64O_SyncSettings) {
        if (packet.syncModeTime) {
            let storage: MMOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
                packet.lobby,
                this.parent
            ) as MMOnlineStorage;
            if (storage === null) {
                return;
            }
            storage.MM_IS_FAIRY = true;
            storage.MM_IS_KEY_KEEP = true;
            storage.MM_IS_SKULL = true;
        }
    }

    @ServerNetworkHandler('Z64O_MMR_Sync')
    onMMR_Sync(packet: Z64O_MMR_Sync) {
        let storage: MMOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
        ) as MMOnlineStorage;
        if (storage === null) {
            return;
        }
        storage.MM_IS_FAIRY = packet.isFairySync;
        storage.MM_IS_KEY_KEEP = packet.isKeySync;
        storage.MM_IS_SKULL = packet.isSkullSync;
    }
}