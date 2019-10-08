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
  LobbyVariable,
  setupLobbyVariable,
} from 'modloader64_api/LobbyVariable';
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
} from 'modloader64_api/OOT/OOTAPI';
import {
  IOotOnlineHelpers,
  OotOnlineEvents,
  OotOnline_PlayerScene,
} from './api/OotoAPI';
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

const SCENE_ARR_SIZE = 0xb0c;
const EVENT_ARR_SIZE = 0x1c;
const ITEM_FLAG_ARR_SIZE = 0x8;
const INF_ARR_SIZE = 0x3c;
const SKULLTULA_ARR_SIZE = 0x18;

interface IOotOnlineLobbyConfig {
  data_syncing: boolean;
  actor_syncing: boolean;
}

class OotOnlineStorage {
  networkPlayerInstances: any = {};
  players: any = {};
  inventoryStorage: InventorySave = new InventorySave();
  equipmentStorage: EquipmentSave = new EquipmentSave();
  questStorage: QuestSave = new QuestSave();
  sceneStorage: Buffer = Buffer.alloc(SCENE_ARR_SIZE);
  saveGameSetup = false;
  eventStorage: Buffer = Buffer.alloc(EVENT_ARR_SIZE);
  itemFlagStorage: Buffer = Buffer.alloc(ITEM_FLAG_ARR_SIZE);
  infStorage: Buffer = Buffer.alloc(INF_ARR_SIZE);
  skulltulaStorage: Buffer = Buffer.alloc(SKULLTULA_ARR_SIZE);
}

class OotOnline implements ModLoader.IPlugin, IOotOnlineHelpers {
  ModLoader!: ModLoader.IModLoaderAPI;
  @InjectCore()
  core!: IOOTCore;
  LobbyConfig: IOotOnlineLobbyConfig = {} as IOotOnlineLobbyConfig;

  @LobbyVariable('OotOnline')
  storage: OotOnlineStorage = new OotOnlineStorage();

  // Client variables
  overlord!: PuppetOverlord;
  needs_update = false;
  scene_cache: Buffer = Buffer.alloc(SCENE_ARR_SIZE);
  events_cache: Buffer = Buffer.alloc(EVENT_ARR_SIZE);
  items_cache: Buffer = Buffer.alloc(ITEM_FLAG_ARR_SIZE);
  inf_cache: Buffer = Buffer.alloc(INF_ARR_SIZE);
  skulltula_cache: Buffer = Buffer.alloc(SKULLTULA_ARR_SIZE);
  first_time_sync = true;
  sent_download_request = false;
  actorHooks!: ActorHookingManager;
  EquestrianCenter!: EquestrianOverlord;

  constructor() { }

  debuggingBombs() {
    this.core.save.inventory.bombBag = AmmoUpgrade.BASE;
    this.core.save.inventory.bombs = true;
    this.core.save.inventory.bombsCount = 20;

    this.core.save.inventory.bombchus = true;
    this.core.save.inventory.bombchuCount = 20;
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
    setupLobbyVariable(this.EquestrianCenter);
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
    this.ModLoader.gui.openWindow(700, 400, path.resolve(path.join(__dirname, "gui", "map.html")));
  }

  @EventHandler(OotOnlineEvents.GHOST_MODE)
  onGhostInstruction(evt: any) {
    this.LobbyConfig.actor_syncing = false;
    this.LobbyConfig.data_syncing = false;
  }

  @EventHandler(EventsClient.ON_INJECT_FINISHED)
  onInject(evt: any) { }

  updateInventory() {
    if (!this.first_time_sync) {
      if (!this.needs_update && this.core.link.state === LinkState.BUSY) {
        this.needs_update = true;
      } else if (
        this.needs_update &&
        this.core.link.state === LinkState.STANDING
      ) {
        this.ModLoader.logger.info("updateInventory()");
        this.ModLoader.clientSide.sendPacket(
          new Ooto_SubscreenSyncPacket(
            createInventoryFromContext(this.core.save),
            createEquipmentFromContext(this.core.save),
            createQuestSaveFromContext(this.core.save)
          )
        );
        this.needs_update = false;
      }
    } else {
      if (!this.sent_download_request) {
        this.ModLoader.clientSide.sendPacket(new Ooto_DownloadRequestPacket());
        this.sent_download_request = true;
      }
    }
  }

  updateFlags() {
    if (!this.first_time_sync) {
      let scene_data = this.core.save.permSceneData;
      let event_data = this.core.save.eventFlags;
      let item_data = this.core.save.itemFlags;
      let inf_data = this.core.save.infTable;
      let skulltula_data = this.core.save.skulltulaFlags;

      let scenes: any = this.parseFlagChanges(scene_data, this.scene_cache);
      let events: any = this.parseFlagChanges(event_data, this.events_cache);
      let items: any = this.parseFlagChanges(item_data, this.items_cache);
      let inf: any = this.parseFlagChanges(inf_data, this.inf_cache);
      let skulltulas: any = this.parseFlagChanges(skulltula_data, this.skulltula_cache);

      if (
        Object.keys(scenes).length > 0 ||
        Object.keys(events).length > 0 ||
        Object.keys(items).length > 0 ||
        Object.keys(inf).length > 0 ||
        Object.keys(skulltulas).length > 0
      ) {
        this.ModLoader.logger.info("updateFlags()");
        this.ModLoader.clientSide.sendPacket(
          new Ooto_ClientFlagUpdate(scenes, events, items, inf, skulltulas)
        );
      }
    }
  }

  autosaveSceneData() {
    if (
      this.core.link.state !== LinkState.LOADING_ZONE &&
      this.core.global.scene_framecount > 10
    ) {
      let live_scene_chests: Buffer = this.core.global.liveSceneData_chests;
      let live_scene_switches: Buffer = this.core.global.liveSceneData_switch;
      let live_scene_collect: Buffer = this.core.global.liveSceneData_collectable;
      let live_scene_clear: Buffer = this.core.global.liveSceneData_clear;
      let live_scene_temp: Buffer = this.core.global.liveSceneData_temp;
      let save_scene_data: Buffer = this.core.global.getSaveDataForCurrentScene();

      let save_hash_1: string = this.ModLoader.utils.hashBuffer(save_scene_data);

      let save: Buffer = Buffer.alloc(0x1C);
      live_scene_chests.copy(save, 0x0); // Chests
      live_scene_switches.copy(save, 0x4); // Switches
      live_scene_clear.copy(save, 0x8); // Room Clear
      live_scene_collect.copy(save, 0xC); // Collectables
      live_scene_temp.copy(save, 0x10) // Unused space.
      save_scene_data.copy(save, 0x14, 0x14, 0x18); // Visited Rooms.
      save_scene_data.copy(save, 0x18, 0x18, 0x1C); // Visited Rooms.

      let save_hash_2: string = this.ModLoader.utils.hashBuffer(save);

      if (save_hash_1 !== save_hash_2) {
        this.ModLoader.logger.info("autosaveSceneData()");
        for (let i = 0; i < save_scene_data.byteLength; i++) {
          save_scene_data[i] |= save[i];
        }
      } else {
        return;
      }

      this.core.global.writeSaveDataForCurrentScene(save_scene_data);

      this.ModLoader.clientSide.sendPacket(new Ooto_ClientSceneContextUpdate(live_scene_chests, live_scene_switches, live_scene_collect, live_scene_clear, live_scene_temp));
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
      }
      let state = this.core.link.state;
      if (
        state === LinkState.BUSY ||
        state === LinkState.GETTING_ITEM ||
        state === LinkState.TALKING
      ) {
        this.needs_update = true;
      } else if (state === LinkState.STANDING && this.needs_update && this.LobbyConfig.data_syncing) {
        this.updateInventory();
        this.updateFlags();
        this.autosaveSceneData();
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

  @EventHandler(EventsClient.ON_PLAYER_JOIN)
  onPlayerJoin(player: INetworkPlayer) {
    this.overlord.registerPuppet(player);
  }

  @EventHandler(EventsClient.ON_PLAYER_LEAVE)
  onPlayerLeft(player: INetworkPlayer) {
    this.overlord.unregisterPuppet(player);
  }

  @EventHandler(EventsServer.ON_LOBBY_JOIN)
  onPlayerJoin_server(evt: EventServerJoined) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
      evt.lobby
    ).data['OotOnline'].storage as OotOnlineStorage;
    storage.players[evt.player.uuid] = -1;
    storage.networkPlayerInstances[evt.player.uuid] = evt.player;
  }

  @EventHandler(EventsServer.ON_LOBBY_LEAVE)
  onPlayerLeft_server(evt: EventServerLeft) {
    if (this.ModLoader.lobbyManager.getLobbyStorage(evt.lobby) === null) {
      return;
    }
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
      evt.lobby
    ).data['OotOnline'].storage as OotOnlineStorage;
    delete storage.players[evt.player.uuid];
    delete storage.networkPlayerInstances[evt.player.uuid];
    this.ModLoader.gui.tunnel.send("OotOnline:onPlayerLeft", new GUITunnelPacket("OotOnline", "OotOnline:onPlayerLeft", evt));
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
      new Ooto_ScenePacket(scene, this.core.save.age)
    );
    this.ModLoader.logger.info('client: I moved to scene ' + scene + '.');
    this.ModLoader.gui.tunnel.send("OotOnline:onSceneChanged", new GUITunnelPacket("OotOnline", "OotOnline:onSceneChanged", scene));
  }

  @EventHandler(OotEvents.ON_ROOM_CHANGE)
  onRoomChange(room: number){
    this.ModLoader.gui.tunnel.send("OotOnline:onRoomChanged", new GUITunnelPacket("OotOnline", "OotOnline:onRoomChanged", room));
  }

  @ServerNetworkHandler('Ooto_ScenePacket')
  onSceneChange_server(packet: Ooto_ScenePacket) {
    this.storage.players[packet.player.uuid] = packet.scene;
    this.ModLoader.logger.info(
      'Server: Player ' +
      packet.player.nickname +
      ' moved to scene ' +
      packet.scene +
      '.'
    );
    bus.emit(
      OotOnlineEvents.SERVER_PLAYER_CHANGED_SCENES,
      new OotOnline_PlayerScene(packet.player, packet.scene)
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
      new OotOnline_PlayerScene(packet.player, packet.scene)
    );
    this.ModLoader.gui.tunnel.send("OotOnline:onSceneChanged_Network", new GUITunnelPacket("OotOnline", "OotOnline:onSceneChanged_Network", packet));
  }

  // This packet is basically 'where the hell are you?' if a player has a puppet on file but doesn't know what scene its suppose to be in.
  @NetworkHandler('Ooto_SceneRequestPacket')
  onSceneRequest_client(packet: Ooto_SceneRequestPacket) {
    if (this.core.save !== undefined) {
      this.ModLoader.clientSide.sendPacketToSpecificPlayer(
        new Ooto_ScenePacket(this.core.global.scene, this.core.save.age),
        packet.player
      );
    }
  }

  //------------------------------
  // Puppet handling
  //------------------------------

  sendPacketToPlayersInScene(packet: IPacketHeader) {
    Object.keys(this.storage.players).forEach((key: string) => {
      if (
        this.storage.players[key] === this.storage.players[packet.player.uuid]
      ) {
        if (
          this.storage.networkPlayerInstances[key].uuid !== packet.player.uuid
        ) {
          this.ModLoader.serverSide.sendPacketToSpecificPlayer(
            packet,
            this.storage.networkPlayerInstances[key]
          );
        }
      }
    });
  }

  @ServerNetworkHandler('Ooto_PuppetPacket')
  onPuppetData_server(packet: Ooto_PuppetPacket) {
    this.sendPacketToPlayersInScene(packet);
  }

  @NetworkHandler('Ooto_PuppetPacket')
  onPuppetData_client(packet: Ooto_PuppetPacket) {
    if (this.core.helper.isTitleScreen() || this.core.helper.isPaused() || this.core.link.state === LinkState.LOADING_ZONE){
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
    if (this.storage.saveGameSetup) {
      // Game is running, get data.
      this.ModLoader.serverSide.sendPacketToSpecificPlayer(
        new Ooto_DownloadResponsePacket(
          new Ooto_SubscreenSyncPacket(
            this.storage.inventoryStorage,
            this.storage.equipmentStorage,
            this.storage.questStorage
          ),
          new Ooto_ServerFlagUpdate(
            this.storage.sceneStorage,
            this.storage.eventStorage,
            this.storage.itemFlagStorage,
            this.storage.infStorage,
            this.storage.skulltulaStorage
          )
        ),
        packet.player
      );
    } else {
      // Game is not running, give me your data.
      this.storage.saveGameSetup = true;
      this.ModLoader.serverSide.sendPacketToSpecificPlayer(
        new Ooto_DownloadResponsePacket2(),
        packet.player
      );
    }
  }

  // The server is giving me data.
  @NetworkHandler('Ooto_DownloadResponsePacket')
  onDownloadPacket_client(packet: Ooto_DownloadResponsePacket) {
    this.ModLoader.logger.info('Retrieving savegame from server...');
    let inventory: InventorySave = createInventoryFromContext(
      this.core.save
    ) as InventorySave;
    let equipment: EquipmentSave = createEquipmentFromContext(
      this.core.save
    ) as EquipmentSave;
    let quest: QuestSave = createQuestSaveFromContext(this.core.save);
    mergeInventoryData(inventory, packet.subscreen.inventory);
    mergeEquipmentData(equipment, packet.subscreen.equipment);
    mergeQuestSaveData(quest, packet.subscreen.quest);
    applyInventoryToContext(inventory, this.core.save);
    applyEquipmentToContext(equipment, this.core.save);
    applyQuestSaveToContext(quest, this.core.save);
    this.core.save.permSceneData = packet.flags.scenes;
    this.core.save.eventFlags = packet.flags.events;
    this.core.save.itemFlags = packet.flags.items;
    this.core.save.infTable = packet.flags.inf;
    this.core.save.skulltulaFlags = packet.flags.skulltulas;
    this.first_time_sync = false;
  }

  // I am giving the server data.
  @NetworkHandler('Ooto_DownloadResponsePacket2')
  onDownPacket2_client(packet: Ooto_DownloadResponsePacket2) {
    this.first_time_sync = false;
    this.ModLoader.logger.info('The lobby is mine!');
    this.updateInventory();
    this.updateFlags();
  }

  @ServerNetworkHandler('Ooto_SubscreenSyncPacket')
  onItemSync_server(packet: Ooto_SubscreenSyncPacket) {
    mergeInventoryData(this.storage.inventoryStorage, packet.inventory);
    mergeEquipmentData(this.storage.equipmentStorage, packet.equipment);
    mergeQuestSaveData(this.storage.questStorage, packet.quest);
    this.ModLoader.serverSide.sendPacket(
      new Ooto_SubscreenSyncPacket(
        this.storage.inventoryStorage,
        this.storage.equipmentStorage,
        this.storage.questStorage
      )
    );
  }

  @NetworkHandler('Ooto_SubscreenSyncPacket')
  onItemSync_client(packet: Ooto_SubscreenSyncPacket) {
    if (this.core.helper.isTitleScreen() || !this.core.helper.isSceneNumberValid()){
      return;
    }
    let inventory: InventorySave = createInventoryFromContext(
      this.core.save
    ) as InventorySave;
    let equipment: EquipmentSave = createEquipmentFromContext(
      this.core.save
    ) as EquipmentSave;
    let quest: QuestSave = createQuestSaveFromContext(this.core.save);
    mergeInventoryData(inventory, packet.inventory);
    mergeEquipmentData(equipment, packet.equipment);
    mergeQuestSaveData(quest, packet.quest);
    applyInventoryToContext(inventory, this.core.save);
    applyEquipmentToContext(equipment, this.core.save);
    applyQuestSaveToContext(quest, this.core.save);
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
    Object.keys(packet.scenes).forEach((key: string) => {
      let k = parseInt(key);
      let value = packet.scenes[k];
      if (this.storage.sceneStorage[k] !== value) {
        this.storage.sceneStorage[k] |= value;
      }
    });
    Object.keys(packet.events).forEach((key: string) => {
      let k = parseInt(key);
      let value = packet.events[k];
      if (this.storage.eventStorage[k] !== value) {
        this.storage.eventStorage[k] |= value;
      }
    });
    Object.keys(packet.items).forEach((key: string) => {
      let k = parseInt(key);
      let value = packet.items[k];
      if (this.storage.itemFlagStorage[k] !== value) {
        this.storage.itemFlagStorage[k] |= value;
      }
    });
    Object.keys(packet.inf).forEach((key: string) => {
      let k = parseInt(key);
      let value = packet.inf[k];
      if (this.storage.infStorage[k] !== value) {
        this.storage.infStorage[k] |= value;
      }
    });
    Object.keys(packet.skulltulas).forEach((key: string) => {
      let k = parseInt(key);
      let value = packet.skulltulas[k];
      if (this.storage.skulltulaStorage[k] !== value) {
        this.storage.skulltulaStorage[k] |= value;
      }
    });
    this.ModLoader.serverSide.sendPacket(
      new Ooto_ServerFlagUpdate(
        this.storage.sceneStorage,
        this.storage.eventStorage,
        this.storage.itemFlagStorage,
        this.storage.infStorage,
        this.storage.skulltulaStorage
      )
    );
  }

  @NetworkHandler('Ooto_ServerFlagUpdate')
  onSceneFlagSync_client(packet: Ooto_ServerFlagUpdate) {
    if (this.core.helper.isTitleScreen() || !this.core.helper.isSceneNumberValid()){
      return;
    }
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
    if (this.core.helper.isTitleScreen() || !this.core.helper.isSceneNumberValid()){
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
}

module.exports = OotOnline;
