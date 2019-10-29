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
  IInventory,
  Age,
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
} from './data/OotoSaveData';
import { PuppetOverlord } from './data/linkPuppet/PuppetOverlord';
import {
  Ooto_ClientFlagUpdate,
  Ooto_ClientSceneContextUpdate,
  Ooto_DownloadRequestPacket,
  Ooto_PuppetPacket,
  Ooto_ScenePacket,
  Ooto_SceneRequestPacket,
  Ooto_ServerFlagUpdate,
  Ooto_SubscreenSyncPacket,
  Ooto_BottleUpdatePacket,
  Ooto_KeyPacket,
  Ooto_AllKeysPacket,
  Ooto_DownloadServerContextPacket,
} from './data/OotOPackets';
import path from 'path';
import { GUITunnelPacket } from 'modloader64_api/GUITunnel';
import fs from 'fs';
import { OotOnlineStorage } from './OotOnlineStorage';
import { OotOnlineStorageClient } from './OotOnlineStorageClient';
import { ModelManager } from './data/models/ModelManager';
import { Command } from 'modloader64_api/OOT/ICommandBuffer';

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
  modelManager!: ModelManager;
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

  debuggingMagic() {
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
    this.modelManager = new ModelManager(
      this.ModLoader,
      this.clientStorage,
      this
    );
    setupEventHandlers(this.actorHooks);
    setupNetworkHandlers(this.actorHooks);

    setupEventHandlers(this.EquestrianCenter);
    setupNetworkHandlers(this.EquestrianCenter);

    setupEventHandlers(this.modelManager);
    setupNetworkHandlers(this.modelManager);
  }

  init(): void { }

  postinit(): void {
    //this.ModLoader.emulator.memoryDebugLogger(true);
    this.overlord.postinit(
      this.core,
      this.ModLoader.emulator,
      this.ModLoader.me,
      this.ModLoader
    );
    this.actorHooks.onPostInit();
    this.modelManager.onPostInit();
    this.ModLoader.gui.openWindow(
      698,
      795,
      path.resolve(path.join(__dirname, 'gui', 'map.html'))
    );
  }

  @EventHandler(OotOnlineEvents.GHOST_MODE)
  onGhostInstruction(evt: any) {
    this.LobbyConfig.actor_syncing = false;
    this.LobbyConfig.data_syncing = false;
  }

  updateInventory() {
    if (
      (this.core.helper.isTitleScreen() || !this.core.helper.isSceneNumberValid()) && this.core.helper.isInterfaceShown()) {
      return;
    }
    if (!this.clientStorage.first_time_sync) {
      if (
        !this.clientStorage.needs_update &&
        this.core.link.state === LinkState.BUSY
      ) {
        this.clientStorage.needs_update = true;
      } else if (
        this.clientStorage.needs_update &&
        this.core.link.state === LinkState.STANDING
      ) {
        this.ModLoader.logger.info('updateInventory()');
        this.ModLoader.clientSide.sendPacket(
          new Ooto_SubscreenSyncPacket(
            createInventoryFromContext(this.core.save),
            createEquipmentFromContext(this.core.save),
            createQuestSaveFromContext(this.core.save),
            createDungeonItemDataFromContext(this.core.save.dungeonItemManager),
            this.ModLoader.clientLobby
          )
        );
        this.clientStorage.needs_update = false;
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

      let scenes: any = this.parseFlagChanges(
        scene_data,
        this.clientStorage.sceneStorage
      );
      let events: any = this.parseFlagChanges(
        event_data,
        this.clientStorage.eventStorage
      );
      let items: any = this.parseFlagChanges(
        item_data,
        this.clientStorage.itemFlagStorage
      );
      let inf: any = this.parseFlagChanges(
        inf_data,
        this.clientStorage.infStorage
      );
      let skulltulas: any = this.parseFlagChanges(
        skulltula_data,
        this.clientStorage.skulltulaStorage
      );

      if (
        Object.keys(scenes).length > 0 ||
        Object.keys(events).length > 0 ||
        Object.keys(items).length > 0 ||
        Object.keys(inf).length > 0 ||
        Object.keys(skulltulas).length > 0
      ) {
        this.ModLoader.logger.info('updateFlags()');
        this.ModLoader.clientSide.sendPacket(
          new Ooto_ClientFlagUpdate(
            scenes,
            events,
            items,
            inf,
            skulltulas,
            this.ModLoader.clientLobby
          )
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
      let live_scene_collect: Buffer = this.core.global
        .liveSceneData_collectable;
      let live_scene_clear: Buffer = this.core.global.liveSceneData_clear;
      let live_scene_temp: Buffer = this.core.global.liveSceneData_temp;
      let save_scene_data: Buffer = this.core.global.getSaveDataForCurrentScene();

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
      } else {
        return;
      }

      this.core.global.writeSaveDataForCurrentScene(save_scene_data);

      this.ModLoader.clientSide.sendPacket(
        new Ooto_ClientSceneContextUpdate(
          live_scene_chests,
          live_scene_switches,
          live_scene_collect,
          live_scene_clear,
          live_scene_temp,
          this.ModLoader.clientLobby
        )
      );
    }
  }

  updateBottles() {
    if (this.clientStorage.first_time_sync) {
      return;
    }
    let bottles: InventoryItem[] = [
      this.core.save.inventory.bottle_1,
      this.core.save.inventory.bottle_2,
      this.core.save.inventory.bottle_3,
      this.core.save.inventory.bottle_4,
    ];
    for (let i = 0; i < bottles.length; i++) {
      if (bottles[i] !== this.clientStorage.bottleCache[i]) {
        this.clientStorage.bottleCache = bottles;
        this.ModLoader.logger.info('Bottle update.');
        this.ModLoader.clientSide.sendPacket(
          new Ooto_BottleUpdatePacket(i, bottles[i], this.ModLoader.clientLobby)
        );
      }
    }
  }

  updateSkulltulas() {
    if (
      this.clientStorage.lastKnownSkullCount <
      this.core.save.questStatus.goldSkulltulas
    ) {
      this.clientStorage.needs_update = true;
      this.clientStorage.lastKnownSkullCount = this.core.save.questStatus.goldSkulltulas;
      this.ModLoader.logger.info('Skulltula update.');
    }
  }

  updateKeys() {
    if (this.clientStorage.keys_need_update) {
      for (let i = 0; i < this.clientStorage.keyCache.length; i++) {
        let ks = this.clientStorage.keyCache[i];
        this.core.save.keyManager.setKeyCountByIndex(ks.index, ks.count);
      }
      this.clientStorage.keys_need_update = false;
      return;
    }
    for (let i = 0; i < this.clientStorage.keyCache.length; i++) {
      let current: number = this.core.save.keyManager.getKeyCountForIndex(
        this.clientStorage.keyCache[i].index
      );
      let last: number = this.clientStorage.keyCache[i].count;
      if (current !== last) {
        this.clientStorage.keyCache[i].count = current;
        this.ModLoader.clientSide.sendPacket(
          new Ooto_KeyPacket(
            this.clientStorage.keyCache[i],
            this.ModLoader.clientLobby
          )
        );
      }
    }
  }

  overwrite_everything() {
    applyInventoryToContext(
      this.clientStorage.inventoryStorage,
      this.core.save,
      true
    );
    applyEquipmentToContext(
      this.clientStorage.equipmentStorage,
      this.core.save
    );
    applyQuestSaveToContext(this.clientStorage.questStorage, this.core.save);
    applyDungeonItemDataToContext(
      this.clientStorage.dungeonItemStorage,
      this.core.save.dungeonItemManager
    );

    this.core.save.permSceneData = this.clientStorage.sceneStorage;
    this.core.save.eventFlags = this.clientStorage.eventStorage;
    this.core.save.itemFlags = this.clientStorage.itemFlagStorage;
    this.core.save.infTable = this.clientStorage.infStorage;
    this.core.save.skulltulaFlags = this.clientStorage.skulltulaStorage;
    for (let i = 0; i < this.clientStorage.keyCache.length; i++) {
      this.core.save.keyManager.setKeyCountByIndex(
        this.clientStorage.keyCache[i].index,
        this.clientStorage.keyCache[i].count
      );
    }
    this.clientStorage.first_time_sync = false;
    this.clientStorage.keys_need_update = true;
  }

  onTick(): void {
    if (this.clientStorage.force_overwrite) {
      this.overwrite_everything();
    }
    if (!this.core.helper.isTitleScreen() || this.core.helper.isSceneNumberValid()) {
      if (!this.core.helper.isPaused()) {
        this.clientStorage.force_overwrite = false;
        this.overlord.onTick();
        if (this.LobbyConfig.actor_syncing) {
          this.actorHooks.onTick();
        }
        this.EquestrianCenter.onTick();
        if (this.LobbyConfig.data_syncing) {
          this.autosaveSceneData();
          this.updateBottles();
          this.updateSkulltulas();
          this.updateKeys();
        }
      }
      let state = this.core.link.state;
      if (
        state === LinkState.BUSY ||
        state === LinkState.GETTING_ITEM ||
        state === LinkState.TALKING
      ) {
        this.clientStorage.needs_update = true;
      } else if (
        state === LinkState.STANDING &&
        this.clientStorage.needs_update &&
        this.LobbyConfig.data_syncing
      ) {
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
    this.ModLoader.clientSide.sendPacket(
      new Ooto_DownloadRequestPacket(this.ModLoader.clientLobby)
    );
  }

  //------------------------------
  // Deal with player connections.
  //------------------------------

  @EventHandler(EventsServer.ON_LOBBY_CREATE)
  onLobbyCreated(lobby: string) {
    this.ModLoader.lobbyManager.createLobbyStorage(
      lobby,
      this,
      new OotOnlineStorage()
    );
  }

  @EventHandler(EventsClient.ON_PLAYER_JOIN)
  onPlayerJoin(player: INetworkPlayer) {
    this.overlord.registerPuppet(player);
  }

  @EventHandler(EventsClient.ON_PLAYER_LEAVE)
  onPlayerLeft(player: INetworkPlayer) {
    this.overlord.unregisterPuppet(player);
    this.ModLoader.gui.tunnel.send(
      'OotOnline:onPlayerLeft',
      new GUITunnelPacket('OotOnline', 'OotOnline:onPlayerLeft', player)
    );
  }

  @EventHandler(EventsServer.ON_LOBBY_JOIN)
  onPlayerJoin_server(evt: EventServerJoined) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
      evt.lobby,
      this
    ) as OotOnlineStorage;
    storage.players[evt.player.uuid] = -1;
    storage.networkPlayerInstances[evt.player.uuid] = evt.player;
  }

  @EventHandler(EventsServer.ON_LOBBY_LEAVE)
  onPlayerLeft_server(evt: EventServerLeft) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
      evt.lobby,
      this
    ) as OotOnlineStorage;
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
      new Ooto_ScenePacket(
        this.ModLoader.clientLobby,
        scene,
        this.core.save.age
      )
    );
    this.ModLoader.logger.info('client: I moved to scene ' + scene + '.');
    this.ModLoader.gui.tunnel.send(
      'OotOnline:onSceneChanged',
      new GUITunnelPacket('OotOnline', 'OotOnline:onSceneChanged', scene)
    );
  }

  @EventHandler(OotEvents.ON_ROOM_CHANGE)
  onRoomChange(room: number) {
    this.ModLoader.gui.tunnel.send(
      'OotOnline:onRoomChanged',
      new GUITunnelPacket('OotOnline', 'OotOnline:onRoomChanged', room)
    );
  }

  @ServerNetworkHandler('Ooto_ScenePacket')
  onSceneChange_server(packet: Ooto_ScenePacket) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
      packet.lobby,
      this
    ) as OotOnlineStorage;
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
    this.ModLoader.gui.tunnel.send(
      'OotOnline:onSceneChanged_Network',
      new GUITunnelPacket(
        'OotOnline',
        'OotOnline:onSceneChanged_Network',
        packet
      )
    );
  }

  // This packet is basically 'where the hell are you?' if a player has a puppet on file but doesn't know what scene its suppose to be in.
  @NetworkHandler('Ooto_SceneRequestPacket')
  onSceneRequest_client(packet: Ooto_SceneRequestPacket) {
    if (this.core.save !== undefined) {
      this.ModLoader.clientSide.sendPacketToSpecificPlayer(
        new Ooto_ScenePacket(
          this.ModLoader.clientLobby,
          this.core.global.scene,
          this.core.save.age
        ),
        packet.player
      );
    }
  }

  //------------------------------
  // Puppet handling
  //------------------------------

  sendPacketToPlayersInScene(packet: IPacketHeader) {
    try {
      let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
        packet.lobby,
        this
      ) as OotOnlineStorage;
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

  @ServerNetworkHandler('Ooto_PuppetPacket')
  onPuppetData_server(packet: Ooto_PuppetPacket) {
    this.sendPacketToPlayersInScene(packet);
  }

  @NetworkHandler('Ooto_PuppetPacket')
  onPuppetData_client(packet: Ooto_PuppetPacket) {
    if (
      this.core.helper.isTitleScreen() ||
      this.core.helper.isPaused() ||
      this.core.helper.isLinkEnteringLoadingZone()
    ) {
      return;
    }
    this.overlord.processPuppetPacket(packet);
  }

  //------------------------------
  // Subscreen Syncing
  //------------------------------

  @ServerNetworkHandler('Ooto_KeyPacket')
  onKey_server(packet: Ooto_KeyPacket) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
      packet.lobby,
      this
    ) as OotOnlineStorage;
    storage.keyCache[packet.key.index].count = packet.key.count;
  }

  @NetworkHandler('Ooto_KeyPacket')
  onKey_client(packet: Ooto_KeyPacket) {
    this.clientStorage.keyCache[packet.key.index].count = packet.key.count;
    this.clientStorage.keys_need_update = true;
  }

  @ServerNetworkHandler('Ooto_BottleUpdatePacket')
  onBottle_server(packet: Ooto_BottleUpdatePacket) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
      packet.lobby,
      this
    ) as OotOnlineStorage;
    switch (packet.slot) {
      case 0:
        storage.inventoryStorage.bottle_1 = packet.contents;
        break;
      case 1:
        storage.inventoryStorage.bottle_2 = packet.contents;
        break;
      case 2:
        storage.inventoryStorage.bottle_3 = packet.contents;
        break;
      case 3:
        storage.inventoryStorage.bottle_4 = packet.contents;
        break;
    }
  }

  @NetworkHandler('Ooto_BottleUpdatePacket')
  onBottle_client(packet: Ooto_BottleUpdatePacket) {
    this.clientStorage.bottleCache[packet.slot] = packet.contents;
    let inventory2: InventorySave = createInventoryFromContext(
      this.core.save
    ) as InventorySave;
    switch (packet.slot) {
      case 0:
        inventory2.bottle_1 = packet.contents;
        break;
      case 1:
        inventory2.bottle_2 = packet.contents;
        break;
      case 2:
        inventory2.bottle_3 = packet.contents;
        break;
      case 3:
        inventory2.bottle_4 = packet.contents;
        break;
    }
    mergeInventoryData(this.clientStorage.inventoryStorage, inventory2);
    applyInventoryToContext(
      this.clientStorage.inventoryStorage,
      this.core.save,
      true
    );
    bus.emit(OotOnlineEvents.ON_INVENTORY_UPDATE, this.core.save.inventory);
  }

  // Client is logging in and wants to know how to proceed.
  @ServerNetworkHandler('Ooto_DownloadRequestPacket')
  onDownloadPacket_server(packet: Ooto_DownloadRequestPacket) {
    this.ModLoader.logger.info('Sending savegame from server...');
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
      packet.lobby,
      this
    ) as OotOnlineStorage;
    // Game is running, get data.
    this.ModLoader.serverSide.sendPacketToSpecificPlayer(
      new Ooto_DownloadServerContextPacket(
        packet.lobby,
        storage,
        storage.saveGameSetup
      ),
      packet.player
    );
    storage.saveGameSetup = true;
  }

  // The server is giving me data.
  @NetworkHandler('Ooto_DownloadServerContextPacket')
  onDownloadPacket_client(packet: Ooto_DownloadServerContextPacket) {
    console.log(packet);
    this.ModLoader.logger.info('Retrieving savegame from server...');
    if (packet.overwrite) {
      Object.keys(this.clientStorage).forEach((key: string) => {
        if (packet.storage.hasOwnProperty(key)) {
          (this.clientStorage as any)[key] = (packet.storage as any)[key];
        }
      });
      this.clientStorage.bottleCache[0] = this.clientStorage.inventoryStorage.bottle_1;
      this.clientStorage.bottleCache[1] = this.clientStorage.inventoryStorage.bottle_2;
      this.clientStorage.bottleCache[2] = this.clientStorage.inventoryStorage.bottle_3;
      this.clientStorage.bottleCache[3] = this.clientStorage.inventoryStorage.bottle_4;
      this.clientStorage.force_overwrite = true;
    } else {
      this.clientStorage.first_time_sync = false;
    }
  }

  @ServerNetworkHandler('Ooto_SubscreenSyncPacket')
  onItemSync_server(packet: Ooto_SubscreenSyncPacket) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
      packet.lobby,
      this
    ) as OotOnlineStorage;
    mergeInventoryData(storage.inventoryStorage, packet.inventory);
    mergeEquipmentData(storage.equipmentStorage, packet.equipment);
    mergeQuestSaveData(storage.questStorage, packet.quest);
    mergeDungeonItemData(storage.dungeonItemStorage, packet.dungeonItems);
    this.ModLoader.serverSide.sendPacket(
      new Ooto_SubscreenSyncPacket(
        storage.inventoryStorage,
        storage.equipmentStorage,
        storage.questStorage,
        storage.dungeonItemStorage,
        packet.lobby
      )
    );
  }

  @NetworkHandler('Ooto_SubscreenSyncPacket')
  onItemSync_client(packet: Ooto_SubscreenSyncPacket) {
    if (
      (this.core.helper.isTitleScreen() || !this.core.helper.isSceneNumberValid()) &&
      this.core.helper.isInterfaceShown()
    ) {
      return;
    }
    let inventory = createInventoryFromContext(this.core.save);
    let equipment = createEquipmentFromContext(this.core.save);
    let quest = createQuestSaveFromContext(this.core.save);
    let di = createDungeonItemDataFromContext(
      this.core.save.dungeonItemManager
    );
    mergeInventoryData(this.clientStorage.inventoryStorage, inventory);
    mergeEquipmentData(this.clientStorage.equipmentStorage, equipment);
    mergeQuestSaveData(this.clientStorage.questStorage, quest);
    mergeDungeonItemData(this.clientStorage.dungeonItemStorage, di);

    mergeInventoryData(this.clientStorage.inventoryStorage, packet.inventory);
    mergeEquipmentData(this.clientStorage.equipmentStorage, packet.equipment);
    mergeQuestSaveData(this.clientStorage.questStorage, packet.quest);
    mergeDungeonItemData(
      this.clientStorage.dungeonItemStorage,
      packet.dungeonItems
    );
    applyInventoryToContext(
      this.clientStorage.inventoryStorage,
      this.core.save
    );
    applyEquipmentToContext(
      this.clientStorage.equipmentStorage,
      this.core.save
    );
    applyQuestSaveToContext(this.clientStorage.questStorage, this.core.save);
    applyDungeonItemDataToContext(
      this.clientStorage.dungeonItemStorage,
      this.core.save.dungeonItemManager
    );
    bus.emit(OotOnlineEvents.ON_INVENTORY_UPDATE, this.core.save.inventory);
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
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
      packet.lobby,
      this
    ) as OotOnlineStorage;
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
    if (
      this.core.helper.isTitleScreen() &&
      !this.core.helper.isSceneNumberValid()
    ) {
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
    let skulltulas_arr: any = this.parseFlagChanges(
      incoming_skulltulas,
      skulltulas
    );

    if (Object.keys(scene_arr).length > 0) {
      this.clientStorage.sceneStorage = scenes;
      this.core.save.permSceneData = this.clientStorage.sceneStorage;
    }
    if (Object.keys(event_arr).length > 0) {
      this.clientStorage.eventStorage = events;
      this.core.save.eventFlags = this.clientStorage.eventStorage;
    }
    if (Object.keys(items_arr).length > 0) {
      this.clientStorage.itemFlagStorage = items;
      this.core.save.itemFlags = this.clientStorage.itemFlagStorage;
    }
    if (Object.keys(inf_arr).length > 0) {
      this.clientStorage.infStorage = inf;
      this.clientStorage.infStorage = inf;
    }
    if (Object.keys(skulltulas_arr).length > 0) {
      this.clientStorage.skulltulaStorage = skulltulas;
      this.core.save.skulltulaFlags = this.clientStorage.skulltulaStorage;
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
    if (
      this.core.helper.isTitleScreen() ||
      !this.core.helper.isSceneNumberValid()
    ) {
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
    if (
      this.core.helper.isTitleScreen() &&
      !this.core.helper.isSceneNumberValid()
    ) {
      return;
    }
    this.ModLoader.emulator.rdramWrite16(
      global.ModLoader.save_context + 0x1424,
      0x65
    );
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
    switch (size) {
      case Magic.NONE:
        this.core.save.magic_current = MagicQuantities.NONE;
        break;
      case Magic.NORMAL:
        this.core.save.magic_current = MagicQuantities.NORMAL;
        break;
      case Magic.EXTENDED:
        this.core.save.magic_current = MagicQuantities.EXTENDED;
        break;
    }
  }

  @EventHandler(OotEvents.ON_AGE_CHANGE)
  onAgeChange(age: Age) {
    if (
      this.core.helper.isTitleScreen() &&
      !this.core.helper.isSceneNumberValid()
    ) {
      return;
    }
    this.overlord.localPlayerLoadingZone();
  }

  @EventHandler(OotOnlineEvents.ON_INVENTORY_UPDATE)
  onInventoryUpdate(inventory: IInventory) {
    let addr: number = global.ModLoader.save_context + 0x0068;
    let buf: Buffer = this.ModLoader.emulator.rdramReadBuffer(addr, 0x7);
    let addr2: number = global.ModLoader.save_context + 0x0074;
    let raw_inventory: Buffer = this.ModLoader.emulator.rdramReadBuffer(
      addr2,
      0x24
    );
    if (
      buf[0x4] !== InventoryItem.NONE &&
      raw_inventory[buf[0x4]] !== InventoryItem.NONE
    ) {
      buf[0x1] = raw_inventory[buf[0x4]];
      this.ModLoader.emulator.rdramWriteBuffer(addr, buf);
      this.core.commandBuffer.runCommand(
        Command.UPDATE_C_BUTTON_ICON,
        0x00000001,
        (success: boolean, result: number) => { }
      );
    }
    if (
      buf[0x5] !== InventoryItem.NONE &&
      raw_inventory[buf[0x5]] !== InventoryItem.NONE
    ) {
      buf[0x2] = raw_inventory[buf[0x5]];
      this.ModLoader.emulator.rdramWriteBuffer(addr, buf);
      this.core.commandBuffer.runCommand(
        Command.UPDATE_C_BUTTON_ICON,
        0x00000002,
        (success: boolean, result: number) => { }
      );
    }
    if (
      buf[0x6] !== InventoryItem.NONE &&
      raw_inventory[buf[0x6]] !== InventoryItem.NONE
    ) {
      buf[0x3] = raw_inventory[buf[0x6]];
      this.ModLoader.emulator.rdramWriteBuffer(addr, buf);
      this.core.commandBuffer.runCommand(
        Command.UPDATE_C_BUTTON_ICON,
        0x00000003,
        (success: boolean, result: number) => { }
      );
    }
  }
}

module.exports = OotOnline;
