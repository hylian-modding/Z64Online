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
  Ooto_DownloadResponsePacket,
  Ooto_DownloadResponsePacket2,
  Ooto_SceneGUIPacket,
} from './data/OotOPackets';
import path from 'path';
import { GUITunnelPacket } from 'modloader64_api/GUITunnel';
import fs from 'fs';
import { OotOnlineStorage } from './OotOnlineStorage';
import { OotOnlineStorageClient } from './OotOnlineStorageClient';
import { ModelManager } from './data/models/ModelManager';
import { Command } from 'modloader64_api/OOT/ICommandBuffer';
import { DiscordStatus } from 'modloader64_api/Discord';
import { ModelPlayer } from './data/models/ModelPlayer';

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

  constructor() {}

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

  init(): void {}

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
    this.clientStorage.scene_keys = JSON.parse(
      fs.readFileSync(__dirname + '/data/scene_numbers.json').toString()
    );
    this.clientStorage.localization = JSON.parse(
      fs.readFileSync(__dirname + '/data/en_US.json').toString()
    );
    let status: DiscordStatus = new DiscordStatus(
      'Playing OotOnline',
      'On the title screen'
    );
    status.smallImageKey = 'ooto';
    status.partyId = this.ModLoader.clientLobby;
    status.partyMax = 30;
    status.partySize = 1;
    this.ModLoader.gui.setDiscordStatus(status);
  }

  @EventHandler(OotOnlineEvents.GHOST_MODE)
  onGhostInstruction(evt: any) {
    this.LobbyConfig.actor_syncing = false;
    this.LobbyConfig.data_syncing = false;
  }

  updateInventory() {
    this.ModLoader.logger.info('updateInventory()');
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
    this.ModLoader.clientSide.sendPacket(
      new Ooto_SubscreenSyncPacket(
        this.clientStorage.inventoryStorage,
        this.clientStorage.equipmentStorage,
        this.clientStorage.questStorage,
        this.clientStorage.dungeonItemStorage,
        this.ModLoader.clientLobby
      )
    );
    this.clientStorage.needs_update = false;
  }

  updateFlags() {
    this.ModLoader.utils.clearBuffer(this.clientStorage.sceneStorage);
    this.ModLoader.utils.clearBuffer(this.clientStorage.eventStorage);
    this.ModLoader.utils.clearBuffer(this.clientStorage.itemFlagStorage);
    this.ModLoader.utils.clearBuffer(this.clientStorage.infStorage);
    this.ModLoader.utils.clearBuffer(this.clientStorage.skulltulaStorage);

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

  autosaveSceneData() {
    if (
      !this.core.helper.isLinkEnteringLoadingZone() &&
      this.core.global.scene_framecount > 20
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
    let bottles: InventoryItem[] = [
      this.core.save.inventory.bottle_1,
      this.core.save.inventory.bottle_2,
      this.core.save.inventory.bottle_3,
      this.core.save.inventory.bottle_4,
    ];
    for (let i = 0; i < bottles.length; i++) {
      if (bottles[i] !== this.clientStorage.bottleCache[i]) {
        this.clientStorage.bottleCache[i] = bottles[i];
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
      this.updateFlags();
    }
  }

  updateKeys() {
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

  onTick(): void {
    if (
      !this.core.helper.isTitleScreen() &&
      this.core.helper.isSceneNumberValid()
    ) {
      if (!this.core.helper.isPaused()) {
        if (!this.clientStorage.first_time_sync) {
          return;
        }
        this.overlord.onTick();
        if (this.LobbyConfig.actor_syncing) {
          this.actorHooks.onTick();
        }
        this.EquestrianCenter.onTick();
        if (this.LobbyConfig.data_syncing) {
          this.autosaveSceneData();
          this.updateBottles();
          this.updateSkulltulas();
          //this.updateKeys();
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
            this.clientStorage.needs_update = false;
          }
        }
      }
    }
  }

  @EventHandler(OotEvents.ON_SAVE_LOADED)
  onSaveLoaded(evt: any) {
    setTimeout(() => {
      this.ModLoader.clientSide.sendPacket(
        new Ooto_DownloadRequestPacket(this.ModLoader.clientLobby)
      );
      this.ModLoader.gui.tunnel.send(
        'OotOnline:onAgeChange',
        new GUITunnelPacket(
          'OotOnline',
          'OotOnline:onAgeChange',
          this.core.save.age
        )
      );
    }, 1000);
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
    try {
      this.ModLoader.lobbyManager.createLobbyStorage(
        lobby,
        this,
        new OotOnlineStorage()
      );
    } catch (err) {
      this.ModLoader.logger.error(err);
    }
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
    let gui_p: Ooto_SceneGUIPacket = new Ooto_SceneGUIPacket(
      scene,
      this.core.save.age,
      this.ModLoader.clientLobby
    );
    if (this.modelManager.clientStorage.adultIcon.byteLength > 1) {
      gui_p.setAdultIcon(this.modelManager.clientStorage.adultIcon);
    }
    if (this.modelManager.clientStorage.childIcon.byteLength > 1) {
      gui_p.setChildIcon(this.modelManager.clientStorage.childIcon);
    }
    this.ModLoader.gui.tunnel.send(
      'OotOnline:onSceneChanged',
      new GUITunnelPacket('OotOnline', 'OotOnline:onSceneChanged', gui_p)
    );
    if (this.core.helper.isSceneNumberValid()) {
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
        this.clientStorage.localization[
          this.clientStorage.scene_keys[packet.scene]
        ] +
        '.'
    );
    this.overlord.changePuppetScene(packet.player, packet.scene, packet.age);
    bus.emit(
      OotOnlineEvents.CLIENT_REMOTE_PLAYER_CHANGED_SCENES,
      new OotOnline_PlayerScene(packet.player, packet.lobby, packet.scene)
    );
    let gui_p: Ooto_SceneGUIPacket = new Ooto_SceneGUIPacket(
      packet.scene,
      packet.age,
      packet.lobby
    );
    if (
      this.modelManager.clientStorage.playerModelCache.hasOwnProperty(
        packet.player.uuid
      )
    ) {
      if (
        (this.modelManager.clientStorage.playerModelCache[
          packet.player.uuid
        ] as ModelPlayer).customIconAdult.byteLength > 1
      ) {
        gui_p.setAdultIcon(
          (this.modelManager.clientStorage.playerModelCache[
            packet.player.uuid
          ] as ModelPlayer).customIconAdult
        );
      }
      if (
        (this.modelManager.clientStorage.playerModelCache[
          packet.player.uuid
        ] as ModelPlayer).customIconChild.byteLength > 1
      ) {
        gui_p.setChildIcon(
          (this.modelManager.clientStorage.playerModelCache[
            packet.player.uuid
          ] as ModelPlayer).customIconChild
        );
      }
    }
    if (this.modelManager.clientStorage.childIcon.byteLength > 1) {
      gui_p.setChildIcon(this.modelManager.clientStorage.childIcon);
    }
    this.ModLoader.gui.tunnel.send(
      'OotOnline:onSceneChanged_Network',
      new GUITunnelPacket(
        'OotOnline',
        'OotOnline:onSceneChanged_Network',
        gui_p
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
    } catch (err) {}
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
    if (
      this.core.helper.isTitleScreen() ||
      !this.core.helper.isSceneNumberValid()
    ) {
      return;
    }
    this.clientStorage.bottleCache[packet.slot] = packet.contents;
    let inventory: InventorySave = createInventoryFromContext(
      this.core.save
    ) as InventorySave;
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
    mergeInventoryData(this.clientStorage.inventoryStorage, inventory);
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
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
      packet.lobby,
      this
    ) as OotOnlineStorage;
    if (storage.saveGameSetup) {
      // Game is running, get data.
      this.ModLoader.serverSide.sendPacketToSpecificPlayer(
        new Ooto_DownloadResponsePacket(
          new Ooto_SubscreenSyncPacket(
            storage.inventoryStorage,
            storage.equipmentStorage,
            storage.questStorage,
            storage.dungeonItemStorage,
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
    applyDungeonItemDataToContext(
      packet.subscreen.dungeonItems,
      this.core.save.dungeonItemManager
    );
    this.core.save.permSceneData = packet.flags.scenes;
    this.core.save.eventFlags = packet.flags.events;
    this.core.save.itemFlags = packet.flags.items;
    this.core.save.infTable = packet.flags.inf;
    this.core.save.skulltulaFlags = packet.flags.skulltulas;
    this.clientStorage.first_time_sync = true;
  }

  // I am giving the server data.
  @NetworkHandler('Ooto_DownloadResponsePacket2')
  onDownPacket2_client(packet: Ooto_DownloadResponsePacket2) {
    this.clientStorage.first_time_sync = true;
    this.ModLoader.logger.info('The lobby is mine!');
    this.clientStorage.needs_update = true;
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
      this.core.helper.isTitleScreen() ||
      !this.core.helper.isSceneNumberValid()
    ) {
      return;
    }
    let inventory: InventorySave = createInventoryFromContext(
      this.core.save
    ) as InventorySave;
    let equipment: EquipmentSave = createEquipmentFromContext(
      this.core.save
    ) as EquipmentSave;
    let quest: QuestSave = createQuestSaveFromContext(this.core.save);
    let dungeonItems: OotoDungeonItemContext = createDungeonItemDataFromContext(
      this.core.save.dungeonItemManager
    ) as IDungeonItemSave;

    mergeInventoryData(this.clientStorage.inventoryStorage, inventory);
    mergeEquipmentData(this.clientStorage.equipmentStorage, equipment);
    mergeQuestSaveData(this.clientStorage.questStorage, quest);
    mergeDungeonItemData(this.clientStorage.dungeonItemStorage, dungeonItems);

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

    this.ModLoader.gui.tunnel.send(
      'OotOnline:onSubscreenPacket',
      new GUITunnelPacket('OotOnline', 'OotOnline:onSubscreenPacket', packet)
    );
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

    let scene_arr: any = this.parseFlagChanges(
      scenes,
      this.clientStorage.sceneStorage
    );
    let event_arr: any = this.parseFlagChanges(
      events,
      this.clientStorage.eventStorage
    );
    let items_arr: any = this.parseFlagChanges(
      items,
      this.clientStorage.itemFlagStorage
    );
    let inf_arr: any = this.parseFlagChanges(
      inf,
      this.clientStorage.infStorage
    );
    let skulltulas_arr: any = this.parseFlagChanges(
      skulltulas,
      this.clientStorage.skulltulaStorage
    );

    scene_arr = this.parseFlagChanges(
      incoming_scenes,
      this.clientStorage.sceneStorage
    );
    event_arr = this.parseFlagChanges(
      incoming_events,
      this.clientStorage.eventStorage
    );
    items_arr = this.parseFlagChanges(
      incoming_items,
      this.clientStorage.itemFlagStorage
    );
    inf_arr = this.parseFlagChanges(
      incoming_inf,
      this.clientStorage.infStorage
    );
    skulltulas_arr = this.parseFlagChanges(
      incoming_skulltulas,
      this.clientStorage.skulltulaStorage
    );

    if (Object.keys(scene_arr).length > 0) {
      this.core.save.permSceneData = this.clientStorage.sceneStorage;
    }
    if (Object.keys(event_arr).length > 0) {
      this.core.save.eventFlags = this.clientStorage.eventStorage;
    }
    if (Object.keys(items_arr).length > 0) {
      this.core.save.itemFlags = this.clientStorage.itemFlagStorage;
    }
    if (Object.keys(inf_arr).length > 0) {
      this.core.save.infTable = this.clientStorage.infStorage;
    }
    if (Object.keys(skulltulas_arr).length > 0) {
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
      this.core.helper.isTitleScreen() ||
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
    this.overlord.localPlayerLoadingZone();
    this.ModLoader.gui.tunnel.send(
      'OotOnline:onAgeChange',
      new GUITunnelPacket('OotOnline', 'OotOnline:onAgeChange', age)
    );
  }

  @EventHandler(OotOnlineEvents.ON_INVENTORY_UPDATE)
  onInventoryUpdate(inventory: IInventory) {
    if (
      this.core.helper.isTitleScreen() ||
      !this.core.helper.isSceneNumberValid()
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
    if (
      buf[0x4] !== InventoryItem.NONE &&
      raw_inventory[buf[0x4]] !== InventoryItem.NONE
    ) {
      buf[0x1] = raw_inventory[buf[0x4]];
      this.ModLoader.emulator.rdramWriteBuffer(addr, buf);
      this.core.commandBuffer.runCommand(
        Command.UPDATE_C_BUTTON_ICON,
        0x00000001,
        (success: boolean, result: number) => {}
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
        (success: boolean, result: number) => {}
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
        (success: boolean, result: number) => {}
      );
    }
  }
}

module.exports = OotOnline;
