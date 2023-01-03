import { IModelReference, Z64OnlineEvents, Z64Online_EquipmentPak, Z64Online_ModelAllocation } from '@Z64Online/common/api/Z64API';
import { AgeOrForm } from '@Z64Online/common/types/Types';
import { OotOnlineConfigCategory } from '@Z64Online/oot/OotOnline';
import { Z64_EventConfig } from "@Z64Online/common/WorldEvents/Z64_EventConfig";
import { InjectCore } from 'modloader64_api/CoreInjection';
import {
  EventHandler,
  PrivateEventHandler,
  setupEventHandlers,
  EventsClient
} from 'modloader64_api/EventHandler';
import {
  IModLoaderAPI,
  ModLoaderEvents
} from 'modloader64_api/IModLoaderAPI';
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import { Preinit, onTick } from 'modloader64_api/PluginLifecycle';
import { IZ64Main } from 'Z64Lib/API/Common/IZ64Main';
import { ModelAllocationManager } from '../utils/ModelAllocationManager';
import { ModelReference } from '../utils/ModelContainer';
import { OotOnlineStorageClient } from '@Z64Online/oot/storage/OotOnlineStorageClient';
import { ModelAPIHandlers } from './ModelAPIHandlers';
import GameSystemClassManager from './Model2023/GameSystemClassManager';
import IModelSystemGame from './Model2023/IModelSystemGame';
import { ModelSystemSupportedGames } from './Model2023/ModelSystemSupportedGames';
import { getAgeOrForm } from '@Z64Online/common/types/GameAliases';
import { Z64 } from 'Z64Lib/API/imports';
import { CDNClient } from '@Z64Online/common/cdn/CDNClient';
import { Z64O_ModelPacket } from '@Z64Online/common/network/Z64OPackets';
import { NetworkHandler } from 'modloader64_api/NetworkHandler';

export class ModelManagerClient {

  static singleton: ModelManagerClient;

  @ModLoaderAPIInject()
  ModLoader!: IModLoaderAPI;
  @InjectCore()
  core!: IZ64Main;
  clientStorage!: OotOnlineStorageClient;
  allocationManager!: ModelAllocationManager;
  cacheDir: string = "./cache";
  //
  proxySyncTick!: string;
  proxyNeedsSync: boolean = false;
  customModelRegistry: Map<AgeOrForm, Map<string, IModelReference>> = new Map();
  customModelFilesEquipment: Map<string, Z64Online_EquipmentPak> = new Map<string, Z64Online_EquipmentPak>();
  config!: Z64_EventConfig;
  //
  puppetModels: Map<AgeOrForm, IModelReference> = new Map<AgeOrForm, IModelReference>();
  lockManager: boolean = true;
  managerDisabled: boolean = false;
  mainConfig!: OotOnlineConfigCategory;
  APIHandlers!: ModelAPIHandlers;

  constructor() {
    ModelManagerClient.singleton = this;
  }

  @Preinit()
  preinit() {
    this.APIHandlers = new ModelAPIHandlers(this);
    setupEventHandlers(this.APIHandlers, this.ModLoader.publicBus);

    for (let i = 4; i > -1; i--) {
      this.customModelRegistry.set(i, new Map());
    }

    this.allocationManager = new ModelAllocationManager(this.ModLoader);
    this.config = this.ModLoader.config.registerConfigCategory("Z64O_WorldEvents") as Z64_EventConfig;
    this.ModLoader.config.setData("Z64O_WorldEvents", "disableCostumeManager", false);
    this.managerDisabled = this.config.disableCostumeManager;
    this.mainConfig = (this.ModLoader.config.registerConfigCategory("OotOnline") as OotOnlineConfigCategory);
  }

  private sendModelUpdate() {
    let hashes: string[] = [];
    this.allocationManager.getLocalPlayerData().AgesOrForms.forEach((value: IModelReference) => {
      hashes.push(value.hash);
    });
    console.log("Sent model packet");
    this.ModLoader.clientSide.sendPacket(new Z64O_ModelPacket(this.ModLoader.clientLobby, hashes));
  }

  @NetworkHandler('Z64O_ModelPacket')
  onModelPlayerUpdate(packet: Z64O_ModelPacket) {
    console.log(packet);
    for (let i = 0; i < packet.hashes.length; i++) {
      CDNClient.singleton.requestFile(packet.hashes[i]).then((value: Buffer) => {
        let ref = this.allocationManager.registerModel(value);
        ref.loadModel();
        let player = this.allocationManager.getPlayer(packet.player);
        let write = () => {
          player = this.allocationManager.getPlayer(packet.player);
          if (player === undefined) return false;
          this.ModLoader.emulator.rdramWrite32(player!.pointer + (i * 4), ref.pointer);
          return true;
        };
        if (player === undefined) {
          let tick = this.ModLoader.utils.setIntervalFrames(() => {
            if (write()) {
              this.ModLoader.utils.clearIntervalFrames(tick);
            }
          }, 1);
        }else{
          write();
        }
      }).then(() => { }).catch((err: any) => {
        console.error(err);
      });
    }
  }

  @PrivateEventHandler('LOAD_MODEL')
  LOAD_MODEL_HANDLER(ref: ModelReference) {
    this.allocationManager.allocateModel(ref);
  }

  @PrivateEventHandler('KILL_MODEL')
  KILL_MODEL_HANDLER(ref: ModelReference) {
    this.allocationManager.unregisterModel(ref);
  }

  game!: IModelSystemGame;

  /**
   * Detect and configure which game we're playing.
   */
  detectGameFromCore(): void {
    if (this.core.constructor.name === "Z64Lib") {
      // This is an N64 Zelda game.
      if (this.core["OOT"] !== undefined) {
        // This is OOT.
        this.game = GameSystemClassManager.resolveClass(ModelSystemSupportedGames.OCARINA_OF_TIME)!;
      } else if (this.core["MM"] !== undefined) {
        // This is MM.
        this.game = GameSystemClassManager.resolveClass(ModelSystemSupportedGames.MAJORAS_MASK)!;
      } else {
        // Undefined behavior.
      }
    }
  }

  @EventHandler(ModLoaderEvents.ON_ROM_PATCHED)
  private _rom_event_handler(evt: { rom: Buffer }) {
    this.detectGameFromCore();
    this.doGameInjects(evt.rom);
    this.ModLoader.publicBus.emit(Z64OnlineEvents.POST_LOADED_MODELS_LIST, { models: this.customModelRegistry, equipment: this.customModelFilesEquipment });
  }

  /**
   * Do any rom injections needed.
   * @param rom - Buffer of ROM or path to ROM.
   */
  doGameInjects(rom: Buffer | string): void {
    this.ModLoader.logger.debug("Injecting model manager code...");
    this.game.doGameInjects(this.ModLoader, rom);
  }

  @EventHandler(EventsClient.ON_HEAP_READY)
  private _heap_ready_handler() {
    this.ModLoader.utils.setTimeoutFrames(() => {
      this.doHandlerInjection();
    }, 20);
  }

  /**
   * Inject code into the game to handle model stuff for the local player.
   */
  doHandlerInjection() {
    this.ModLoader.logger.debug("Injecting code...");
    this.game.doHandlerInjection(this.ModLoader, this.core, this);
  }

  /**
   * Trigger the injected code to refresh the local player model.
   */
  triggerHandler() {
    this.game.triggerHandler(this.ModLoader, this.core, this);
  }

  @EventHandler(Z64OnlineEvents.CHANGE_CUSTOM_MODEL)
  loadLocalPlayerModel(evt: Z64Online_ModelAllocation) {
    if (evt.model.byteLength === 1 && evt.ref === undefined) {
      evt.ref = this.puppetModels.get(getAgeOrForm(this.core))!;
    }
    evt.ref.loadModel();
    if (evt.ref.pointer > 0) {
      this.allocationManager.SetLocalPlayerModel(getAgeOrForm(this.core), evt.ref);
      this.triggerHandler();

      CDNClient.singleton.askCDN(this.allocationManager.getModel(evt.ref).zobj).then((result: boolean) => {
        if (!result) {
          CDNClient.singleton.uploadFile(evt.ref.hash, this.allocationManager.getModel(evt.ref).zobj).then(() => {
            this.sendModelUpdate();
          });
        } else {
          this.sendModelUpdate();
        }
      });

    }
  }

  @EventHandler(Z64.Z64Events.ON_SCENE_CHANGE)
  onSceneChange(scene: number) {
    this.triggerHandler();
  }

}