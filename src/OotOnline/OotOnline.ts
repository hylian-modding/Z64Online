import { InjectCore } from 'modloader64_api/CoreInjection';
import {
  bus,
  EventHandler,
  EventsClient,
  EventServerJoined,
  EventServerLeft,
  EventsServer,
  setupEventHandlers,
} from 'modloader64_api/EventHandler';
import * as ModLoader from 'modloader64_api/IModLoaderAPI';
import {
  INetworkPlayer,
  IPacketHeader,
  LobbyData,
  NetworkHandler,
  ServerNetworkHandler,
  setupNetworkHandlers,
} from 'modloader64_api/NetworkHandler';
import {
  IOOTCore,
  LinkState,
  OotEvents,
  AmmoUpgrade,
  Magic,
  InventoryItem,
  MagicQuantities,
} from 'modloader64_api/OOT/OOTAPI';
import {
  IOotOnlineHelpers,
  OotOnlineEvents,
  OotOnline_PlayerScene,
} from './OotoAPI/OotoAPI';
import { ActorHookingManager } from './data/ActorHookingSystem';
import { EquestrianOverlord } from './data/eponaPuppet/EquestrianOverlord';
import {
  applyEquipmentToContext,
  applyInventoryToContext,
  applyQuestSaveToContext,
  createEquipmentFromContext,
  createInventoryFromContext,
  createQuestSaveFromContext,
  EquipmentSave,
  InventorySave,
  mergeEquipmentData,
  mergeInventoryData,
  mergeQuestSaveData,
  QuestSave,
  createDungeonItemDataFromContext,
  applyDungeonItemDataToContext,
  mergeDungeonItemData,
  OotoDungeonItemContext,
  IDungeonItemSave,
  createSmallKeyDataFromContext,
  mergeSmallKeyData,
  IKeySaveContainer,
  applySmallKeyDataToContext,
} from './data/OotoSaveData';
import { PuppetOverlord } from './data/linkPuppet/PuppetOverlord';
import {
  Ooto_ClientFlagUpdate,
  Ooto_ClientSceneContextUpdate,
  Ooto_DownloadRequestPacket,
  Ooto_DownloadResponsePacket,
  Ooto_DownloadResponsePacket2,
  Ooto_PuppetPacket,
  Ooto_ScenePacket,
  Ooto_SceneRequestPacket,
  Ooto_ServerFlagUpdate,
  Ooto_SubscreenSyncPacket,
} from './data/OotOPackets';
import path from 'path';
import { GUITunnelPacket } from 'modloader64_api/GUITunnel';
import fs from 'fs';
import { OotOnlineStorage } from './OotOnlineStorage';
import { OotOnlineStorageClient } from './OotOnlineStorageClient';
import deep from 'deep-equal';

export const SCENE_ARR_SIZE = 0xb0c;
export const EVENT_ARR_SIZE = 0x1c;
export const ITEM_FLAG_ARR_SIZE = 0x8;
export const INF_ARR_SIZE = 0x3c;
export const SKULLTULA_ARR_SIZE = 0x18;

interface IOotOnlineLobbyConfig {
  data_syncing: boolean;
  actor_syncing: boolean;
}

class OotOnline implements ModLoader.IPlugin, IOotOnlineHelpers {
  ModLoader!: ModLoader.IModLoaderAPI;
  @InjectCore()
  core!: IOOTCore;
  LobbyConfig: IOotOnlineLobbyConfig = {} as IOotOnlineLobbyConfig;

  // Client variables
  overlord!: PuppetOverlord;
  actorHooks!: ActorHookingManager;
  EquestrianCenter!: EquestrianOverlord;
  // Storage
  clientStorage: OotOnlineStorageClient = new OotOnlineStorageClient();

  constructor() { }

  debuggingBombs() {
    this.core.save.inventory.bombBag = AmmoUpgrade.BASE;
    this.core.save.inventory.bombs = true;
    this.core.save.inventory.bombsCount = 20;

    this.core.save.inventory.bombchus = true;
    this.core.save.inventory.bombchuCount = 20;
  }

  debuggingMagic(){
    this.core.save.magic_meter_size = Magic.NORMAL;
    this.core.save.magic_current = MagicQuantities.NORMAL;
  }

  preinit(): void {
    this.overlord = new PuppetOverlord(this.ModLoader.logger);
    this.actorHooks = new ActorHookingManager(this.ModLoader, this.core, this);
    this.EquestrianCenter = new EquestrianOverlord(
      this,
      this.ModLoader,
      this.core
    );
    setupEventHandlers(this.actorHooks);
    setupNetworkHandlers(this.actorHooks);

    setupEventHandlers(this.EquestrianCenter);
    setupNetworkHandlers(this.EquestrianCenter);
  }

  init(): void { }

  postinit(): void {
    this.overlord.postinit(
      this.core,
      this.ModLoader.emulator,
      this.ModLoader.me,
      this.ModLoader
    );
    this.actorHooks.onPostInit();
    this.ModLoader.gui.openWindow(700, 450, path.resolve(path.join(__dirname, "gui", "map.html")));
  }

  @EventHandler(OotOnlineEvents.GHOST_MODE)
  onGhostInstruction(evt: any) {
    this.LobbyConfig.actor_syncing = false;
    this.LobbyConfig.data_syncing = false;
  }

  @EventHandler(EventsClient.ON_INJECT_FINISHED)
  onInject(evt: any) { }

  updateInventory() {
    if (!this.clientStorage.first_time_sync) {
      if (!this.clientStorage.needs_update && this.core.link.state === LinkState.BUSY) {
        this.clientStorage.needs_update = true;
      } else if (
        this.clientStorage.needs_update &&
        this.core.link.state === LinkState.STANDING
      ) {
        this.ModLoader.logger.info("updateInventory()");
        this.ModLoader.clientSide.sendPacket(
          new Ooto_SubscreenSyncPacket(
            createInventoryFromContext(this.core.save),
            createEquipmentFromContext(this.core.save),
            createQuestSaveFromContext(this.core.save),
            createDungeonItemDataFromContext(this.core.save.dungeonItemManager),
            createSmallKeyDataFromContext(this.core.save),
            this.ModLoader.clientLobby
          )
        );
        this.clientStorage.needs_update = false;
      }
    } else {
      if (!this.clientStorage.sent_download_request) {
        this.ModLoader.clientSide.sendPacket(new Ooto_DownloadRequestPacket(this.ModLoader.clientLobby));
        this.clientStorage.sent_download_request = true;
      }
    }
  }

  updateFlags() {
    if (!this.clientStorage.first_time_sync) {
      let scene_data = this.core.save.permSceneData;
      let event_data = this.core.save.eventFlags;
      let item_data = this.core.save.itemFlags;
      let inf_data = this.core.save.infTable;
      let skulltula_data = this.core.save.skulltulaFlags;

      let scenes: any = this.parseFlagChanges(scene_data, this.clientStorage.sceneStorage);
      let events: any = this.parseFlagChanges(event_data, this.clientStorage.eventStorage);
      let items: any = this.parseFlagChanges(item_data, this.clientStorage.itemFlagStorage);
      let inf: any = this.parseFlagChanges(inf_data, this.clientStorage.infStorage);
      let skulltulas: any = this.parseFlagChanges(skulltula_data, this.clientStorage.skulltulaStorage);

      if (
        Object.keys(scenes).length > 0 ||
        Object.keys(events).length > 0 ||
        Object.keys(items).length > 0 ||
        Object.keys(inf).length > 0 ||
        Object.keys(skulltulas).length > 0
      ) {
        this.ModLoader.logger.info("updateFlags()");
        this.ModLoader.clientSide.sendPacket(
          new Ooto_ClientFlagUpdate(scenes, events, items, inf, skulltulas, this.ModLoader.clientLobby)
        );
      }
    }
  }

  autosaveSceneData() {
    if (
      !this.core.helper.isLinkEnteringLoadingZone() &&
      this.core.global.scene_framecount > 10
    ) {
      let live_scene_chests: Buffer = this.core.global.liveSceneData_chests;
      let live_scene_switches: Buffer = this.core.global.liveSceneData_switch;
      let live_scene_collect: Buffer = this.core.global.liveSceneData_collectable;
      let live_scene_clear: Buffer = this.core.global.liveSceneData_clear;
      let live_scene_temp: Buffer = this.core.global.liveSceneData_temp;
      let save_scene_data: Buffer = this.core.global.getSaveDataForCurrentScene();

      let save: Buffer = Buffer.alloc(0x1C);
      live_scene_chests.copy(save, 0x0); // Chests
      live_scene_switches.copy(save, 0x4); // Switches
      live_scene_clear.copy(save, 0x8); // Room Clear
      live_scene_collect.copy(save, 0xC); // Collectables
      live_scene_temp.copy(save, 0x10) // Unused space.
      save_scene_data.copy(save, 0x14, 0x14, 0x18); // Visited Rooms.
      save_scene_data.copy(save, 0x18, 0x18, 0x1C); // Visited Rooms.

      let save_hash_2: string = this.ModLoader.utils.hashBuffer(save);

      if (save_hash_2 !== this.clientStorage.autoSaveHash) {
        this.ModLoader.logger.info("autosaveSceneData()");
        for (let i = 0; i < save_scene_data.byteLength; i++) {
          save_scene_data[i] |= save[i];
        }
        this.clientStorage.autoSaveHash = save_hash_2;
      } else {
        return;
      }

      this.core.global.writeSaveDataForCurrentScene(save_scene_data);

      this.ModLoader.clientSide.sendPacket(new Ooto_ClientSceneContextUpdate(live_scene_chests, live_scene_switches, live_scene_collect, live_scene_clear, live_scene_temp, this.ModLoader.clientLobby));
    }
  }

  onTick(): void {
    if (
      !this.core.helper.isTitleScreen() &&
      this.core.helper.isSceneNumberValid()
    ) {
      if (!this.core.helper.isPaused()) {
        this.overlord.onTick();
        if (this.LobbyConfig.actor_syncing) {
          this.actorHooks.onTick();
        }
        this.EquestrianCenter.onTick();
        if (this.LobbyConfig.data_syncing) {
          this.autosaveSceneData();
          if (this.clientStorage.lastKnownSkullCount < this.core.save.questStatus.goldSkulltulas) {
            this.clientStorage.needs_update = true;
            this.clientStorage.lastKnownSkullCount = this.core.save.questStatus.goldSkulltulas;
            this.ModLoader.logger.info("Skulltula update.");
          }
          let bottles: Array<InventoryItem> = [this.core.save.inventory.bottle_1, this.core.save.inventory.bottle_2, this.core.save.inventory.bottle_3, this.core.save.inventory.bottle_4];
          if (!deep(bottles, this.clientStorage.bottleCache)) {
            this.clientStorage.needs_update = true;
            this.clientStorage.bottleCache = bottles;
            this.ModLoader.logger.info("Bottle update.");
          }
        }
      }
      let state = this.core.link.state;
      if (
        state === LinkState.BUSY ||
        state === LinkState.GETTING_ITEM ||
        state === LinkState.TALKING
      ) {
        this.clientStorage.needs_update = true;
      } else if (state === LinkState.STANDING && this.clientStorage.needs_update && this.LobbyConfig.data_syncing) {
        this.updateInventory();
        this.updateFlags();
      }
    }
  }

  //------------------------------
  // Lobby Setup
  //------------------------------

  @EventHandler(EventsClient.CONFIGURE_LOBBY)
  onLobbySetup(lobby: LobbyData): void {
    lobby.data['OotOnline:data_syncing'] = true;
    lobby.data['OotOnline:actor_syncing'] = true;
  }

  @EventHandler(EventsClient.ON_LOBBY_JOIN)
  onJoinedLobby(lobby: LobbyData): void {
    this.LobbyConfig.actor_syncing = lobby.data['OotOnline:actor_syncing'];
    this.LobbyConfig.data_syncing = lobby.data['OotOnline:data_syncing'];
    this.ModLoader.logger.info('OotOnline settings inherited from lobby.');
  }

  //------------------------------
  // Deal with player connections.
  //------------------------------

  @EventHandler(EventsServer.ON_LOBBY_CREATE)
  onLobbyCreated(lobby: string) {
    this.ModLoader.lobbyManager.createLobbyStorage(lobby, this, new OotOnlineStorage());
  }

  @EventHandler(EventsClient.ON_PLAYER_JOIN)
  onPlayerJoin(player: INetworkPlayer) {
    this.overlord.registerPuppet(player);
  }

  @EventHandler(EventsClient.ON_PLAYER_LEAVE)
  onPlayerLeft(player: INetworkPlayer) {
    this.overlord.unregisterPuppet(player);
    this.ModLoader.gui.tunnel.send("OotOnline:onPlayerLeft", new GUITunnelPacket("OotOnline", "OotOnline:onPlayerLeft", player));
  }

  @EventHandler(EventsServer.ON_LOBBY_JOIN)
  onPlayerJoin_server(evt: EventServerJoined) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(evt.lobby, this) as OotOnlineStorage;
    storage.players[evt.player.uuid] = -1;
    storage.networkPlayerInstances[evt.player.uuid] = evt.player;
  }

  @EventHandler(EventsServer.ON_LOBBY_LEAVE)
  onPlayerLeft_server(evt: EventServerLeft) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(evt.lobby, this) as OotOnlineStorage;
    delete storage.players[evt.player.uuid];
    delete storage.networkPlayerInstances[evt.player.uuid];
  }

  //------------------------------
  // Scene handling
  //------------------------------

  @EventHandler(OotEvents.ON_LOADING_ZONE)
  onLoadingZone(evt: any) {
    this.overlord.localPlayerLoadingZone();
  }

  @EventHandler(OotEvents.ON_SCENE_CHANGE)
  onSceneChange(scene: number) {
    this.overlord.localPlayerChangingScenes(scene, this.core.save.age);
    this.ModLoader.clientSide.sendPacket(
      new Ooto_ScenePacket(this.ModLoader.clientLobby, scene, this.core.save.age)
    );
    this.ModLoader.logger.info('client: I moved to scene ' + scene + '.');
    this.ModLoader.gui.tunnel.send("OotOnline:onSceneChanged", new GUITunnelPacket("OotOnline", "OotOnline:onSceneChanged", scene));
  }

  @EventHandler(OotEvents.ON_ROOM_CHANGE)
  onRoomChange(room: number) {
    this.ModLoader.gui.tunnel.send("OotOnline:onRoomChanged", new GUITunnelPacket("OotOnline", "OotOnline:onRoomChanged", room));
  }

  @ServerNetworkHandler('Ooto_ScenePacket')
  onSceneChange_server(packet: Ooto_ScenePacket) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(packet.lobby, this) as OotOnlineStorage;
    storage.players[packet.player.uuid] = packet.scene;
    this.ModLoader.logger.info(
      'Server: Player ' +
      packet.player.nickname +
      ' moved to scene ' +
      packet.scene +
      '.'
    );
    bus.emit(
      OotOnlineEvents.SERVER_PLAYER_CHANGED_SCENES,
      new OotOnline_PlayerScene(packet.player, packet.lobby, packet.scene)
    );
  }

  @NetworkHandler('Ooto_ScenePacket')
  onSceneChange_client(packet: Ooto_ScenePacket) {
    this.ModLoader.logger.info(
      'client receive: Player ' +
      packet.player.nickname +
      ' moved to scene ' +
      packet.scene +
      '.'
    );
    this.overlord.changePuppetScene(packet.player, packet.scene, packet.age);
    bus.emit(
      OotOnlineEvents.CLIENT_REMOTE_PLAYER_CHANGED_SCENES,
      new OotOnline_PlayerScene(packet.player, packet.lobby, packet.scene)
    );
    this.ModLoader.gui.tunnel.send("OotOnline:onSceneChanged_Network", new GUITunnelPacket("OotOnline", "OotOnline:onSceneChanged_Network", packet));
  }

  // This packet is basically 'where the hell are you?' if a player has a puppet on file but doesn't know what scene its suppose to be in.
  @NetworkHandler('Ooto_SceneRequestPacket')
  onSceneRequest_client(packet: Ooto_SceneRequestPacket) {
    if (this.core.save !== undefined) {
      this.ModLoader.clientSide.sendPacketToSpecificPlayer(
        new Ooto_ScenePacket(this.ModLoader.clientLobby, this.core.global.scene, this.core.save.age),
        packet.player
      );
    }
  }

  //------------------------------
  // Puppet handling
  //------------------------------

  sendPacketToPlayersInScene(packet: IPacketHeader) {
    try {
      let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(packet.lobby, this) as OotOnlineStorage;
      Object.keys(storage.players).forEach((key: string) => {
        if (
          storage.players[key] === storage.players[packet.player.uuid]
        ) {
          if (
            storage.networkPlayerInstances[key].uuid !== packet.player.uuid
          ) {
            this.ModLoader.serverSide.sendPacketToSpecificPlayer(
              packet,
              storage.networkPlayerInstances[key]
            );
          }
        }
      });
    } catch (err) {
    }
  }

  @ServerNetworkHandler('Ooto_PuppetPacket')
  onPuppetData_server(packet: Ooto_PuppetPacket) {
    this.sendPacketToPlayersInScene(packet);
  }

  @NetworkHandler('Ooto_PuppetPacket')
  onPuppetData_client(packet: Ooto_PuppetPacket) {
    if (this.core.helper.isTitleScreen() || this.core.helper.isPaused() || this.core.helper.isLinkEnteringLoadingZone()) {
      return;
    }
    this.overlord.processPuppetPacket(packet);
  }

  //------------------------------
  // Subscreen Syncing
  //------------------------------

  // Client is logging in and wants to know how to proceed.
  @ServerNetworkHandler('Ooto_DownloadRequestPacket')
  onDownloadPacket_server(packet: Ooto_DownloadRequestPacket) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(packet.lobby, this) as OotOnlineStorage;
    if (storage.saveGameSetup) {
      // Game is running, get data.
      this.ModLoader.serverSide.sendPacketToSpecificPlayer(
        new Ooto_DownloadResponsePacket(
          new Ooto_SubscreenSyncPacket(
            storage.inventoryStorage,
            storage.equipmentStorage,
            storage.questStorage,
            storage.dungeonItemStorage,
            storage.smallKeyStorage,
            packet.lobby
          ),
          new Ooto_ServerFlagUpdate(
            storage.sceneStorage,
            storage.eventStorage,
            storage.itemFlagStorage,
            storage.infStorage,
            storage.skulltulaStorage,
            packet.lobby
          ),
          packet.lobby
        ),
        packet.player
      );
    } else {
      // Game is not running, give me your data.
      storage.saveGameSetup = true;
      this.ModLoader.serverSide.sendPacketToSpecificPlayer(
        new Ooto_DownloadResponsePacket2(packet.lobby),
        packet.player
      );
    }
  }

  // The server is giving me data.
  @NetworkHandler('Ooto_DownloadResponsePacket')
  onDownloadPacket_client(packet: Ooto_DownloadResponsePacket) {
    this.ModLoader.logger.info('Retrieving savegame from server...');
    applyInventoryToContext(packet.subscreen.inventory, this.core.save);
    applyEquipmentToContext(packet.subscreen.equipment, this.core.save);
    applyQuestSaveToContext(packet.subscreen.quest, this.core.save);
    applyDungeonItemDataToContext(packet.subscreen.dungeonItems, this.core.save.dungeonItemManager);
    this.core.save.permSceneData = packet.flags.scenes;
    this.core.save.eventFlags = packet.flags.events;
    this.core.save.itemFlags = packet.flags.items;
    this.core.save.infTable = packet.flags.inf;
    this.core.save.skulltulaFlags = packet.flags.skulltulas;
    this.clientStorage.first_time_sync = false;
  }

  // I am giving the server data.
  @NetworkHandler('Ooto_DownloadResponsePacket2')
  onDownPacket2_client(packet: Ooto_DownloadResponsePacket2) {
    this.clientStorage.first_time_sync = false;
    this.ModLoader.logger.info('The lobby is mine!');
    this.updateInventory();
    this.updateFlags();
  }

  @ServerNetworkHandler('Ooto_SubscreenSyncPacket')
  onItemSync_server(packet: Ooto_SubscreenSyncPacket) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(packet.lobby, this) as OotOnlineStorage;
    mergeInventoryData(storage.inventoryStorage, packet.inventory);
    mergeEquipmentData(storage.equipmentStorage, packet.equipment);
    mergeQuestSaveData(storage.questStorage, packet.quest);
    mergeDungeonItemData(storage.dungeonItemStorage, packet.dungeonItems);
    mergeSmallKeyData(storage.smallKeyStorage, packet.smallKeys);
    this.ModLoader.serverSide.sendPacket(
      new Ooto_SubscreenSyncPacket(
        storage.inventoryStorage,
        storage.equipmentStorage,
        storage.questStorage,
        storage.dungeonItemStorage,
        storage.smallKeyStorage,
        packet.lobby
      )
    );
  }

  @NetworkHandler('Ooto_SubscreenSyncPacket')
  onItemSync_client(packet: Ooto_SubscreenSyncPacket) {
    let inventory: InventorySave = createInventoryFromContext(
      this.core.save
    ) as InventorySave;
    let equipment: EquipmentSave = createEquipmentFromContext(
      this.core.save
    ) as EquipmentSave;
    let quest: QuestSave = createQuestSaveFromContext(this.core.save);
    let dungeonItems: OotoDungeonItemContext = createDungeonItemDataFromContext(this.core.save.dungeonItemManager) as IDungeonItemSave;
    let smallKeys: IKeySaveContainer = createSmallKeyDataFromContext(this.core.save);
    mergeInventoryData(inventory, packet.inventory);
    mergeEquipmentData(equipment, packet.equipment);
    mergeQuestSaveData(quest, packet.quest);
    mergeDungeonItemData(dungeonItems, packet.dungeonItems);
    mergeSmallKeyData(smallKeys, packet.smallKeys);
    applyInventoryToContext(inventory, this.core.save);
    applyEquipmentToContext(equipment, this.core.save);
    applyQuestSaveToContext(quest, this.core.save);
    applyDungeonItemDataToContext(dungeonItems, this.core.save.dungeonItemManager);
    applySmallKeyDataToContext(smallKeys, this.core.save);
    console.log(smallKeys);
  }

  //------------------------------
  // Flag Syncing
  //------------------------------

  parseFlagChanges(incoming: Buffer, storage: Buffer): any {
    let arr: any = {};
    for (let i = 0; i < incoming.byteLength; i++) {
      if (storage[i] === incoming[i] || incoming[i] === 0) {
        continue;
      }
      storage[i] |= incoming[i];
      arr[i] = storage[i];
    }
    return arr;
  }

  @ServerNetworkHandler('Ooto_ClientFlagUpdate')
  onSceneFlagSync_server(packet: Ooto_ClientFlagUpdate) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(packet.lobby, this) as OotOnlineStorage;
    Object.keys(packet.scenes).forEach((key: string) => {
      let k = parseInt(key);
      let value = packet.scenes[k];
      if (storage.sceneStorage[k] !== value) {
        storage.sceneStorage[k] |= value;
      }
    });
    Object.keys(packet.events).forEach((key: string) => {
      let k = parseInt(key);
      let value = packet.events[k];
      if (storage.eventStorage[k] !== value) {
        storage.eventStorage[k] |= value;
      }
    });
    Object.keys(packet.items).forEach((key: string) => {
      let k = parseInt(key);
      let value = packet.items[k];
      if (storage.itemFlagStorage[k] !== value) {
        storage.itemFlagStorage[k] |= value;
      }
    });
    Object.keys(packet.inf).forEach((key: string) => {
      let k = parseInt(key);
      let value = packet.inf[k];
      if (storage.infStorage[k] !== value) {
        storage.infStorage[k] |= value;
      }
    });
    Object.keys(packet.skulltulas).forEach((key: string) => {
      let k = parseInt(key);
      let value = packet.skulltulas[k];
      if (storage.skulltulaStorage[k] !== value) {
        storage.skulltulaStorage[k] |= value;
      }
    });
    this.ModLoader.serverSide.sendPacket(
      new Ooto_ServerFlagUpdate(
        storage.sceneStorage,
        storage.eventStorage,
        storage.itemFlagStorage,
        storage.infStorage,
        storage.skulltulaStorage,
        packet.lobby
      )
    );
  }

  @NetworkHandler('Ooto_ServerFlagUpdate')
  onSceneFlagSync_client(packet: Ooto_ServerFlagUpdate) {
    let scenes: Buffer = this.core.save.permSceneData;
    let events: Buffer = this.core.save.eventFlags;
    let items: Buffer = this.core.save.itemFlags;
    let inf: Buffer = this.core.save.infTable;
    let skulltulas: Buffer = this.core.save.skulltulaFlags;

    let incoming_scenes: Buffer = packet.scenes;
    let incoming_events: Buffer = packet.events;
    let incoming_items: Buffer = packet.items;
    let incoming_inf: Buffer = packet.inf;
    let incoming_skulltulas: Buffer = packet.skulltulas;

    let scene_arr: any = this.parseFlagChanges(incoming_scenes, scenes);
    let event_arr: any = this.parseFlagChanges(incoming_events, events);
    let items_arr: any = this.parseFlagChanges(incoming_items, items);
    let inf_arr: any = this.parseFlagChanges(incoming_inf, inf);
    let skulltulas_arr: any = this.parseFlagChanges(incoming_skulltulas, skulltulas);

    if (Object.keys(scene_arr).length > 0) {
      this.core.save.permSceneData = scenes;
    }
    if (Object.keys(event_arr).length > 0) {
      this.core.save.eventFlags = events;
    }
    if (Object.keys(items_arr).length > 0) {
      this.core.save.itemFlags = items;
    }
    if (Object.keys(inf_arr).length > 0) {
      this.core.save.infTable = inf;
    }
    if (Object.keys(skulltulas_arr).length > 0) {
      this.core.save.skulltulaFlags = skulltulas;
    }
  }

  //------------------------------
  // Scene Context
  //------------------------------

  @ServerNetworkHandler('Ooto_ClientSceneContextUpdate')
  onSceneContextSync_server(packet: Ooto_ClientSceneContextUpdate) {
    this.sendPacketToPlayersInScene(packet);
  }

  @NetworkHandler('Ooto_ClientSceneContextUpdate')
  onSceneContextSync_client(packet: Ooto_ClientSceneContextUpdate) {
    if (this.core.helper.isTitleScreen() || !this.core.helper.isSceneNumberValid()) {
      return;
    }
    let buf1: Buffer = this.core.global.liveSceneData_chests;
    if (Object.keys(this.parseFlagChanges(packet.chests, buf1) > 0)) {
      this.core.global.liveSceneData_chests = buf1;
    }

    let buf2: Buffer = this.core.global.liveSceneData_switch;
    if (Object.keys(this.parseFlagChanges(packet.switches, buf2) > 0)) {
      this.core.global.liveSceneData_switch = buf2;
    }

    let buf3: Buffer = this.core.global.liveSceneData_collectable;
    if (Object.keys(this.parseFlagChanges(packet.collect, buf3) > 0)) {
      this.core.global.liveSceneData_collectable = buf3;
    }

    let buf4: Buffer = this.core.global.liveSceneData_clear;
    if (Object.keys(this.parseFlagChanges(packet.clear, buf4) > 0)) {
      this.core.global.liveSceneData_clear = buf4;
    }

    let buf5: Buffer = this.core.global.liveSceneData_temp;
    if (Object.keys(this.parseFlagChanges(packet.temp, buf5) > 0)) {
      this.core.global.liveSceneData_temp = buf5;
    }
  }

  // Healing
  healPlayer() {
    this.ModLoader.emulator.rdramWrite16(global.ModLoader.save_context + 0x1424, 0x65);
  }

  @EventHandler(OotOnlineEvents.GAINED_PIECE_OF_HEART)
  onNeedsHeal1(evt: any) {
    this.healPlayer();
  }

  @EventHandler(OotOnlineEvents.GAINED_HEART_CONTAINER)
  onNeedsHeal2(evt: any) {
    this.healPlayer();
  }

  @EventHandler(OotOnlineEvents.MAGIC_METER_INCREASED)
  onNeedsMagic(size: Magic) {
    this.core.save.magic_current = size;
  }
}

module.exports = OotOnline;
