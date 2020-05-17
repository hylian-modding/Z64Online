import { InjectCore } from 'modloader64_api/CoreInjection';
import {
  bus,
  EventHandler,
  EventsClient,
  EventServerJoined,
  EventServerLeft,
  EventsServer,
} from 'modloader64_api/EventHandler';
import * as ModLoader from 'modloader64_api/IModLoaderAPI';
import {
  INetworkPlayer,
  IPacketHeader,
  LobbyData,
  NetworkHandler,
  ServerNetworkHandler,
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
  IOvlPayloadResult,
  Sword,
  Shield,
  Boots,
  Tunic,
} from 'modloader64_api/OOT/OOTAPI';
import {
  IOotOnlineHelpers,
  OotOnlineEvents,
  OotOnline_PlayerScene,
} from './OotoAPI/OotoAPI';
import { ActorHookingManager } from './data/ActorHookingSystem';
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
  OotO_SceneStruct,
} from './data/OotoSaveData';
import { PuppetOverlord } from './data/linkPuppet/PuppetOverlord';
import {
  Ooto_ClientFlagUpdate,
  Ooto_ClientSceneContextUpdate,
  Ooto_DownloadRequestPacket,
  Ooto_ScenePacket,
  Ooto_SceneRequestPacket,
  Ooto_ServerFlagUpdate,
  Ooto_SubscreenSyncPacket,
  Ooto_BottleUpdatePacket,
  Ooto_DownloadResponsePacket,
  Ooto_DownloadResponsePacket2,
  Ooto_SceneGUIPacket,
  Ooto_BankSyncPacket,
  OotO_isRandoPacket,
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
import { Ooto_KeyRebuildPacket, KeyLogManager } from './data/keys/KeyLogManager';
import { EmoteManager } from './data/emotes/emoteManager';
import { UtilityActorHelper } from './data/utilityActorHelper';
import { CrashParserActorTable } from './data/crash/CrashParser';
import { Z64RomTools } from 'Z64Lib/API/Z64RomTools';
import { IActor } from 'modloader64_api/OOT/IActor';

export const SCENE_ARR_SIZE = 0xb0c;
export const EVENT_ARR_SIZE = 0x1c;
export const ITEM_FLAG_ARR_SIZE = 0x8;
export const INF_ARR_SIZE = 0x3c;
export const SKULLTULA_ARR_SIZE = 0x18;

let GHOST_MODE_TRIGGERED: boolean = false;

export interface IOotOnlineLobbyConfig {
  data_syncing: boolean;
  actor_syncing: boolean;
  key_syncing: boolean;
}

class OotOnlineConfigCategory {
  mapTracker: boolean = false;
}

class OotOnline implements ModLoader.IPlugin, IOotOnlineHelpers, ModLoader.IPluginServerConfig {

  ModLoader!: ModLoader.IModLoaderAPI;
  pluginName?: string | undefined;
  @InjectCore()
  core!: IOOTCore;
  LobbyConfig: IOotOnlineLobbyConfig = {} as IOotOnlineLobbyConfig;

  // Client variables
  overlord: PuppetOverlord;
  actorHooks: ActorHookingManager;
  modelManager: ModelManager;
  keys: KeyLogManager;
  emotes: EmoteManager;
  utility: UtilityActorHelper;
  // Storage
  clientStorage: OotOnlineStorageClient = new OotOnlineStorageClient();
  offset: number = -1;
  config!: OotOnlineConfigCategory;

  constructor() {
    this.overlord = new PuppetOverlord(this);
    this.actorHooks = new ActorHookingManager(this);
    this.modelManager = new ModelManager(this.clientStorage, this);
    this.keys = new KeyLogManager(this);
    this.emotes = new EmoteManager();
    this.utility = new UtilityActorHelper();
  }

  preinit(): void {
    this.config = this.ModLoader.config.registerConfigCategory("OotOnline") as OotOnlineConfigCategory;
    this.ModLoader.config.setData("OotOnline", "mapTracker", false);
  }

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

  init(): void {
    bus.emit("CatBinding:CompileActor", { file: path.join(__dirname, "/c/link_no_pvp.c"), dest: path.join(__dirname, "/payloads/E0/link_puppet.ovl"), meta: path.join(__dirname, "/payloads/E0/link_puppet.json") });
    bus.emit("CatBinding:CompileActor", { file: path.join(__dirname, "/c/horse-3.c"), dest: path.join(__dirname, "/payloads/E0/epona_puppet.ovl"), meta: path.join(__dirname, "/payloads/E0/epona_puppet.json") });
    bus.emit("CatBinding:CompileActor", { file: path.join(__dirname, "/c/bank.c"), dest: path.join(__dirname, "/payloads/E0/bank_actor.ovl"), meta: path.join(__dirname, "/payloads/E0/bank_actor.json") });
    //bus.emit("CatBinding:CompileActor", { file: path.join(__dirname, "/c/Magic_Dark_Puppet.c"), dest: path.join(__dirname, "/payloads/E0/nayru_puppet.ovl"), meta: path.join(__dirname, "/payloads/E0/nayru_puppet.json") });
  }

  postinit(): void {
    if (this.config.mapTracker) {
      this.ModLoader.gui.openWindow(
        698,
        795,
        path.resolve(path.join(__dirname, 'gui', 'map.html'))
      );
    }
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
    //bus.emit("CatBinding:SetDir", path.resolve(global.ModLoader["startdir"], "src", "OotOnline", "c"));
  }

  @EventHandler(OotOnlineEvents.GHOST_MODE)
  onGhostInstruction(evt: any) {
    this.LobbyConfig.actor_syncing = false;
    this.LobbyConfig.data_syncing = false;
    this.clientStorage.first_time_sync = true;
    this.LobbyConfig.key_syncing = false;
    GHOST_MODE_TRIGGERED = true;
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
    if (this.utility.lastKnownBalance !== this.ModLoader.emulator.rdramRead16(0x8011B874)) {
      this.utility.lastKnownBalance = this.ModLoader.emulator.rdramRead16(0x8011B874);
      this.ModLoader.clientSide.sendPacket(new Ooto_BankSyncPacket(this.utility.lastKnownBalance, this.ModLoader.clientLobby));
    }
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
        this.clientStorage.sceneStorage,
        this.clientStorage.eventStorage,
        this.clientStorage.itemFlagStorage,
        this.clientStorage.infStorage,
        this.clientStorage.skulltulaStorage,
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
      let live_scene_collect: Buffer = this.core.global.liveSceneData_collectable;
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
          this.ModLoader.clientLobby,
          this.core.global.scene
        )
      );
    }
  }

  updateBottles(onlyfillCache = false) {
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
        if (!onlyfillCache) {
          this.ModLoader.clientSide.sendPacket(
            new Ooto_BottleUpdatePacket(i, bottles[i], this.ModLoader.clientLobby)
          );
        }
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

  onTick(frame: number): void {
    if (
      !this.core.helper.isTitleScreen() &&
      this.core.helper.isSceneNumberValid() &&
      this.core.helper.isInterfaceShown()
    ) {
      if (!this.core.helper.isPaused()) {
        if (!this.clientStorage.first_time_sync) {
          return;
        }
        if (this.LobbyConfig.actor_syncing) {
          this.actorHooks.tick();
        }
        if (this.LobbyConfig.data_syncing) {
          this.autosaveSceneData();
          this.updateBottles();
          this.updateSkulltulas();
          if (this.LobbyConfig.key_syncing) {
            this.keys.update();
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
            this.clientStorage.needs_update = false;
          }
        }
      }
    }
  }

  @EventHandler(OotEvents.ON_SAVE_LOADED)
  onSaveLoaded(evt: any) {
    setTimeout(() => {
      if (this.LobbyConfig.data_syncing) {
        this.ModLoader.clientSide.sendPacket(
          new Ooto_DownloadRequestPacket(this.ModLoader.clientLobby)
        );
      }
      let gui_p: Ooto_SceneGUIPacket = new Ooto_SceneGUIPacket(
        this.core.global.scene,
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
        'OotOnline:onAgeChange',
        new GUITunnelPacket('OotOnline', 'OotOnline:onAgeChange', gui_p)
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
    lobby.data['OotOnline:key_syncing'] = true;
  }

  @EventHandler(EventsClient.ON_LOBBY_JOIN)
  onJoinedLobby(lobby: LobbyData): void {
    this.LobbyConfig.actor_syncing = lobby.data['OotOnline:actor_syncing'];
    this.LobbyConfig.data_syncing = lobby.data['OotOnline:data_syncing'];
    this.LobbyConfig.key_syncing = lobby.data['OotOnline:key_syncing'];
    this.ModLoader.logger.info('OotOnline settings inherited from lobby.');
    if (GHOST_MODE_TRIGGERED) {
      bus.emit(OotOnlineEvents.GHOST_MODE, true);
    }
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

  @EventHandler(EventsClient.ON_PLAYER_LEAVE)
  onPlayerLeft(player: INetworkPlayer) {
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
      this
    ) as OotOnlineStorage;
    if (storage === null) {
      return;
    }
    delete storage.players[evt.player.uuid];
    delete storage.networkPlayerInstances[evt.player.uuid];
  }

  //------------------------------
  // Scene handling
  //------------------------------

  @EventHandler(OotEvents.ON_SCENE_CHANGE)
  onSceneChange(scene: number) {
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
    try {
      let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
        packet.lobby,
        this
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
      bus.emit(
        OotOnlineEvents.SERVER_PLAYER_CHANGED_SCENES,
        new OotOnline_PlayerScene(packet.player, packet.lobby, packet.scene)
      );
    } catch (err) {
    }
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
    bus.emit(
      OotOnlineEvents.CLIENT_REMOTE_PLAYER_CHANGED_SCENES,
      new OotOnline_PlayerScene(packet.player, packet.lobby, packet.scene)
    );
    let gui_p: Ooto_SceneGUIPacket = new Ooto_SceneGUIPacket(
      packet.scene,
      packet.age,
      packet.lobby
    );
    gui_p.player = packet.player;
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

  //------------------------------
  // Subscreen Syncing
  //------------------------------

  @ServerNetworkHandler('Ooto_BottleUpdatePacket')
  onBottle_server(packet: Ooto_BottleUpdatePacket) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
      packet.lobby,
      this
    ) as OotOnlineStorage;
    if (storage === null) {
      return;
    }
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
    if (storage === null) {
      return;
    }
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
          new Ooto_BankSyncPacket(storage.bank, packet.lobby),
          packet.lobby
        ),
        packet.player
      );
      this.ModLoader.serverSide.sendPacketToSpecificPlayer(new Ooto_KeyRebuildPacket(storage.changelog, packet.lobby), packet.player);
    } else {
      // Game is not running, give me your data.
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
    // Clear inventory.
    this.ModLoader.emulator.rdramWriteBuffer(global.ModLoader.save_context + 0x0074, Buffer.alloc(0x18, 0xFF));
    // Clear c-button and b.
    //this.ModLoader.emulator.rdramWriteBuffer(global.ModLoader.save_context + 0x0068, Buffer.alloc(0x4, 0xFF));
    this.core.link.sword = Sword.NONE;
    this.core.link.shield = Shield.NONE;
    this.core.link.boots = Boots.KOKIRI;
    this.core.link.tunic = Tunic.KOKIRI;
    applyInventoryToContext(packet.subscreen.inventory, this.core.save, true);
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
    this.clientStorage.bank = packet.bank.savings;
    this.ModLoader.emulator.rdramWrite16(0x8011B874, this.clientStorage.bank);
    this.clientStorage.first_time_sync = true;
  }

  // I am giving the server data.
  @NetworkHandler('Ooto_DownloadResponsePacket2')
  onDownPacket2_client(packet: Ooto_DownloadResponsePacket2) {
    this.clientStorage.first_time_sync = true;
    this.ModLoader.logger.info('The lobby is mine!');
    this.clientStorage.needs_update = true;
    this.updateBottles(true);
  }

  @ServerNetworkHandler('Ooto_SubscreenSyncPacket')
  onItemSync_server(packet: Ooto_SubscreenSyncPacket) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
      packet.lobby,
      this
    ) as OotOnlineStorage;
    if (storage === null) {
      return;
    }
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
    storage.saveGameSetup = true;
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
    if (storage === null) {
      return;
    }
    for (let i = 0; i < packet.scenes.byteLength; i += 0x1C) {
      let struct = new OotO_SceneStruct(packet.scenes.slice(i, i + 0x1C));
      let cur = new OotO_SceneStruct(storage.sceneStorage.slice(i, i + 0x1C));
      for (let j = 0; j < struct.chests.byteLength; j++) {
        if (struct.chests[j] !== cur.chests[i]) {
          cur.chests[j] |= struct.chests[j];
        }
      }
      for (let j = 0; j < struct.collectible.byteLength; j++) {
        if (struct.collectible[j] !== cur.collectible[i]) {
          cur.collectible[j] |= struct.collectible[j];
        }
      }
      for (let j = 0; j < struct.room_clear.byteLength; j++) {
        if (struct.room_clear[j] !== cur.room_clear[i]) {
          cur.room_clear[j] |= struct.room_clear[j];
        }
      }
      for (let j = 0; j < struct.switches.byteLength; j++) {
        if (struct.switches[j] !== cur.switches[i]) {
          cur.switches[j] |= struct.switches[j];
        }
      }
      for (let j = 0; j < struct.visited_floors.byteLength; j++) {
        if (struct.visited_floors[j] !== cur.visited_floors[i]) {
          cur.visited_floors[j] |= struct.visited_floors[j];
        }
      }
      for (let j = 0; j < struct.visited_rooms.byteLength; j++) {
        if (struct.visited_rooms[j] !== cur.visited_rooms[i]) {
          cur.visited_rooms[j] |= struct.visited_rooms[j];
        }
      }
      for (let j = 0; j < struct.unused.byteLength; j++) {
        if (struct.unused[j] !== cur.unused[i]) {
          cur.unused[j] = struct.unused[j];
        }
      }
    }
    for (let i = 0; i < packet.events.byteLength; i++) {
      let value = packet.events[i];
      if (storage.eventStorage[i] !== value) {
        storage.eventStorage[i] |= value;
      }
    }
    for (let i = 0; i < packet.items.byteLength; i++) {
      let value = packet.items[i];
      if (storage.itemFlagStorage[i] !== value) {
        storage.itemFlagStorage[i] |= value;
      }
    }
    for (let i = 0; i < packet.inf.byteLength; i++) {
      let value = packet.inf[i];
      if (storage.infStorage[i] !== value) {
        storage.infStorage[i] |= value;
      }
    }
    for (let i = 0; i < packet.skulltulas.byteLength; i++) {
      let value = packet.skulltulas[i];
      if (storage.skulltulaStorage[i] !== value) {
        storage.skulltulaStorage[i] |= value;
      }
    }
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

    this.parseFlagChanges(
      scene_data,
      this.clientStorage.sceneStorage
    );
    this.parseFlagChanges(
      event_data,
      this.clientStorage.eventStorage
    );
    this.parseFlagChanges(
      item_data,
      this.clientStorage.itemFlagStorage
    );
    this.parseFlagChanges(
      inf_data,
      this.clientStorage.infStorage
    );
    this.parseFlagChanges(
      skulltula_data,
      this.clientStorage.skulltulaStorage
    );

    for (let i = 0; i < packet.scenes.byteLength; i += 0x1C) {
      let struct = new OotO_SceneStruct(packet.scenes.slice(i, i + 0x1C));
      let cur = new OotO_SceneStruct(this.clientStorage.sceneStorage.slice(i, i + 0x1C));
      for (let j = 0; j < struct.chests.byteLength; j++) {
        if (struct.chests[j] !== cur.chests[i]) {
          cur.chests[j] |= struct.chests[j];
        }
      }
      for (let j = 0; j < struct.collectible.byteLength; j++) {
        if (struct.collectible[j] !== cur.collectible[i]) {
          cur.collectible[j] |= struct.collectible[j];
        }
      }
      for (let j = 0; j < struct.room_clear.byteLength; j++) {
        if (struct.room_clear[j] !== cur.room_clear[i]) {
          cur.room_clear[j] |= struct.room_clear[j];
        }
      }
      for (let j = 0; j < struct.switches.byteLength; j++) {
        if (struct.switches[j] !== cur.switches[i]) {
          cur.switches[j] |= struct.switches[j];
        }
      }
      for (let j = 0; j < struct.visited_floors.byteLength; j++) {
        if (struct.visited_floors[j] !== cur.visited_floors[i]) {
          cur.visited_floors[j] |= struct.visited_floors[j];
        }
      }
      for (let j = 0; j < struct.visited_rooms.byteLength; j++) {
        if (struct.visited_rooms[j] !== cur.visited_rooms[i]) {
          cur.visited_rooms[j] |= struct.visited_rooms[j];
        }
      }
      for (let j = 0; j < struct.unused.byteLength; j++) {
        if (struct.unused[j] !== cur.unused[i]) {
          cur.unused[j] = struct.unused[j];
        }
      }
    }
    for (let i = 0; i < packet.events.byteLength; i++) {
      let value = packet.events[i];
      if (this.clientStorage.eventStorage[i] !== value) {
        this.clientStorage.eventStorage[i] |= value;
      }
    }
    for (let i = 0; i < packet.items.byteLength; i++) {
      let value = packet.items[i];
      if (this.clientStorage.itemFlagStorage[i] !== value) {
        this.clientStorage.itemFlagStorage[i] |= value;
      }
    }
    for (let i = 0; i < packet.inf.byteLength; i++) {
      let value = packet.inf[i];
      if (this.clientStorage.infStorage[i] !== value) {
        this.clientStorage.infStorage[i] |= value;
      }
    }
    for (let i = 0; i < packet.skulltulas.byteLength; i++) {
      let value = packet.skulltulas[i];
      if (this.clientStorage.skulltulaStorage[i] !== value) {
        this.clientStorage.skulltulaStorage[i] |= value;
      }
    }

    this.core.save.permSceneData = this.clientStorage.sceneStorage;
    this.core.save.eventFlags = this.clientStorage.eventStorage;
    this.core.save.itemFlags = this.clientStorage.itemFlagStorage;
    this.core.save.infTable = this.clientStorage.infStorage;
    this.core.save.skulltulaFlags = this.clientStorage.skulltulaStorage;
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
      !this.core.helper.isSceneNumberValid() ||
      this.core.helper.isLinkEnteringLoadingZone()
    ) {
      return;
    }
    if (this.core.global.scene !== packet.scene) {
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

  @ServerNetworkHandler("Ooto_BankSyncPacket")
  onBankUpdate_server(packet: Ooto_BankSyncPacket) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
      packet.lobby,
      this
    ) as OotOnlineStorage;
    if (storage === null) {
      return;
    }
    storage.bank = packet.savings;
  }

  @NetworkHandler("Ooto_BankSyncPacket")
  onBankUpdate(packet: Ooto_BankSyncPacket) {
    this.clientStorage.bank = packet.savings;
    this.ModLoader.emulator.rdramWrite16(0x8011B874, this.clientStorage.bank);
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
    let gui_p: Ooto_SceneGUIPacket = new Ooto_SceneGUIPacket(
      this.core.global.scene,
      age,
      this.ModLoader.clientLobby
    );
    if (this.modelManager.clientStorage.adultIcon.byteLength > 1) {
      gui_p.setAdultIcon(this.modelManager.clientStorage.adultIcon);
    }
    if (this.modelManager.clientStorage.childIcon.byteLength > 1) {
      gui_p.setChildIcon(this.modelManager.clientStorage.childIcon);
    }
    this.ModLoader.gui.tunnel.send(
      'OotOnline:onAgeChange',
      new GUITunnelPacket('OotOnline', 'OotOnline:onAgeChange', gui_p)
    );
    this.ModLoader.clientSide.sendPacket(
      new Ooto_ScenePacket(
        this.ModLoader.clientLobby,
        this.core.global.scene,
        age
      )
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

  @EventHandler(ModLoader.ModLoaderEvents.ON_CRASH)
  onEmuCrash(evt: any) {
    fs.writeFileSync(
      './Ooto_storagedump.json',
      JSON.stringify(this.clientStorage, null, 2)
    );
    this.utility.makeRamDump();
  }

  @EventHandler(ModLoader.ModLoaderEvents.ON_RECEIVED_CRASH_LOG)
  onServerReceivedCrashlog(evt: any) {
    //let cp: CrashParserActorTable = new CrashParserActorTable();
    //let html: string = cp.parse(evt.dump);
    //fs.writeFileSync("./crashlogs/" + evt.name + ".html", html);
  }

  @EventHandler(EventsClient.ON_PAYLOAD_INJECTED)
  onPayload(evt: any) {
    if (path.parse(evt.file).ext === ".ovl") {
      let result: IOvlPayloadResult = evt.result;
      this.clientStorage.overlayCache[evt.file] = result;
    }
    if (evt.file === "link_no_pvp.ovl") {
      let result: IOvlPayloadResult = evt.result;
      this.ModLoader.emulator.rdramWrite32(0x80600140, result.params);
    } else if (evt.file === "horse-3.ovl") {
      let result: IOvlPayloadResult = evt.result;
      this.ModLoader.emulator.rdramWrite32(0x80600150, result.params);
    }
  }

  @EventHandler(EventsClient.ON_INJECT_FINISHED)
  onStartupFinished(evt: any) {
    //this.core.toggleMapSelectKeybind();
  }

  @EventHandler(ModLoader.ModLoaderEvents.ON_ROM_PATCHED)
  onRom(evt: any) {
    let expected_hash: string = "34c6b74de175cb3d5d08d8428e7ab21d";
    let tools: Z64RomTools = new Z64RomTools(this.ModLoader, 0x7430);
    let file_select_ovl: Buffer = tools.decompressFileFromRom(evt.rom, 32);
    let hash: string = this.ModLoader.utils.hashBuffer(file_select_ovl);
    if (expected_hash !== hash) {
      this.ModLoader.logger.info("File select overlay is modified. Is this rando?");
      this.ModLoader.clientSide.sendPacket(new OotO_isRandoPacket(this.ModLoader.clientLobby));
    }
  }

  @ServerNetworkHandler("OotO_isRandoPacket")
  onRandoPacket(packet: OotO_isRandoPacket) {
  }

  @EventHandler(ModLoader.ModLoaderEvents.ON_SOFT_RESET_PRE)
  onReset(evt: any) {
    this.clientStorage.first_time_sync = false;
  }

  getServerURL(): string {
    return "192.99.70.23:8000";
  }

  // This spawns the helper actor to fix some flag issues.
  @EventHandler(OotEvents.ON_ACTOR_SPAWN)
  onActorSpawned(actor: IActor) {
    // 0x87 = Forest Temple Elevator.
    // 0x102 = Windmill Blades.
    if (actor.actorID === 0x0087 || actor.actorID === 0x102 || actor.actorID === 0xF8) {
      (this.clientStorage.overlayCache["flag_fixer.ovl"] as IOvlPayloadResult).spawn((this.clientStorage.overlayCache["flag_fixer.ovl"] as IOvlPayloadResult), (success: boolean, result: number) => {
        let ff: IActor = this.core.actorManager.createIActorFromPointer(result);
        if (actor.actorID === 0x0087) {
          ff.rdramWriteBuffer(0x24, Buffer.from("433B788243690000C4BAC599", 'hex'));
        } else if (actor.actorID === 0x102) {
          ff.rdramWriteBuffer(0x24, Buffer.from("43751CE2432000004436C483", 'hex'));
        } else if (actor.actorID === 0xF8) {
          ff.rdramWriteBuffer(0x24, Buffer.from("44130FE344CA2000C39B683C", 'hex'));
        }
        this.ModLoader.logger.debug("Summoning the bugfix actor...");
        return {};
      });
    }
  }
}

module.exports = OotOnline;