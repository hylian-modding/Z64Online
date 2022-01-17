import { ModelManagerClient } from "@Z64Online/common/cosmetics/player/ModelManager";
import { ParentReference, ProxySide, SidedProxy } from "modloader64_api/SidedProxy/SidedProxy";
import { Init, onTick, onViUpdate, Postinit, Preinit } from "modloader64_api/PluginLifecycle";
import { ModelManagerMM } from "./models/ModelManagerMM";
import { CDNClient } from "@Z64Online/common/cdn/CDNClient";
import { bus, EventHandler, EventsClient, PrivateEventHandler } from "modloader64_api/EventHandler";
import { Z64OnlineEvents, Z64_PlayerScene, Z64_SaveDataItemSet } from "@Z64Online/common/api/Z64API";
import fs from 'fs';
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { IModLoaderAPI, IPlugin, ModLoaderEvents } from "modloader64_api/IModLoaderAPI";
import { ImGuiHandler_MM } from "./imgui/ImGuiHandler";
import { WorldEvents } from "@Z64Online/common/WorldEvents/WorldEvents";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { InjectCore } from "modloader64_api/CoreInjection";
import { DiscordStatus } from "modloader64_api/Discord";
import { INetworkPlayer, IPacketHeader, LobbyData, NetworkHandler } from "modloader64_api/NetworkHandler";
import { IMMOnlineLobbyConfig, MMOnlineConfigCategory, syncMode } from "./MMOnline";
import { flags } from "./save/permflags";
import { MMOnlineStorage } from "./storage/MMOnlineStorage";
import { MMOnlineStorageClient } from "./storage/MMOnlineStorageClient";
import { parseFlagChanges } from "@Z64Online/common/lib/parseFlagChanges";
import path from "path";
import { addToKillFeedQueue } from "modloader64_api/Announcements";
import { GUITunnelPacket } from "modloader64_api/GUITunnel";
import * as API from 'Z64Lib/API/imports';
import { Z64O_PRIVATE_EVENTS } from "@Z64Online/common/api/InternalAPI";
import { AgeOrForm } from "@Z64Online/common/types/Types";
import RomFlags from "@Z64Online/mm/compat/RomFlags";
import { Z64O_UpdateSaveDataPacket, Z64O_UpdateKeyringPacket, Z64O_ClientSceneContextUpdate, Z64O_DownloadRequestPacket, Z64O_RomFlagsPacket, Z64O_ScenePacket, Z64O_SceneRequestPacket, Z64O_BottleUpdatePacket, Z64O_DownloadResponsePacket, Z64O_ErrorPacket } from "@Z64Online/common/network/Z64OPackets";
import { UpgradeCountLookup, AmmoUpgrade, IOvlPayloadResult, Sword } from "Z64Lib/API/Common/Z64API";
import { InventoryItem, IInventory, MMEvents } from "Z64Lib/API/MM/MMAPI";
import PuppetOverlord_MM from "./puppet/PuppetOverlord_MM";
export let GHOST_MODE_TRIGGERED: boolean = false;
import { EventFlags } from 'Z64Lib/API/MM/EventFlags';
import { Z64O_PermFlagsPacket } from "./network/MMOPackets";
import { MMOSaveData } from "./save/MMOSaveData";
import { SoundAccessSingleton, SoundManagerClient } from "@Z64Online/common/cosmetics/sound/SoundManager";
import { markAsRandomizer } from "Z64Lib/src/Common/types/GameAliases";
import NaviModelManager from "@Z64Online/common/cosmetics/navi/NaviModelManager";
import AnimationManager from "@Z64Online/common/cosmetics/animation/AnimationManager";
import { markAsFairySync, markAsSkullSync, MM_IS_FAIRY, MM_IS_SKULL } from "@Z64Online/common/types/GameAliases";

function RGBA32ToA5(rgba: Buffer) {
    let i, k, data
    let picto: Buffer = Buffer.alloc(0x2bc0)

    for (i = 0; i < 0x2bc0; i += 5) {
        data = 0
        for (k = 0; k < 8; ++k) {
            // get average color from all channels
            //let color = (((rgba[i] << 24) & 0xFF) + ((rgba[i] << 16) & 0xFF) + ((rgba[i] << 8) & 0xFF) + (rgba[i] & 0xFF)) / 0x3FC
            let color = (rgba[i] << 24) & 0xFF
            color = (color * 31) & 0x1F;

            data |= (color >> (5 * (7 - k)));

            //data >> (5n * (7n - k)) = color;
        }

        picto.writeBigInt64BE(BigInt(data), i)
    }

    return picto
}

export default class MMOnlineClient {
    @InjectCore()
    core!: IZ64Main;

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;

    @ParentReference()
    parent!: IPlugin;

    @SidedProxy(ProxySide.CLIENT, CDNClient)
    cdn!: CDNClient;
    @SidedProxy(ProxySide.CLIENT, ModelManagerClient)
    modelManager!: ModelManagerClient;
    @SidedProxy(ProxySide.CLIENT, NaviModelManager)
    naviManager!: NaviModelManager;
    @SidedProxy(ProxySide.CLIENT, AnimationManager)
    animManager!: AnimationManager;
    @SidedProxy(ProxySide.CLIENT, ImGuiHandler_MM)
    gui!: ImGuiHandler_MM;
    @SidedProxy(ProxySide.CLIENT, PuppetOverlord_MM)
    puppets!: PuppetOverlord_MM;
    @SidedProxy(ProxySide.CLIENT, WorldEvents)
    worldEvents!: WorldEvents;
    @SidedProxy(ProxySide.CLIENT, SoundManagerClient)
    sound!: SoundManagerClient;

    syncTimer: number = 0;
    synctimerMax: number = 60 * 20;
    syncPending: boolean = false;

    syncContext: number = -1;

    LobbyConfig: IMMOnlineLobbyConfig = {} as IMMOnlineLobbyConfig;
    clientStorage: MMOnlineStorageClient = new MMOnlineStorageClient();
    config!: MMOnlineConfigCategory;

    permFlagBits: Array<number> = [];
    permFlagNames: Map<number, string> = new Map<number, string>();

    sendPacketToPlayersInScene(packet: IPacketHeader) {
        try {
            let storage: MMOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
                packet.lobby,
                this
            ) as MMOnlineStorage;
            if (storage === null) {
                return;
            }
            Object.keys(storage.players).forEach((key: string) => {
                //if (storage.players[key] === storage.players[packet.player.uuid]) {
                if (storage.networkPlayerInstances[key].uuid !== packet.player.uuid) {
                    this.ModLoader.serverSide.sendPacketToSpecificPlayer(
                        packet,
                        storage.networkPlayerInstances[key]
                    );
                }
                //}
            });
        } catch (err: any) { }
    }

    @Preinit()
    preinit(): void {
        this.config = this.ModLoader.config.registerConfigCategory("MMOnline") as MMOnlineConfigCategory;
        this.ModLoader.config.setData("MMOnline", "syncMode", syncMode.BASIC); // 0 is default, 1 is time sync, 2 is groundhog's-day sync
        this.ModLoader.config.setData("MMOnline", "notifications", true);
        this.ModLoader.config.setData("MMOnline", "nameplates", true);

        this.modelManager.child = new ModelManagerMM(this.modelManager);
    }

    @Init()
    init(): void {
        this.clientStorage.syncMode = this.config.syncMode;
    }

    @Postinit()
    postinit() {
        this.clientStorage.scene_keys = JSON.parse(fs.readFileSync(__dirname + '/localization/scene_numbers.json').toString());
        this.clientStorage.localization = JSON.parse(fs.readFileSync(__dirname + '/localization/en_US.json').toString());
        let status: DiscordStatus = new DiscordStatus('Playing MMOnline', 'On the title screen');
        status.smallImageKey = 'mmo';
        status.partyId = this.ModLoader.clientLobby;
        status.partyMax = 30;
        status.partySize = 1;
        this.ModLoader.gui.setDiscordStatus(status);
        this.clientStorage.saveManager = new MMOSaveData(this.core.MM!, this.ModLoader);
        this.ModLoader.utils.setIntervalFrames(() => {
            this.inventoryUpdateTick();
        }, 20);

        //Flag setup
        for (let name in EventFlags) {
            if (typeof (name) === 'string') {
                let value = parseInt(EventFlags[name]);
                //if(name.includes()) return; //For blacklisting certain flags if necessary
                if (name.startsWith("PERM")) {
                    this.permFlagBits.push(value);
                    this.permFlagNames.set(this.permFlagBits.indexOf(value), flags.flags[value]);
                }
            }
        }
    }

    updateInventory() {
        if (this.core.MM!.helper.isTitleScreen() || !this.core.MM!.helper.isSceneNumberValid() || this.core.MM!.helper.isPaused() || !this.clientStorage.first_time_sync) return;
        //if (this.core.MM!.helper.Player_InBlockingCsMode() || !this.LobbyConfig.data_syncing) return;
        if (this.syncTimer > this.synctimerMax) {
            this.clientStorage.lastPushHash = this.ModLoader.utils.hashBuffer(Buffer.from("RESET"));
            this.ModLoader.logger.debug("Forcing resync due to timeout.");
        }
        let save = this.clientStorage.saveManager.createSave();
        if (this.clientStorage.lastPushHash !== this.clientStorage.saveManager.hash) {
            this.ModLoader.privateBus.emit(Z64O_PRIVATE_EVENTS.DOING_SYNC_CHECK, {});
            this.ModLoader.privateBus.emit(Z64O_PRIVATE_EVENTS.LOCK_ITEM_NOTIFICATIONS, {});
            this.ModLoader.clientSide.sendPacket(new Z64O_UpdateSaveDataPacket(this.ModLoader.clientLobby, save, this.clientStorage.world));
            this.clientStorage.lastPushHash = this.clientStorage.saveManager.hash;
            this.syncTimer = 0;
        }
    }

    @PrivateEventHandler(Z64O_PRIVATE_EVENTS.UPDATE_KEY_HASH)
    updateKeyHash(evt: any) {
        let keyHash: string = this.ModLoader.utils.hashBuffer(this.core.MM!.save.keyManager.getRawKeyBuffer());
        this.clientStorage.keySaveHash = keyHash;
    }

    autosaveSceneData() {
        if (!this.core.MM!.helper.isLinkEnteringLoadingZone() && this.core.MM!.global.scene_framecount > 20 && this.clientStorage.first_time_sync) {
            // Slap key checking in here too.
            let keyHash: string = this.ModLoader.utils.hashBuffer(this.core.MM!.save.keyManager.getRawKeyBuffer());
            if (keyHash !== this.clientStorage.keySaveHash) {
                this.clientStorage.keySaveHash = keyHash;
                this.ModLoader.clientSide.sendPacket(new Z64O_UpdateKeyringPacket(this.clientStorage.saveManager.createKeyRing(), this.ModLoader.clientLobby, this.clientStorage.world));
            }
            // and beans too why not.
            if (this.clientStorage.lastbeans !== this.core.MM!.save.inventory.magicBeansCount) {
                this.clientStorage.lastbeans = this.core.MM!.save.inventory.magicBeansCount;
                this.updateInventory();
            }

            let live_scene_chests: Buffer = Buffer.alloc(0);
            let live_scene_switches: Buffer = Buffer.alloc(0);
            let live_scene_clear: Buffer = Buffer.alloc(0);
            let live_scene_collect: Buffer = this.core.MM!.global.liveSceneData_collectable;
            let live_scene_temp: Buffer = this.core.MM!.global.liveSceneData_temp;

            let save_scene_data: Buffer = this.core.MM!.global.getSaveDataForCurrentScene();
            let save: Buffer = Buffer.alloc(0x1c);

            if (this.config.syncMode === syncMode.TIME) {
                live_scene_chests = this.core.MM!.global.liveSceneData_chests;
                live_scene_switches = this.core.MM!.global.liveSceneData_switch;
                live_scene_clear = this.core.MM!.global.liveSceneData_clear;

                live_scene_chests.copy(save, 0x0); // Chests
                live_scene_switches.copy(save, 0x4); // Switches
                live_scene_clear.copy(save, 0x8); // Room Clear
            }

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
            this.core.MM!.global.writeSaveDataForCurrentScene(save_scene_data);
            this.ModLoader.clientSide.sendPacket(new Z64O_ClientSceneContextUpdate(live_scene_chests, live_scene_switches, live_scene_collect, live_scene_clear, live_scene_temp, this.ModLoader.clientLobby, this.core.MM!.global.scene, this.clientStorage.world));
        }
    }


    updateBottles(onlyfillCache = false) {
        let bottles: InventoryItem[] = [
            this.core.MM!.save.inventory.FIELD_BOTTLE1,
            this.core.MM!.save.inventory.FIELD_BOTTLE2,
            this.core.MM!.save.inventory.FIELD_BOTTLE3,
            this.core.MM!.save.inventory.FIELD_BOTTLE4,
            this.core.MM!.save.inventory.FIELD_BOTTLE5,
            this.core.MM!.save.inventory.FIELD_BOTTLE6,
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
        lobby.data['MMOnline:data_syncing'] = true;
        lobby.data['MMOnline:actor_syncing'] = true;
        lobby.data['MMOnline:key_syncing'] = this.config.keySync;
    }

    @EventHandler(EventsClient.ON_LOBBY_JOIN)
    onJoinedLobby(lobby: LobbyData): void {
        this.clientStorage.first_time_sync = false;
        this.LobbyConfig.actor_syncing = lobby.data['MMOnline:actor_syncing'];
        this.LobbyConfig.data_syncing = lobby.data['MMOnline:data_syncing'];
        this.LobbyConfig.key_syncing = lobby.data['MMOnline:key_syncing'];
        this.ModLoader.logger.info('MMOnline settings inherited from lobby.');
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

    @EventHandler(MMEvents.ON_SCENE_CHANGE)
    onSceneChange(scene: number) {
        if (!this.clientStorage.first_time_sync && !this.syncPending) {
            // #ifdef IS_DEV_BUILD
            let test = false;
            if (test) {
                this.core.MM!.save.permSceneData = this.ModLoader.utils.clearBuffer(this.core.MM!.save.permSceneData);
            }
            // #endif
            this.ModLoader.utils.setTimeoutFrames(() => {
                if (this.LobbyConfig.data_syncing) {
                    this.ModLoader.me.data["world"] = this.clientStorage.world;
                    this.ModLoader.clientSide.sendPacket(new Z64O_DownloadRequestPacket(this.ModLoader.clientLobby, new MMOSaveData(this.core.MM!, this.ModLoader).createSave()));
                    this.ModLoader.clientSide.sendPacket(new Z64O_RomFlagsPacket(this.ModLoader.clientLobby, RomFlags.isMMR, RomFlags.isVanilla));
                }
            }, 300);
            this.syncPending = true;
        }
        this.ModLoader.clientSide.sendPacket(
            new Z64O_ScenePacket(
                this.ModLoader.clientLobby,
                scene,
                this.core.MM!.save.form
            )
        );
        this.ModLoader.logger.info('client: I moved to scene ' + scene + '.');
        if (this.core.MM!.helper.isSceneNumberValid()) {
            this.ModLoader.gui.setDiscordStatus(
                new DiscordStatus(
                    'Playing MMOnline',
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
        if (this.core.MM!.save !== undefined) {
            this.ModLoader.clientSide.sendPacketToSpecificPlayer(
                new Z64O_ScenePacket(
                    this.ModLoader.clientLobby,
                    this.core.MM!.global.scene,
                    this.core.MM!.save.form
                ),
                packet.player
            );
        }
    }

    @NetworkHandler('Z64O_BottleUpdatePacket')
    onBottle_client(packet: Z64O_BottleUpdatePacket) {
        if (
            this.core.MM!.helper.isTitleScreen() ||
            !this.core.MM!.helper.isSceneNumberValid()
        ) {
            return;
        }
        if (packet.player.data.world !== this.clientStorage.world) return;
        if (!this.config.syncBottleContents) return;
        let inventory = this.core.MM!.save.inventory;
        if (packet.contents === InventoryItem.NONE) return;
        this.clientStorage.bottleCache[packet.slot] = packet.contents;
        switch (packet.slot) {
            case 0:
                inventory.FIELD_BOTTLE1 = packet.contents;
                break;
            case 1:
                inventory.FIELD_BOTTLE2 = packet.contents;
                break;
            case 2:
                inventory.FIELD_BOTTLE3 = packet.contents;
                break;
            case 3:
                inventory.FIELD_BOTTLE4 = packet.contents;
                break;
            case 4:
                inventory.FIELD_BOTTLE5 = packet.contents;
                break;
            case 5:
                inventory.FIELD_BOTTLE6 = packet.contents;
                break;
        }
        bus.emit(Z64OnlineEvents.ON_INVENTORY_UPDATE, this.core.MM!.save.inventory);
        // Update hash.
        this.clientStorage.saveManager.createSave();
        this.clientStorage.lastPushHash = this.clientStorage.saveManager.hash;
    }

    // The server is giving me data.
    @NetworkHandler('Z64O_DownloadResponsePacket')
    onDownloadPacket_client(packet: Z64O_DownloadResponsePacket) {
        this.syncPending = false;
        if (
            this.core.MM!.helper.isTitleScreen() ||
            !this.core.MM!.helper.isSceneNumberValid()
        ) {
            return;
        }
        if (!packet.host) {
            if (packet.save) {
                this.clientStorage.saveManager.forceOverrideSave(packet.save!, this.core.MM!.save as any, ProxySide.CLIENT);
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
            this.core.MM!.helper.isTitleScreen() ||
            !this.core.MM!.helper.isSceneNumberValid()
        ) {
            console.log("onSaveUpdate Failure 0")
            return;
        }
        if (packet.world !== this.clientStorage.world) {
            console.log("onSaveUpdate Failure 1")
            return;
        }

        this.clientStorage.saveManager.applySave(packet.save);
        // Update hash.
        this.clientStorage.saveManager.createSave();
        this.clientStorage.lastPushHash = this.clientStorage.saveManager.hash;
    }

    @NetworkHandler('Z64O_UpdateKeyringPacket')
    onKeyUpdate(packet: Z64O_UpdateKeyringPacket) {
        if (
            this.core.MM!.helper.isTitleScreen() ||
            !this.core.MM!.helper.isSceneNumberValid()
        ) {
            console.log("onKeyUpdate Failure 0")
            return;
        }
        if (packet.world !== this.clientStorage.world) {
            console.log("onKeyUpdate Failure 1")
            return;
        }
        this.clientStorage.saveManager.processKeyRing(packet.keys, this.clientStorage.saveManager.createKeyRing(), ProxySide.CLIENT);
        // Update hash.
        this.clientStorage.saveManager.createSave();
        this.clientStorage.lastPushHash = this.clientStorage.saveManager.hash;
    }

    @NetworkHandler('Z64O_ClientSceneContextUpdate')
    onSceneContextSync_client(packet: Z64O_ClientSceneContextUpdate) {
        if (
            this.core.MM!.helper.isTitleScreen() ||
            !this.core.MM!.helper.isSceneNumberValid() ||
            this.core.MM!.helper.isLinkEnteringLoadingZone()
        ) {
            return;
        }
        if (this.core.MM!.global.scene !== packet.scene) {
            return;
        }
        if (packet.world !== this.clientStorage.world) return;
        let buf1: Buffer = this.core.MM!.global.liveSceneData_chests;
        if (Object.keys(parseFlagChanges(packet.chests, buf1) > 0)) {
            this.core.MM!.global.liveSceneData_chests = buf1;
        }

        let buf2: Buffer = this.core.MM!.global.liveSceneData_switch;
        if (Object.keys(parseFlagChanges(packet.switches, buf2) > 0)) {
            this.core.MM!.global.liveSceneData_switch = buf2;
        }

        let buf3: Buffer = this.core.MM!.global.liveSceneData_collectable;
        if (Object.keys(parseFlagChanges(packet.collect, buf3) > 0)) {
            this.core.MM!.global.liveSceneData_collectable = buf3;
        }

        let buf4: Buffer = this.core.MM!.global.liveSceneData_clear;
        if (Object.keys(parseFlagChanges(packet.clear, buf4) > 0)) {
            this.core.MM!.global.liveSceneData_clear = buf4;
        }

        let buf5: Buffer = this.core.MM!.global.liveSceneData_temp;
        if (Object.keys(parseFlagChanges(packet.temp, buf5) > 0)) {
            this.core.MM!.global.liveSceneData_temp = buf5;
        }
        // Update hash.
        this.clientStorage.saveManager.createSave();
        this.clientStorage.lastPushHash = this.clientStorage.saveManager.hash;
    }

    healPlayer() {
        if (this.core.MM!.helper.isTitleScreen() || !this.core.MM!.helper.isSceneNumberValid()) return;
        this.core.MM!.save.health_mod = 0x65;
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
            case "FIELD_BOMBCHU":
                if (this.core.MM!.save.inventory.bombchuCount === 0) {
                    this.core.MM!.save.inventory.bombchuCount = UpgradeCountLookup(InventoryItem.BOMBCHU, AmmoUpgrade.BASE);
                }
                break;
            case "bombBag":
                if (this.core.MM!.save.inventory.bombsCount === 0) {
                    this.core.MM!.save.inventory.bombsCount = UpgradeCountLookup(InventoryItem.BOMB, evt.value as number);
                }
                break;
            case "FIELD_POWDER_KEG":
                if (this.core.MM!.save.inventory.powderKegCount === 0) {
                    this.core.MM!.save.inventory.powderKegCount = UpgradeCountLookup(InventoryItem.POWDER_KEG, evt.value as number);
                }
                break;
            case "quiver":
                if (this.core.MM!.save.inventory.arrows === 0) {
                    this.core.MM!.save.inventory.arrows = UpgradeCountLookup(InventoryItem.HEROES_BOW, evt.value as number);
                }
                break;
            case "dekuSticksCapacity":
                if (this.core.MM!.save.inventory.dekuSticksCount === 0) {
                    if ((evt.value as number) === 1) {
                        this.core.MM!.save.inventory.dekuSticksCount = 1;
                    } else {
                        this.core.MM!.save.inventory.dekuSticksCount = UpgradeCountLookup(InventoryItem.DEKU_STICK, evt.value as number);
                    }
                }
                break;
            case "dekuNutsCapacity":
                if (this.core.MM!.save.inventory.dekuNutsCount === 0) {
                    if ((evt.value as number) === 1) {
                        this.core.MM!.save.inventory.dekuNutsCount = UpgradeCountLookup(InventoryItem.DEKU_NUT, 1);
                    } else {
                        this.core.MM!.save.inventory.dekuNutsCount = UpgradeCountLookup(InventoryItem.DEKU_NUT, evt.value as number);
                    }
                }
                break;
            case "heartPieces":
            case "double_defense":
                bus.emit(Z64OnlineEvents.GAINED_PIECE_OF_HEART, {});
                break;
        }
    }

    @EventHandler(Z64OnlineEvents.MAGIC_METER_INCREASED)
    onNeedsMagic(size: API.Z64.Magic) {
    }

    @EventHandler(MMEvents.ON_AGE_CHANGE)
    onAgeChange(age: AgeOrForm) {
        this.ModLoader.clientSide.sendPacket(
            new Z64O_ScenePacket(
                this.ModLoader.clientLobby,
                this.core.MM!.global.scene,
                age
            )
        );
    }

    private isBottle(item: InventoryItem) {
        return (item === InventoryItem.BOTTLE_EMPTY || item === InventoryItem.BOTTLE_BLUE_FIRE || item === InventoryItem.BOTTLE_BUGS || item === InventoryItem.BOTTLE_CHATEAU_ROMANI || item === InventoryItem.BOTTLE_DEKU_PRINCESS || item === InventoryItem.BOTTLE_EEL || item === InventoryItem.BOTTLE_FAIRY || item === InventoryItem.BOTTLE_FISH ||
            item === InventoryItem.BOTTLE_GOLD_DUST || item === InventoryItem.BOTTLE_GRANNYS_DRINK || item === InventoryItem.BOTTLE_MAGICAL_MUSHROOM || item === InventoryItem.BOTTLE_MILK_FULL || item === InventoryItem.BOTTLE_MILK_HALF || item === InventoryItem.BOTTLE_POE_BIG || item === InventoryItem.BOTTLE_POTION_BLUE ||
            item === InventoryItem.BOTTLE_POE_SMALL || item === InventoryItem.BOTTLE_POTION_GREEN || item === InventoryItem.BOTTLE_POTION_RED || item === InventoryItem.BOTTLE_SEA_HORSE || item === InventoryItem.BOTTLE_SPRING_WATER_COLD || item === InventoryItem.BOTTLE_SPRING_WATER_HOT || item === InventoryItem.BOTTLE_ZORA_EGG)
    }

    @EventHandler(EventsClient.ON_INJECT_FINISHED)
    onPayloads() {
        fs.readdirSync(path.resolve(__dirname, "payloads", "E0")).forEach((f: string) => {
            let file = path.resolve(__dirname, "payloads", "E0", f);
            let parse = path.parse(file);
            if (parse.ext === ".ovl") {
                this.clientStorage.overlayCache[parse.base] = this.ModLoader.payloadManager.parseFile(file);
                if (parse.base === "puppet_mm.ovl") {
                    this.clientStorage.puppetOvl = this.clientStorage.overlayCache[parse.base];
                }
            }
        });
    }

    @EventHandler(EventsClient.ON_PAYLOAD_INJECTED)
    onPayload(evt: any) {
        if (path.parse(evt.file).ext === ".ovl") {
            let result: IOvlPayloadResult = evt.result;
            this.clientStorage.overlayCache[evt.file] = result;
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
        this.ModLoader.emulator.rdramWrite16(this.syncContext + 0x10, SoundAccessSingleton.sound_id);
    }


    updatePermFlags() {
        let hash = this.ModLoader.utils.hashBuffer(this.core.MM!.save.permFlags);
        hash += this.ModLoader.utils.hashBuffer(this.ModLoader.emulator.rdramReadBitsBuffer(0x801F0568, 99));
        if (this.clientStorage.flagHash === hash) {
            return;
        }
        this.clientStorage.flagHash = hash;
        let flags = this.core.MM!.save.permFlags;
        let mask = this.ModLoader.emulator.rdramReadBuffer(0x801C5FC0, 0x710);
        let scratch: Buffer = Buffer.alloc(0x4);
        let scratch2: Buffer = Buffer.alloc(0x4);
        // Scenes 0x00 to 0x70 inclusive
        for (let i = 0; i <= 0x70; i++) {
            this.ModLoader.utils.clearBuffer(scratch);
            this.ModLoader.utils.clearBuffer(scratch2);
            const maskIndex = i * 0x10;
            const sceneFlagsIndex = i * 0x14;

            const genericMask1 = mask.readUInt32BE(maskIndex);
            const genericMask2 = mask.readUInt32BE(maskIndex + 0x4);
            const chestMask = mask.readUInt32BE(maskIndex + 0x8);
            const collectibleMask = mask.readUInt32BE(maskIndex + 0xC);

            /* These are in a different order! */
            const genericSceneFlags1Index = sceneFlagsIndex + 0x4;
            const genericSceneFlags2Index = sceneFlagsIndex + 0x8;
            const chestSceneFlagsIndex = sceneFlagsIndex;
            const collectibleSceneFlagsIndex = sceneFlagsIndex + 0x10;

            let genericSceneFlags1 = flags!.readUInt32BE(genericSceneFlags1Index);
            let genericSceneFlags2 = flags!.readUInt32BE(genericSceneFlags2Index);
            let chestSceneFlags = flags!.readUInt32BE(chestSceneFlagsIndex);
            let collectibleSceneFlags = flags!.readUInt32BE(collectibleSceneFlagsIndex);

            let flag_array = [genericSceneFlags1, genericSceneFlags2, chestSceneFlags, collectibleSceneFlags];
            let mask_array = [genericMask1, genericMask2, chestMask, collectibleMask];

            for (let j = 0; j < flag_array.length; j++) {
                let f = flag_array[j];
                let m = mask_array[j];
                scratch.writeUInt32BE(f, 0);
                scratch2.writeUInt32BE(m, 0);
                for (let k = 0; k < scratch.byteLength; k++) {
                    scratch[k] &= scratch2[k];
                }
                f = scratch.readUInt32BE(0);
                flag_array[j] = f;
            }
            !
                flags!.writeUInt32BE(flag_array[0], genericSceneFlags1Index);
            flags!.writeUInt32BE(flag_array[1], genericSceneFlags2Index);
            flags!.writeUInt32BE(flag_array[2], chestSceneFlagsIndex);
            flags!.writeUInt32BE(flag_array[3], collectibleSceneFlagsIndex);
        }
        parseFlagChanges(flags!, this.clientStorage.permFlags);
        let bits = this.ModLoader.emulator.rdramReadBitsBuffer(0x801F0568, 99);
        let buf = Buffer.alloc(this.permFlagBits.length);
        for (let i = 0; i < this.permFlagBits.length; i++) {
            buf.writeUInt8(bits.readUInt8(this.permFlagBits[i]), i);
        }
        let flips = parseFlagChanges(buf, this.clientStorage.permEvents);
        Object.keys(flips).forEach((key: string) => {
            let bit = parseInt(key);
            let value = flips[key];
            if (value > 0) {
                this.ModLoader.logger.info(this.permFlagNames.get(bit)!);
            }
        });
        this.ModLoader.clientSide.sendPacket(new Z64O_PermFlagsPacket(this.clientStorage.permFlags, this.clientStorage.permEvents, this.ModLoader.clientLobby));
    }

    mmrSyncCheck() {
        let skullShuffle0: number = this.ModLoader.emulator.rdramRead32(0x8014449C);
        let skullShuffle1: number = this.ModLoader.emulator.rdramRead32(0x801444A4);
        let strayShuffle0: number = this.ModLoader.emulator.rdramRead32(0x8014450C);
        let strayShuffle1: number = this.ModLoader.emulator.rdramRead32(0x80144514);
        let strayShuffle2: number = this.ModLoader.emulator.rdramRead32(0x8014451C);
        let strayShuffle3: number = this.ModLoader.emulator.rdramRead32(0x8014452C);

        if (skullShuffle0 === 0x00000000 || skullShuffle1 === 0x00000000) markAsSkullSync();
        if (strayShuffle0 === 0x00000000 || strayShuffle1 === 0x00000000 || strayShuffle2 === 0x00000000 || strayShuffle3 === 0x00000000) markAsFairySync();

        this.ModLoader.logger.info("Skulltula Sync: " + MM_IS_SKULL);
        this.ModLoader.logger.info("Fairy Sync: " + MM_IS_FAIRY);
    }

    @NetworkHandler('Z64O_PermFlagsPacket')
    onPermFlags(packet: Z64O_PermFlagsPacket) {
        parseFlagChanges(packet.flags, this.clientStorage.permFlags);
        let save = this.core.MM!.save.permFlags;
        parseFlagChanges(this.clientStorage.permFlags, save);
        this.core.MM!.save.permFlags = save;
        parseFlagChanges(packet.eventFlags, this.clientStorage.permEvents);
        let bits = this.ModLoader.emulator.rdramReadBitsBuffer(0x801F0568, 99);
        for (let i = 0; i < this.permFlagBits.length; i++) {
            bits.writeUInt8(this.clientStorage.permEvents.readUInt8(i), this.permFlagBits[i]);
        }
        this.ModLoader.emulator.rdramWriteBitsBuffer(0x801F0568, bits);
    }

    @NetworkHandler('Z64O_ErrorPacket')
    onError(packet: Z64O_ErrorPacket) {
        this.ModLoader.logger.error(packet.message);
    }

    @EventHandler(Z64OnlineEvents.SWORD_NEEDS_UPDATE)
    onSwordChange(evt: Sword) {
        console.log(`Sword updated: ${Sword[evt]}`)
        this.core.MM!.save.sword_helper.updateSwordonB();
    }

    @EventHandler(ModLoaderEvents.ON_ROM_PATCHED_POST)
    onRomPost(evt: any) {
        let rom: Buffer = evt.rom;
        let offset: number = rom.indexOf('DPAD_CONFIG');
        if (offset === -1) {
            this.ModLoader.logger.debug("This is not an MMR Rom.");
        } else {
            this.ModLoader.logger.debug("This is an MMR Rom.");
            this.clientStorage.isMMR = true;
            markAsRandomizer();
        }
    }


    @onTick()
    onTick() {
        if (
            !this.core.MM!.helper.isTitleScreen() &&
            this.core.MM!.helper.isSceneNumberValid()
        ) {
            if (!this.core.MM!.helper.isPaused()) {
                this.ModLoader.me.data["world"] = this.clientStorage.world;
                if (!this.clientStorage.first_time_sync) {
                    return;
                }
                if (this.LobbyConfig.actor_syncing) {
                    //this.actorHooks.tick();
                }
                if (this.LobbyConfig.data_syncing) {
                    //this.autosaveSceneData();
                    this.updateBottles();
                    this.updateSyncContext();
                    this.updatePermFlags();
                    this.syncTimer++;
                }
            }
        }
        if (this.core.MM!.helper.isTitleScreen() && this.core.MM!.global.scene_framecount === 1 && !this.core.MM!.save.checksum) this.mmrSyncCheck();
    }

    inventoryUpdateTick() {
        this.updateInventory();
    }
}