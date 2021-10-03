import { Z64O_PRIVATE_EVENTS, SendToScene } from "@Z64Online/common/api/InternalAPI";
import { Z64OnlineEvents, Z64_PlayerScene, Z64_SaveDataItemSet } from "@Z64Online/common/api/Z64API";
import { CDNClient } from "@Z64Online/common/cdn/CDNClient";
import AnimationManager from "@Z64Online/common/cosmetics/animation/AnimationManager";
import { EmoteManager } from "@Z64Online/common/cosmetics/animation/emoteManager";
import { NPCReplacer } from "@Z64Online/common/cosmetics/npc/NPCReplacer";
import { parseFlagChanges } from "@Z64Online/common/lib/parseFlagChanges";
import { markAsRandomizer } from "@Z64Online/common/types/GameAliases";
import { AgeOrForm } from "@Z64Online/common/types/Types";
import { WorldEvents } from "@Z64Online/common/WorldEvents/WorldEvents";
import path from "path";
import { InjectCore } from "modloader64_api/CoreInjection";
import { DiscordStatus } from "modloader64_api/Discord";
import { EventHandler, PrivateEventHandler, EventsClient, bus } from "modloader64_api/EventHandler";
import { IModLoaderAPI, IPlugin, ModLoaderEvents } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { LobbyData, NetworkHandler } from "modloader64_api/NetworkHandler";
import { Preinit, Init, Postinit, onTick } from "modloader64_api/PluginLifecycle";
import { ParentReference, SidedProxy, ProxySide } from "modloader64_api/SidedProxy/SidedProxy";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { OotEvents, UpgradeCountLookup, AmmoUpgrade, IOvlPayloadResult, LinkState } from "Z64Lib/API/Common/Z64API";
import { InventoryItem, IInventory } from "Z64Lib/API/Oot/OOTAPI";
import { Strength } from "Z64Lib/API/OOT/OOTAPI";
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { Z64RomTools } from "Z64Lib/API/Utilities/Z64RomTools";
import { Multiworld, MultiWorld_ItemPacket } from "./compat/OotR";
import RomFlags from "./compat/RomFlags";
import { ImGuiHandler } from "./imgui/ImGuiHandler";
import { Notifications } from "./imgui/Notifications";
import { ModelManagerClient } from "../common/cosmetics/player/ModelManager";
import { Z64O_UpdateSaveDataPacket, Z64O_UpdateKeyringPacket, Z64O_ClientSceneContextUpdate, Z64O_BottleUpdatePacket, Z64O_DownloadRequestPacket, Z64O_RomFlagsPacket, Z64O_ScenePacket, Z64O_SceneRequestPacket, Z64O_DownloadResponsePacket, Z64O_ErrorPacket } from "../common/network/Z64OPackets";
import { IOotOnlineLobbyConfig, OotOnlineConfigCategory } from "./OotOnline";
import { ThiccOpa } from "./opa/ThiccOpa";
import { OOT_PuppetOverlordClient } from "./puppet/OOT_PuppetOverlord";
import { PvPModule } from "./pvp/PvPModule";
import { OotOSaveData } from "./save/OotoSaveData";
import { SoundManagerClient } from "./sounds/SoundManager";
import { OotOnlineStorage } from "./storage/OotOnlineStorage";
import { OotOnlineStorageClient } from "./storage/OotOnlineStorageClient";
import fs from 'fs';
import { ModelManagerOot } from "./models/ModelManagerOot";
import { ActorHookingManagerClient } from "./actor_systems/ActorHookingSystem";
import SongOfSoaringCompat from "./compat/SongOfSoaring";

export let GHOST_MODE_TRIGGERED: boolean = false;

export default class OotOnlineClient {
    @InjectCore()
    core!: IZ64Main;

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;

    @ParentReference()
    parent!: IPlugin;

    LobbyConfig: IOotOnlineLobbyConfig = {} as IOotOnlineLobbyConfig;
    clientStorage: OotOnlineStorageClient = new OotOnlineStorageClient();
    config!: OotOnlineConfigCategory;

    @SidedProxy(ProxySide.CLIENT, EmoteManager)
    emotes!: EmoteManager;
    @SidedProxy(ProxySide.CLIENT, ModelManagerClient)
    modelManager!: ModelManagerClient;
    @SidedProxy(ProxySide.CLIENT, AnimationManager)
    animManager!: AnimationManager;
    //@SidedProxy(ProxySide.CLIENT, ActorHookingManagerClient)
    actorHooks!: ActorHookingManagerClient;
    @SidedProxy(ProxySide.CLIENT, OOT_PuppetOverlordClient)
    puppets!: OOT_PuppetOverlordClient;
    @SidedProxy(ProxySide.CLIENT, SoundManagerClient)
    sound!: SoundManagerClient;
    @SidedProxy(ProxySide.CLIENT, ImGuiHandler)
    gui!: ImGuiHandler;
    @SidedProxy(ProxySide.CLIENT, WorldEvents)
    worldEvents!: WorldEvents;
    @SidedProxy(ProxySide.CLIENT, Notifications)
    notificationManager!: Notifications;
    // #ifdef IS_DEV_BUILD
    @SidedProxy(ProxySide.CLIENT, PvPModule)
    pvp!: PvPModule;
    @SidedProxy(ProxySide.CLIENT, CDNClient)
    cdn!: CDNClient;
    @SidedProxy(ProxySide.CLIENT, NPCReplacer)
    npc!: NPCReplacer;
    // #endif
    // Compat
    @SidedProxy(ProxySide.CLIENT, Multiworld)
    multiworld!: Multiworld;
    @SidedProxy(ProxySide.CLIENT, SongOfSoaringCompat)
    songOfSoaring!: SongOfSoaringCompat;
    opa!: ThiccOpa;
    syncContext: number = -1;
    syncTimer: number = 0;
    synctimerMax: number = 60 * 20;

    @EventHandler(Z64OnlineEvents.GHOST_MODE)
    onGhostInstruction(evt: any) {
        this.LobbyConfig.actor_syncing = false;
        this.LobbyConfig.data_syncing = false;
        this.clientStorage.first_time_sync = true;
        this.LobbyConfig.key_syncing = false;
        GHOST_MODE_TRIGGERED = true;
    }

    @Preinit()
    preinit() {
        this.config = this.ModLoader.config.registerConfigCategory("OotOnline") as OotOnlineConfigCategory;
        this.ModLoader.config.setData("OotOnline", "keySync", true);
        this.ModLoader.config.setData("OotOnline", "notifications", true);
        this.ModLoader.config.setData("OotOnline", "notificationSound", true);
        this.ModLoader.config.setData("OotOnline", "nameplates", true);
        this.ModLoader.config.setData("OotOnline", "muteNetworkedSounds", false);
        this.ModLoader.config.setData("OotOnline", "muteLocalSounds", false);
        this.ModLoader.config.setData("OotOnline", "syncMasks", true);
        this.ModLoader.config.setData("OotOnline", "syncBottleContents", true);
        this.ModLoader.config.setData("OotOnline", "diagnosticMode", false);
        this.ModLoader.config.setData("OotOnline", "autosaves", true);
        this.gui.settings = this.config;
        this.modelManager.child = new ModelManagerOot(this.modelManager);
    }

    @Init()
    init(): void {
        if (this.modelManager !== undefined) {
            this.modelManager.clientStorage = this.clientStorage;
        }
    }

    @Postinit()
    postinit() {
        this.clientStorage.scene_keys = JSON.parse(fs.readFileSync(__dirname + '/localization/scene_numbers.json').toString());
        this.clientStorage.localization = JSON.parse(fs.readFileSync(__dirname + '/localization/en_US.json').toString());
        let status: DiscordStatus = new DiscordStatus('Playing OotOnline', 'On the title screen');
        status.smallImageKey = 'ooto';
        status.partyId = this.ModLoader.clientLobby;
        status.partyMax = 30;
        status.partySize = 1;
        this.ModLoader.gui.setDiscordStatus(status);
        this.clientStorage.saveManager = new OotOSaveData(this.core.OOT!, this.ModLoader);
        this.ModLoader.utils.setIntervalFrames(() => {
            this.inventoryUpdateTick();
        }, 20);
    }

    @PrivateEventHandler(Z64O_PRIVATE_EVENTS.SEND_TO_SCENE)
    onSendToScene(send: SendToScene) {
        let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            send.packet.lobby,
            this.parent
        ) as OotOnlineStorage;
        if (storage === null) {
            return;
        }
        let players = Object.keys(storage.players);
        for (let i = 0; i < players.length; i++) {
            if (storage.players[players[i]] === send.scene) {
                this.ModLoader.serverSide.sendPacketToSpecificPlayer(send.packet, storage.networkPlayerInstances[players[i]]);
            }
        }
    }

    @EventHandler(EventsClient.ON_HEAP_READY)
    onHeapReady() {
        this.syncContext = this.ModLoader.heap!.malloc(0x100);
        global.ModLoader["Z64O_SyncContext"] = this.syncContext;
        this.ModLoader.logger.debug(`OotO Context: ${this.syncContext.toString(16)}`);

        if (RomFlags.isOotR) {
            if (this.multiworld.isRomMultiworld()) {
                RomFlags.isMultiworld = true;
                this.clientStorage.world = this.ModLoader.emulator.rdramRead8(this.ModLoader.emulator.rdramReadPtr32(this.multiworld.contextPointer, 0x0) + 0x4);
                this.multiworld.setPlayerName(this.ModLoader.me.nickname, this.clientStorage.world);
            }
        }
    }

    updateInventory() {
        if (this.core.OOT!.helper.isTitleScreen() || !this.core.OOT!.helper.isSceneNumberValid() || this.core.OOT!.helper.isPaused() || !this.clientStorage.first_time_sync) return;
        if (this.core.OOT!.helper.Player_InBlockingCsMode() || !this.LobbyConfig.data_syncing) return;
        let save = this.clientStorage.saveManager.createSave();
        if (this.syncTimer > this.synctimerMax) {
            this.clientStorage.lastPushHash = this.ModLoader.utils.hashBuffer(Buffer.from("RESET"));
            this.ModLoader.logger.debug("Forcing resync due to timeout.");
        }
        if (this.clientStorage.lastPushHash !== this.clientStorage.saveManager.hash) {
            this.ModLoader.privateBus.emit(Z64O_PRIVATE_EVENTS.DOING_SYNC_CHECK, {});
            this.ModLoader.privateBus.emit(Z64O_PRIVATE_EVENTS.LOCK_ITEM_NOTIFICATIONS, {});
            let packet = new Z64O_UpdateSaveDataPacket(this.ModLoader.clientLobby, save, this.clientStorage.world);
            if (this.songOfSoaring.isModLoaded()){
                packet.modData["SongOfSoaring"] = this.songOfSoaring.getOwlData();
            }
            this.ModLoader.clientSide.sendPacket(packet);
            this.clientStorage.lastPushHash = this.clientStorage.saveManager.hash;
            this.syncTimer = 0;
        }
    }

    @PrivateEventHandler(Z64O_PRIVATE_EVENTS.UPDATE_KEY_HASH)
    updateKeyHash(evt: any) {
        let keyHash: string = this.ModLoader.utils.hashBuffer(this.core.OOT!.save.keyManager.getRawKeyBuffer());
        this.clientStorage.keySaveHash = keyHash;
    }

    autosaveSceneData() {
        if (!this.core.OOT!.helper.isLinkEnteringLoadingZone() && this.core.OOT!.global.scene_framecount > 20 && this.clientStorage.first_time_sync) {
            // Slap key checking in here too.
            let keyHash: string = this.ModLoader.utils.hashBuffer(this.core.OOT!.save.keyManager.getRawKeyBuffer());
            if (keyHash !== this.clientStorage.keySaveHash) {
                this.clientStorage.keySaveHash = keyHash;
                this.ModLoader.clientSide.sendPacket(new Z64O_UpdateKeyringPacket(this.clientStorage.saveManager.createKeyRing(), this.ModLoader.clientLobby, this.clientStorage.world));
            }
            // and beans too why not.
            if (this.clientStorage.lastbeans !== this.core.OOT!.save.inventory.magicBeansCount) {
                this.clientStorage.lastbeans = this.core.OOT!.save.inventory.magicBeansCount;
                this.updateInventory();
            }
            let live_scene_chests: Buffer = this.core.OOT!.global.liveSceneData_chests;
            let live_scene_switches: Buffer = this.core.OOT!.global.liveSceneData_switch;
            let live_scene_collect: Buffer = this.core.OOT!.global.liveSceneData_collectable;
            let live_scene_clear: Buffer = this.core.OOT!.global.liveSceneData_clear;
            let live_scene_temp: Buffer = this.core.OOT!.global.liveSceneData_temp;
            let save_scene_data: Buffer = this.core.OOT!.global.getSaveDataForCurrentScene();
            let save: Buffer = Buffer.alloc(0x1c);
            live_scene_chests.copy(save, 0x0); // Chests
            live_scene_switches.copy(save, 0x4); // Switches
            live_scene_clear.copy(save, 0x8); // Room Clear
            live_scene_collect.copy(save, 0xc); // Collectables
            live_scene_temp.copy(save, 0x10); // Unused space.
            save_scene_data.copy(save, 0x14, 0x14, 0x18); // Visited Rooms.
            save_scene_data.copy(save, 0x18, 0x18, 0x1c); // Visited Rooms.
            let save_hash_2: string = this.ModLoader.utils.hashBuffer(save);
            if (save_hash_2 !== this.clientStorage.autoSaveHash) {
                this.ModLoader.logger.info('autosaveSceneData()');
                save_scene_data.copy(save, 0x10, 0x10, 0x14);
                for (let i = 0; i < save_scene_data.byteLength; i++) {
                    save_scene_data[i] |= save[i];
                }
                this.clientStorage.autoSaveHash = save_hash_2;
            }
            else {
                return;
            }
            this.core.OOT!.global.writeSaveDataForCurrentScene(save_scene_data);
            this.ModLoader.clientSide.sendPacket(new Z64O_ClientSceneContextUpdate(live_scene_chests, live_scene_switches, live_scene_collect, live_scene_clear, live_scene_temp, this.ModLoader.clientLobby, this.core.OOT!.global.scene, this.clientStorage.world));
            if (this.config.autosaves) {
                this.ModLoader.utils.setTimeoutFrames(() => {
                    this.notificationManager.onAutoSave(this.autosaveIntoSlot2());
                }, 20 * 3);
            }
        }
    }

    autosaveIntoSlot2() {
        let saveArg: number = this.syncContext + 0x14;
        let saveArgCount: number = 1;
        let name = this.core.OOT!.save.player_name;
        let saveSlot = this.ModLoader.emulator.rdramRead32(0x8011A5D0 + 0x1354);
        let autosaveSlot = 1;
        this.ModLoader.emulator.rdramWrite32(0x8011A5D0 + 0x1354, autosaveSlot);
        this.core.OOT!.save.player_name = "autosave";
        if (name !== "autosave") {
            this.clientStorage.lastKnownSaveName = name;
        }
        this.core.OOT!.commandBuffer.arbitraryFunctionCall(0x800905D4, saveArg, saveArgCount).then((buf: Buffer) => {
            this.core.OOT!.save.player_name = name;
            this.ModLoader.emulator.rdramWrite32(0x8011A5D0 + 0x1354, saveSlot);
            if (this.core.OOT!.save.player_name === "autosave") {
                this.core.OOT!.save.player_name = this.clientStorage.lastKnownSaveName;
            }
        });
        return autosaveSlot;
    }

    updateBottles(onlyfillCache = false) {
        let bottles: InventoryItem[] = [
            this.core.OOT!.save.inventory.bottle_1,
            this.core.OOT!.save.inventory.bottle_2,
            this.core.OOT!.save.inventory.bottle_3,
            this.core.OOT!.save.inventory.bottle_4,
        ];
        for (let i = 0; i < bottles.length; i++) {
            if (bottles[i] !== this.clientStorage.bottleCache[i]) {
                this.clientStorage.bottleCache[i] = bottles[i];
                this.ModLoader.logger.info('Bottle update.');
                if (!onlyfillCache) {
                    this.ModLoader.clientSide.sendPacket(new Z64O_BottleUpdatePacket(i, bottles[i], this.ModLoader.clientLobby));
                }
            }
        }
    }

    updateSkulltulas() {
        if (this.clientStorage.lastKnownSkullCount < this.core.OOT!.save.questStatus.goldSkulltulas) {
            this.clientStorage.lastKnownSkullCount = this.core.OOT!.save.questStatus.goldSkulltulas;
            this.updateInventory();
        }
    }

    //------------------------------
    // Lobby Setup
    //------------------------------

    @EventHandler(EventsClient.ON_SERVER_CONNECTION)
    onConnect() {
        this.ModLoader.logger.debug("Connected to server.");
        this.clientStorage.first_time_sync = false;
    }

    @EventHandler(EventsClient.CONFIGURE_LOBBY)
    onLobbySetup(lobby: LobbyData): void {
        lobby.data['OotOnline:data_syncing'] = true;
        lobby.data['OotOnline:actor_syncing'] = true;
        lobby.data['OotOnline:key_syncing'] = this.config.keySync;
    }

    @EventHandler(EventsClient.ON_LOBBY_JOIN)
    onJoinedLobby(lobby: LobbyData): void {
        this.clientStorage.first_time_sync = false;
        this.LobbyConfig.actor_syncing = lobby.data['OotOnline:actor_syncing'];
        this.LobbyConfig.data_syncing = lobby.data['OotOnline:data_syncing'];
        this.LobbyConfig.key_syncing = lobby.data['OotOnline:key_syncing'];
        this.ModLoader.logger.info('OotOnline settings inherited from lobby.');
        if (GHOST_MODE_TRIGGERED) {
            bus.emit(Z64OnlineEvents.GHOST_MODE, true);
        }
        if (lobby.data.hasOwnProperty("Z64OAssetsURL")) {
            if (lobby.data.Z64OAssetsURL.length > 0) {
                this.ModLoader.logger.info("Server sent asset data.");
            }
            this.ModLoader.privateBus.emit(Z64O_PRIVATE_EVENTS.CLIENT_ASSET_DATA_GET, lobby.data.Z64OAssetsURL);
        }
        if (lobby.data.hasOwnProperty("Z64OEventsActive")) {
            if (lobby.data.Z64OEventsActive.length > 0) {
                this.ModLoader.logger.info("Server sent event data.");
                this.ModLoader.privateBus.emit(Z64O_PRIVATE_EVENTS.CLIENT_EVENT_DATA_GET, lobby.data.Z64OEventsActive);
            }
        }
    }

    //------------------------------
    // Scene handling
    //------------------------------

    @EventHandler(OotEvents.ON_SCENE_CHANGE)
    onSceneChange(scene: number) {
        if (!this.clientStorage.first_time_sync) {
            // #ifdef IS_DEV_BUILD
            let test = true;
            if (test) {
                this.core.OOT!.save.permSceneData = this.ModLoader.utils.clearBuffer(this.core.OOT!.save.permSceneData);
            }
            // #endif
            this.ModLoader.utils.setTimeoutFrames(() => {
                if (this.LobbyConfig.data_syncing) {
                    this.ModLoader.me.data["world"] = this.clientStorage.world;
                    this.ModLoader.clientSide.sendPacket(new Z64O_DownloadRequestPacket(this.ModLoader.clientLobby, new OotOSaveData(this.core.OOT!, this.ModLoader).createSave()));
                    this.ModLoader.clientSide.sendPacket(new Z64O_RomFlagsPacket(this.ModLoader.clientLobby, RomFlags.isOotR, RomFlags.isVanilla, RomFlags.hasFastBunHood, RomFlags.isMultiworld));
                }
            }, 50);
        }
        this.ModLoader.clientSide.sendPacket(
            new Z64O_ScenePacket(
                this.ModLoader.clientLobby,
                scene,
                this.core.OOT!.save.age
            )
        );
        this.ModLoader.logger.info('client: I moved to scene ' + scene + '.');
        if (this.core.OOT!.helper.isSceneNumberValid()) {
            this.ModLoader.gui.setDiscordStatus(
                new DiscordStatus(
                    'Playing OotOnline',
                    'In ' +
                    this.clientStorage.localization[
                    this.clientStorage.scene_keys[scene]
                    ]
                )
            );
        }
    }

    @NetworkHandler('Z64O_ScenePacket')
    onSceneChange_client(packet: Z64O_ScenePacket) {
        this.ModLoader.logger.info(
            'client receive: Player ' +
            packet.player.nickname +
            ' moved to scene ' +
            this.clientStorage.localization[
            this.clientStorage.scene_keys[packet.scene]
            ] +
            '.'
        );
        bus.emit(
            Z64OnlineEvents.CLIENT_REMOTE_PLAYER_CHANGED_SCENES,
            new Z64_PlayerScene(packet.player, packet.lobby, packet.scene)
        );
    }

    // This packet is basically 'where the hell are you?' if a player has a puppet on file but doesn't know what scene its suppose to be in.
    @NetworkHandler('Z64O_SceneRequestPacket')
    onSceneRequest_client(packet: Z64O_SceneRequestPacket) {
        if (this.core.OOT!.save !== undefined) {
            this.ModLoader.clientSide.sendPacketToSpecificPlayer(
                new Z64O_ScenePacket(
                    this.ModLoader.clientLobby,
                    this.core.OOT!.global.scene,
                    this.core.OOT!.save.age
                ),
                packet.player
            );
        }
    }

    @NetworkHandler('Z64O_BottleUpdatePacket')
    onBottle_client(packet: Z64O_BottleUpdatePacket) {
        if (
            this.core.OOT!.helper.isTitleScreen() ||
            !this.core.OOT!.helper.isSceneNumberValid()
        ) {
            return;
        }
        if (packet.player.data.world !== this.clientStorage.world) return;
        if (!this.config.syncBottleContents) return;
        let inventory = this.core.OOT!.save.inventory;
        if (packet.contents === InventoryItem.NONE) return;
        this.clientStorage.bottleCache[packet.slot] = packet.contents;
        switch (packet.slot) {
            case 0:
                inventory.bottle_1 = packet.contents;
                break;
            case 1:
                inventory.bottle_2 = packet.contents;
                break;
            case 2:
                inventory.bottle_3 = packet.contents;
                break;
            case 3:
                inventory.bottle_4 = packet.contents;
                break;
        }
        bus.emit(Z64OnlineEvents.ON_INVENTORY_UPDATE, this.core.OOT!.save.inventory);
        // Update hash.
        this.clientStorage.saveManager.createSave();
        this.clientStorage.lastPushHash = this.clientStorage.saveManager.hash;
    }

    // The server is giving me data.
    @NetworkHandler('Z64O_DownloadResponsePacket')
    onDownloadPacket_client(packet: Z64O_DownloadResponsePacket) {
        if (
            this.core.OOT!.helper.isTitleScreen() ||
            !this.core.OOT!.helper.isSceneNumberValid()
        ) {
            return;
        }
        if (!packet.host) {
            if (packet.save) {
                this.clientStorage.saveManager.forceOverrideSave(packet.save!, this.core.OOT!.save as any, ProxySide.CLIENT);
                this.clientStorage.saveManager.processKeyRing_OVERWRITE(packet.keys!, this.clientStorage.saveManager.createKeyRing(), ProxySide.CLIENT);
                // Update hash.
                this.clientStorage.saveManager.createSave();
                this.clientStorage.lastPushHash = this.clientStorage.saveManager.hash;
            }
        } else {
            this.ModLoader.logger.info("The lobby is mine!");
        }
        this.ModLoader.utils.setTimeoutFrames(() => {
            this.clientStorage.first_time_sync = true;
            this.updateBottles(true);
        }, 20);
    }

    @NetworkHandler('Z64O_UpdateSaveDataPacket')
    onSaveUpdate(packet: Z64O_UpdateSaveDataPacket) {
        if (
            this.core.OOT!.helper.isTitleScreen() ||
            !this.core.OOT!.helper.isSceneNumberValid()
        ) {
            return;
        }
        if (packet.world !== this.clientStorage.world) return;
        this.clientStorage.saveManager.applySave(packet.save, this.config.syncMasks);
        // Update hash.
        this.clientStorage.saveManager.createSave();
        this.clientStorage.lastPushHash = this.clientStorage.saveManager.hash;
        Object.keys(packet.modData).forEach((key: string)=>{
            this.songOfSoaring.apply(key, packet.modData[key]);
        });
    }

    @NetworkHandler('Z64O_ErrorPacket')
    onError(packet: Z64O_ErrorPacket){
        this.ModLoader.logger.error(packet.message);
    }

    @NetworkHandler('Z64O_UpdateKeyringPacket')
    onKeyUpdate(packet: Z64O_UpdateKeyringPacket) {
        if (
            this.core.OOT!.helper.isTitleScreen() ||
            !this.core.OOT!.helper.isSceneNumberValid()
        ) {
            return;
        }
        if (packet.world !== this.clientStorage.world) return;
        this.clientStorage.saveManager.processKeyRing(packet.keys, this.clientStorage.saveManager.createKeyRing(), ProxySide.CLIENT);
        // Update hash.
        this.clientStorage.saveManager.createSave();
        this.clientStorage.lastPushHash = this.clientStorage.saveManager.hash;
    }

    @NetworkHandler('Z64O_ClientSceneContextUpdate')
    onSceneContextSync_client(packet: Z64O_ClientSceneContextUpdate) {
        if (
            this.core.OOT!.helper.isTitleScreen() ||
            !this.core.OOT!.helper.isSceneNumberValid() ||
            this.core.OOT!.helper.isLinkEnteringLoadingZone()
        ) {
            return;
        }
        if (this.core.OOT!.global.scene !== packet.scene) {
            return;
        }
        if (packet.world !== this.clientStorage.world) return;
        let buf1: Buffer = this.core.OOT!.global.liveSceneData_chests;
        if (Object.keys(parseFlagChanges(packet.chests, buf1) > 0)) {
            this.core.OOT!.global.liveSceneData_chests = buf1;
        }

        let buf2: Buffer = this.core.OOT!.global.liveSceneData_switch;
        if (Object.keys(parseFlagChanges(packet.switches, buf2) > 0)) {
            this.core.OOT!.global.liveSceneData_switch = buf2;
        }

        let buf3: Buffer = this.core.OOT!.global.liveSceneData_collectable;
        if (Object.keys(parseFlagChanges(packet.collect, buf3) > 0)) {
            this.core.OOT!.global.liveSceneData_collectable = buf3;
        }

        let buf4: Buffer = this.core.OOT!.global.liveSceneData_clear;
        if (Object.keys(parseFlagChanges(packet.clear, buf4) > 0)) {
            this.core.OOT!.global.liveSceneData_clear = buf4;
        }

        let buf5: Buffer = this.core.OOT!.global.liveSceneData_temp;
        if (Object.keys(parseFlagChanges(packet.temp, buf5) > 0)) {
            this.core.OOT!.global.liveSceneData_temp = buf5;
        }
        // Update hash.
        this.clientStorage.saveManager.createSave();
        this.clientStorage.lastPushHash = this.clientStorage.saveManager.hash;
    }

    healPlayer() {
        if (
            this.core.OOT!.helper.isTitleScreen() ||
            !this.core.OOT!.helper.isSceneNumberValid()
        ) {
            return;
        }
        this.ModLoader.emulator.rdramWrite16(
            global.ModLoader.save_context + 0x1424,
            0x65
        );
    }

    @EventHandler(Z64OnlineEvents.GAINED_PIECE_OF_HEART)
    onNeedsHeal1(evt: any) {
        this.healPlayer();
    }

    @EventHandler(Z64OnlineEvents.GAINED_HEART_CONTAINER)
    onNeedsHeal2(evt: any) {
        this.healPlayer();
    }

    @EventHandler(Z64OnlineEvents.SAVE_DATA_ITEM_SET)
    onSaveDataToggle(evt: Z64_SaveDataItemSet) {
        switch (evt.key) {
            case "bombchus":
                if (this.core.OOT!.save.inventory.bombchuCount === 0) {
                    this.core.OOT!.save.inventory.bombchuCount = UpgradeCountLookup(InventoryItem.BOMBCHU, AmmoUpgrade.BASE);
                }
                break;
            case "bombBag":
                if (this.core.OOT!.save.inventory.bombsCount === 0) {
                    this.core.OOT!.save.inventory.bombsCount = UpgradeCountLookup(InventoryItem.BOMB, evt.value as number);
                }
                break;
            case "quiver":
                if (this.core.OOT!.save.inventory.arrows === 0) {
                    this.core.OOT!.save.inventory.arrows = UpgradeCountLookup(InventoryItem.FAIRY_BOW, evt.value as number);
                }
                break;
            case "bulletBag":
                if (this.core.OOT!.save.inventory.dekuSeeds === 0) {
                    this.core.OOT!.save.inventory.dekuSeeds = UpgradeCountLookup(InventoryItem.FAIRY_SLINGSHOT, evt.value as number);
                }
                break;
            case "dekuSticksCapacity":
                if (this.core.OOT!.save.inventory.dekuSticksCount === 0) {
                    if ((evt.value as number) === 1) {
                        this.core.OOT!.save.inventory.dekuSticksCount = 1;
                    } else {
                        this.core.OOT!.save.inventory.dekuSticksCount = UpgradeCountLookup(InventoryItem.DEKU_STICK, evt.value as number);
                    }
                }
                break;
            case "dekuNutsCapacity":
                if (this.core.OOT!.save.inventory.dekuNutsCount === 0) {
                    if ((evt.value as number) === 1) {
                        this.core.OOT!.save.inventory.dekuNutsCount = UpgradeCountLookup(InventoryItem.DEKU_NUT, 1);
                    } else {
                        this.core.OOT!.save.inventory.dekuNutsCount = UpgradeCountLookup(InventoryItem.DEKU_NUT, evt.value as number);
                    }
                }
                break;
            case "heartPieces":
            case "double_defense":
                bus.emit(Z64OnlineEvents.GAINED_PIECE_OF_HEART, {});
                break;
        }
    }

    @EventHandler(OotEvents.ON_AGE_CHANGE)
    onAgeChange(age: AgeOrForm) {
        this.ModLoader.clientSide.sendPacket(
            new Z64O_ScenePacket(
                this.ModLoader.clientLobby,
                this.core.OOT!.global.scene,
                age
            )
        );
    }

    private isBottle(item: InventoryItem) {
        return (item === InventoryItem.EMPTY_BOTTLE || item === InventoryItem.BOTTLED_BIG_POE || item === InventoryItem.BOTTLED_BUGS || item === InventoryItem.BOTTLED_FAIRY || item === InventoryItem.BOTTLED_FISH || item === InventoryItem.BOTTLED_POE || item === InventoryItem.LON_LON_MILK || item === InventoryItem.LON_LON_MILK_HALF)
    }

    @EventHandler(Z64OnlineEvents.ON_INVENTORY_UPDATE)
    onInventoryUpdate(inventory: IInventory) {
        if (
            this.core.OOT!.helper.isTitleScreen() ||
            !this.core.OOT!.helper.isSceneNumberValid()
        ) {
            return;
        }
        let addr: number = global.ModLoader.save_context + 0x0068;
        let buf: Buffer = this.ModLoader.emulator.rdramReadBuffer(addr, 0x7);
        let addr2: number = global.ModLoader.save_context + 0x0074;
        let raw_inventory: Buffer = this.ModLoader.emulator.rdramReadBuffer(
            addr2,
            0x24
        );
        if (buf[0x4] !== InventoryItem.NONE && raw_inventory[buf[0x4]] !== InventoryItem.NONE && (raw_inventory[buf[0x4]] === InventoryItem.HOOKSHOT || this.isBottle(raw_inventory[buf[0x4]]))) {
            buf[0x1] = raw_inventory[buf[0x4]];
            this.ModLoader.emulator.rdramWriteBuffer(addr, buf);
            this.core.OOT!.commandBuffer.updateButton(0x1);
        }
        if (buf[0x5] !== InventoryItem.NONE && raw_inventory[buf[0x5]] !== InventoryItem.NONE && (raw_inventory[buf[0x5]] === InventoryItem.HOOKSHOT || this.isBottle(raw_inventory[buf[0x5]]))) {
            buf[0x2] = raw_inventory[buf[0x5]];
            this.ModLoader.emulator.rdramWriteBuffer(addr, buf);
            this.core.OOT!.commandBuffer.updateButton(0x2);
        }
        if (buf[0x6] !== InventoryItem.NONE && raw_inventory[buf[0x6]] !== InventoryItem.NONE && (raw_inventory[buf[0x6]] === InventoryItem.HOOKSHOT || this.isBottle(raw_inventory[buf[0x6]]))) {
            buf[0x3] = raw_inventory[buf[0x6]];
            this.ModLoader.emulator.rdramWriteBuffer(addr, buf);
            this.core.OOT!.commandBuffer.updateButton(0x3);
        }
    }

    @EventHandler(EventsClient.ON_INJECT_FINISHED)
    onPayloads() {
        fs.readdirSync(path.resolve(__dirname, "payloads", "E0")).forEach((f: string) => {
            let file = path.resolve(__dirname, "payloads", "E0", f);
            let parse = path.parse(file);
            if (parse.ext === ".ovl") {
                this.clientStorage.overlayCache[path.parse(file).base] = this.ModLoader.payloadManager.parseFile(file);
                if (path.parse(file).base === "puppet_oot.ovl") {
                    this.clientStorage.puppetOvl = this.clientStorage.overlayCache[path.parse(file).base];
                }
            }
        });
    }

    @EventHandler(ModLoaderEvents.ON_ROM_PATCHED)
    onRom(evt: any) {
        let rom: Buffer = evt.rom;
        let start = 0x20;
        let terminator = 0;
        let byte = rom.readUInt8(start);
        let prog = 0;
        while (byte !== terminator) {
            prog++;
            byte = rom.readUInt8(start + prog);
        }
        prog++;
        if (rom.readUInt8(start + prog) > 0) {
            let ver = rom.slice(start + prog - 1, start + prog - 1 + 0x4);
            this.ModLoader.logger.info(`Oot Randomizer detected. Version: ${ver.readUInt8(1)}.${ver.readUInt8(2)}.${ver.readUInt8(3)}`);
            RomFlags.isOotR = true;
            markAsRandomizer();
            if (ver.readUInt32BE(0) >= 0x40101 && ver.readUInt32BE(0) < 0x50253) { //OotR v4.1.1 up until v5.2.83 lacked a toggle to turn off Fast Bunny Hood
                RomFlags.hasFastBunHood = true;
            } else if (ver.readUInt32BE(0) >= 0x50253) {
                let tools: Z64RomTools = new Z64RomTools(this.ModLoader, Z64LibSupportedGames.OCARINA_OF_TIME);
                let buf = tools.decompressDMAFileFromRom(rom, 1496); //Decompressing OotR Payload, specifically
                let cosmetic_ctxt = buf.readUInt32BE(4);
                let cosmetic_frmt_ver = buf.readUInt32BE(cosmetic_ctxt - 0x80400000);
                if (cosmetic_frmt_ver === 0x1F073FD8) {
                    if (buf.readInt8((cosmetic_ctxt + 0x49C) - 0x80400000) === 0x01) {
                        RomFlags.hasFastBunHood = true;
                    }
                } else {
                    this.ModLoader.logger.info('Unexpected Cosmetic Format Version. Ask a developer to check if the latest version of the randomizer has changed things.');
                }
            }
        } else {
            let intended: string = "dc7100d5f3a020f962ae1b3cdd99049f";
            let h: string = "";
            let tools: Z64RomTools = new Z64RomTools(this.ModLoader, Z64LibSupportedGames.OCARINA_OF_TIME);
            for (let i = 0; i < 1509; i++) {
                let buf = tools.decompressDMAFileFromRom(rom, i);
                h += this.ModLoader.utils.hashBuffer(buf);
            }
            h = this.ModLoader.utils.hashBuffer(Buffer.from(h));
            if (h === intended) {
                RomFlags.isVanilla = true;
                this.ModLoader.logger.info("Vanilla rom detected.");
            }
        }
    }

    @EventHandler(ModLoaderEvents.ON_SOFT_RESET_PRE)
    onReset(evt: any) {
        this.clientStorage.first_time_sync = false;
    }

    @EventHandler(Z64OnlineEvents.DEBUG_DUMP_RAM)
    onDump(evt: any) {
        fs.writeFileSync(global.ModLoader.startdir + "/ram.bin", this.ModLoader.emulator.rdramReadBuffer(0, 16 * 1024 * 1024));
    }

    private updateSyncContext() {
        this.ModLoader.emulator.rdramWrite8(this.syncContext, this.core.OOT!.save.inventory.strength);
        this.ModLoader.emulator.rdramWriteBuffer(this.syncContext + 0x1, this.ModLoader.emulator.rdramReadBuffer(0x800F7AD8 + (this.core.OOT!.link.tunic * 0x3), 0x3));
        if (this.core.OOT!.save.inventory.strength > Strength.GORON_BRACELET) {
            if (this.core.OOT!.save.inventory.strength === Strength.SILVER_GAUNTLETS) {
                this.ModLoader.emulator.rdramWriteBuffer(this.syncContext + 0x5, this.ModLoader.emulator.rdramReadBuffer(0x800F7AE4, 0x3));
            } else {
                this.ModLoader.emulator.rdramWriteBuffer(this.syncContext + 0x5, this.ModLoader.emulator.rdramReadBuffer(0x800F7AE4 + 0x3, 0x3));
            }
        }
        this.ModLoader.emulator.rdramWrite16(this.syncContext + 0x10, this.core.OOT!.link.current_sound_id);
        this.ModLoader.emulator.rdramWrite32(this.syncContext + 0x14, 0x8011A5D0);
    }

    private updateMultiworld() {
        let item = this.multiworld!.getOutgoingItem();
        if (item !== undefined) {
            if (!this.multiworld.doesPlayerNameExist(item.dest)) {
                this.multiworld.setPlayerName(`World ${item.dest}`, item.dest);
            }
            this.ModLoader.clientSide.sendPacket(new MultiWorld_ItemPacket(this.ModLoader.clientLobby, item));
        }
        if (this.multiworld.itemsInQueue.length === 0) return;
        if (this.core.OOT!.link.state === LinkState.STANDING && !this.core.OOT!.helper.isLinkEnteringLoadingZone() && !this.core.OOT!.helper.Player_InBlockingCsMode()) {
            let item = this.multiworld.itemsInQueue.shift()!;
            this.multiworld.processIncomingItem(item.item, this.core.OOT!.save);
        }
    }

    @onTick()
    onTick() {
        if (this.opa !== undefined) {
            this.opa.onTick(0, this.core.OOT!, this.ModLoader);
        }
        if (
            !this.core.OOT!.helper.isTitleScreen() &&
            this.core.OOT!.helper.isSceneNumberValid()
        ) {
            if (!this.core.OOT!.helper.isPaused()) {
                this.ModLoader.me.data["world"] = this.clientStorage.world;
                if (!this.clientStorage.first_time_sync) {
                    return;
                }
                if (this.LobbyConfig.actor_syncing) {
                    //this.actorHooks.tick();
                }
                if (this.LobbyConfig.data_syncing) {
                    this.syncTimer++;
                    this.autosaveSceneData();
                    this.updateBottles();
                    this.updateSkulltulas();
                    if (RomFlags.isMultiworld) {
                        this.updateMultiworld();
                    }
                }
            }
        }
    }

    inventoryUpdateTick() {
        this.updateInventory();
        this.updateSyncContext();
    }
}
