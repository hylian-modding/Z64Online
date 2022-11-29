import { DumpRam, IModelReference, Z64OnlineEvents, Z64Online_EquipmentPak, Z64Online_ModelAllocation } from '@Z64Online/common/api/Z64API';
import { CDNClient } from '@Z64Online/common/cdn/CDNClient';
import { getManifestForForm, UniversalAliasTable } from '@Z64Online/common/cosmetics/UniversalAliasTable';
import { CostumeHelper } from '@Z64Online/common/events/CostumeHelper';
import { getAgeOrForm, Z64_ADULT_ZOBJ_DMA, Z64_CHILD_ZOBJ_DMA, Z64_IS_RANDOMIZER } from '@Z64Online/common/types/GameAliases';
import { OOT_GAME } from '@Z64Online/common/types/OotAliases';
import { AgeOrForm, Manifest, Scene } from '@Z64Online/common/types/Types';
import { OotOnlineConfigCategory } from '@Z64Online/oot/OotOnline';
import { Z64_EventConfig } from "@Z64Online/common/WorldEvents/Z64_EventConfig";
import fs from 'fs';
import { InjectCore } from 'modloader64_api/CoreInjection';
import {
  bus,
  EventHandler,
  EventsClient,
  markPrototypeProcessed,
  PrivateEventHandler,
  setupEventHandlers,
  setupPrivateEventHandlers
} from 'modloader64_api/EventHandler';
import {
  IModLoaderAPI,
  ModLoaderEvents
} from 'modloader64_api/IModLoaderAPI';
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import {
  INetworkPlayer,
  NetworkHandler
} from 'modloader64_api/NetworkHandler';
import { onTick, onViUpdate, Preinit } from 'modloader64_api/PluginLifecycle';
import { IZ64Main } from 'Z64Lib/API/Common/IZ64Main';
import { Z64 } from 'Z64Lib/API/imports';
import { Tunic } from 'Z64Lib/API/OoT/OOTAPI';
import { Z64RomTools } from 'Z64Lib/API/Utilities/Z64RomTools';
import { EquipmentManifest } from './EquipmentManifest';
import { ModelAllocationManager } from '../utils/ModelAllocationManager';
import { ModelReference } from '../utils/ModelContainer';
import { ModelPlayer } from './ModelPlayer';
import { Z64_GAME } from 'Z64Lib/src/Common/types/GameAliases';
import { IModelManagerShim } from "../utils/IModelManagerShim";
import { Z64O_PRIVATE_EVENTS } from '@Z64Online/common/api/InternalAPI';
import { Z64_AllocateModelPacket, Z64_EquipmentPakPacket, Z64_GiveModelPacket } from '@Z64Online/common/network/Z64OPackets';
import { OotOnlineStorageClient } from '@Z64Online/oot/storage/OotOnlineStorageClient';
import { ALIAS_PROXY_SIZE } from '../Defines';
import { IPuppet } from '@Z64Online/common/puppet/IPuppet';
import { Z64LibSupportedGames } from 'Z64Lib/API/Utilities/Z64LibSupportedGames';
import { ModelAPIHandlers } from './ModelAPIHandlers';
import { FormToMap } from '../maps/FormToMap';
import Z64OEquipmentManifest from '../equipment/Z64OEquipmentManifest';

export class ModelManagerClient {
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
  child!: IModelManagerShim;
  APIHandlers!: ModelAPIHandlers;

  get AgeOrForm(): AgeOrForm {
    return getAgeOrForm(this.core);
  }

  @EventHandler(Z64OnlineEvents.CLEAR_EQUIPMENT)
  onClearEq(evt: any) {
    if (this.managerDisabled) return;
    this.allocationManager.getLocalPlayerData().equipment.clear();
  }

  @EventHandler(Z64OnlineEvents.ALLOCATE_MODEL_BLOCK)
  onAlloc(alloc: Z64Online_ModelAllocation) {
    let ref = this.allocationManager.registerModel(alloc.model);
    if (ref !== undefined) {
      alloc.ref = ref;
    }
  }

  ALREADY_REPOINTED: boolean = false;

  loadFormProxy(rom: Buffer, form: AgeOrForm, defaultPath: string, proxyPath: string, manifest: Manifest, obj_id: number) {
    try {
      if (this.managerDisabled) return;
      let model: Buffer = new UniversalAliasTable().createTable(fs.readFileSync(defaultPath), getManifestForForm(form), true);
      CDNClient.singleton.registerWithCache(model);
      let proxy = new UniversalAliasTable().createTable(fs.readFileSync(proxyPath), getManifestForForm(form));
      if (this.ALREADY_REPOINTED || manifest.repoint(this.ModLoader, rom, proxy)) {
        this.ALREADY_REPOINTED = true;
        this.ModLoader.logger.info("Setting up zobj proxy.");
        let alloc = new Z64Online_ModelAllocation(model, form, Z64_GAME);
        this.allocationManager.getLocalPlayerData().additionalData.set(form, manifest.inject(this.ModLoader, rom, proxy, true, obj_id));
        this.allocationManager.getLocalPlayerData().additionalData.set("proxy", proxy);
        this.ModLoader.utils.setTimeoutFrames(() => {
          bus.emit(Z64OnlineEvents.ALLOCATE_MODEL_BLOCK, alloc);
          alloc.ref.isPlayerModel = false;
          this.allocationManager.getLocalPlayerData().AgesOrForms.set(form, alloc.ref);
        }, 2);
      }
    } catch (err: any) {
      this.ModLoader.logger.error(err.stack);
    }
  }

  registerDefaultModel(form: AgeOrForm, zobj: string) {
    let model = new UniversalAliasTable().createTable(fs.readFileSync(zobj), getManifestForForm(form), true);
    CDNClient.singleton.registerWithCache(model);
    this.puppetModels.set(form, this.allocationManager.registerModel(model));
    this.puppetModels.get(form)!.isPlayerModel = false;
  }

  setupPuppetModels(evt: any) {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir);
    }
    this.ModLoader.logger.info("Setting up puppet models...");

    this.ModLoader.utils.setTimeoutFrames(() => {
      this.child.setupLinkModels();
      this.lockManager = false;
    }, 3);
  }

  @EventHandler(ModLoaderEvents.ON_ROM_PATCHED_PRE)
  onRomPatchedPre(evt: any) {
    try {
      this.setupPuppetModels(evt);
      setupPrivateEventHandlers(this.child, this.ModLoader.privateBus);
      setupEventHandlers(this.child, this.ModLoader.publicBus);
      markPrototypeProcessed(this.child);
    } catch (err: any) {
      // Maybe don't shallow this error?
      console.log(err);
      throw err;
    }
  }

  // This function fires every 100 frames if we're using a zobj proxy.
  syncProxiedObject() {
    if (this.proxyNeedsSync) {
      this.allocationManager.getLocalPlayerData().AgesOrForms.forEach((ref: IModelReference, form: AgeOrForm) => {
        CDNClient.singleton.askCDN(this.allocationManager.getModel(ref).zobj).then((has: boolean) => {
          if (!has) {
            CDNClient.singleton.uploadFile(ref.hash, this.allocationManager.getModel(ref).zobj).then((done: boolean) => {
              if (done) {
                this.ModLoader.clientSide.sendPacket(new Z64_AllocateModelPacket(form, this.ModLoader.clientLobby, ref.hash, this.AgeOrForm));
              }
            });
          } else {
            this.ModLoader.clientSide.sendPacket(new Z64_AllocateModelPacket(form, this.ModLoader.clientLobby, ref.hash, this.AgeOrForm));
          }
        });
      });

      if (this.allocationManager.getLocalPlayerData().equipment.size > 0) {
        this.clientStorage.equipmentHashes.length = 0;
        this.allocationManager.getLocalPlayerData().equipment.forEach((value: IModelReference, key: string) => {
          let model = this.allocationManager.getModel(value);
          let id = this.ModLoader.utils.hashBuffer(model.zobj);
          CDNClient.singleton.askCDN(model.zobj).then((has: boolean) => {
            this.clientStorage.equipmentHashes.push(id);
            if (!has) {
              CDNClient.singleton.uploadFile(id, model.zobj).then((done: boolean) => {
                if (done) {
                  let p = new Z64_EquipmentPakPacket(this.AgeOrForm, this.ModLoader.clientLobby);
                  p.ids = this.clientStorage.equipmentHashes;
                  this.ModLoader.clientSide.sendPacket(p);
                }
              });
            } else {
              let p = new Z64_EquipmentPakPacket(this.AgeOrForm, this.ModLoader.clientLobby);
              p.ids = this.clientStorage.equipmentHashes;
              this.ModLoader.clientSide.sendPacket(p);
            }
          });
        });
      }
      this.proxyNeedsSync = false;
    }
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

  @PrivateEventHandler('LOAD_MODEL')
  LOAD_MODEL_HANDLER(ref: ModelReference) {
    this.allocationManager.allocateModel(ref);
  }

  @PrivateEventHandler('KILL_MODEL')
  KILL_MODEL_HANDLER(ref: ModelReference) {
    this.allocationManager.unregisterModel(ref);
  }

  @PrivateEventHandler(Z64O_PRIVATE_EVENTS.TOGGLE_COSTUME_LOCK)
  onToggleLock() {
    this.lockManager = !this.lockManager;
    this.ModLoader.logger.debug(`Costume Manager lock state ${this.lockManager}`);
  }

  @EventHandler(ModLoaderEvents.ON_ROM_PATCHED)
  onRomPatched(evt: any) {
    let tools: Z64RomTools = new Z64RomTools(this.ModLoader, Z64_GAME);
    if (Z64_GAME === OOT_GAME) {
      if (!Z64_IS_RANDOMIZER) {
        if (tools.decompressDMAFileFromRom(evt.rom, Z64_ADULT_ZOBJ_DMA).byteLength !== 0x37800 || tools.decompressDMAFileFromRom(evt.rom, Z64_CHILD_ZOBJ_DMA).byteLength !== 0x2CF80) {
          this.managerDisabled = true;
        }
      }
    }
    if (this.managerDisabled) return;
    // Leave this here. We do this so people messing with code don't decompress and recompress it a bunch of times.
    let code_file: Buffer = tools.getCodeFile(evt.rom);
    bus.emit(Z64OnlineEvents.POST_LOADED_MODELS_LIST, { models: this.customModelRegistry, equipment: this.customModelFilesEquipment });
    this.ModLoader.logger.info('Starting custom model setup...');
    try {
      this.child.onRomPatched(evt);
    } catch (err: any) {
      this.ModLoader.logger.error(err);
      throw err;
    }

    this.proxySyncTick = this.ModLoader.utils.setIntervalFrames(() => {
      this.syncProxiedObject();
    }, 100);

    this.ModLoader.logger.info('Done.');
    this.ModLoader.utils.setTimeoutFrames(() => {
      bus.emit(Z64OnlineEvents.ON_MODEL_MANAGER_READY, {});
      this.ModLoader.clientSide.sendPacket(new Z64_GiveModelPacket(this.ModLoader.clientLobby, this.ModLoader.me));
    }, 100);
  }

  @NetworkHandler('Z64OnlineLib_AllocateModelPacket')
  onModelAllocate_client(packet: Z64_AllocateModelPacket) {
    CDNClient.singleton.requestFile(packet.hash).then((buf: Buffer) => {
      let player: ModelPlayer;
      if (this.allocationManager.doesPlayerExist(packet.player)) {
        player = this.allocationManager.getPlayer(packet.player)!;
      } else {
        player = this.allocationManager.createPlayer(packet.player, this.puppetModels)!;
      }
      let model = this.allocationManager.registerModel(buf)!;
      player.AgesOrForms.set(packet.age, model);
      if (this.allocationManager.isPlayerAllocated(player)) {
        this.setPuppetModel(player, model, packet.age, packet.ageThePlayerActuallyIs);
      }
    }).catch((err: any)=>{
      this.ModLoader.logger.error(err);
  });;
  }

  /* @NetworkHandler('Z64OnlineLib_EquipmentPakPacket')
  onModelAllocate_Equipment(packet: Z64_EquipmentPakPacket) {
    this.ModLoader.utils.setTimeoutFrames(() => {
      let player = this.allocationManager.createPlayer(packet.player, this.puppetModels)!;
      player.equipment.clear();
      packet.ids.forEach((id: string) => {
        CDNClient.singleton.requestFile(id).then((buf: Buffer) => {
          let model = this.allocationManager.registerModel(buf)!;
          model.loadModel();
          let man = this.getEquipmentManifest(model);
          if (man === undefined) return;
          player.equipment.set(man.cat, model);
          if (this.allocationManager.isPlayerAllocated(player)) {
            this.setPuppetModel(player, player.AgesOrForms.get(packet.age)!, packet.age, packet.age);
          }
        });
      });
    }, 1);
  } */

  @EventHandler(EventsClient.ON_PLAYER_LEAVE)
  onPlayerLeft(player: INetworkPlayer) {
    this.allocationManager.deletePlayer(player);
  }

  @NetworkHandler("Z64OnlineLib_GiveModelPacket")
  onPlayerJoin_client(packet: Z64_GiveModelPacket) {
    this.proxyNeedsSync = true;
  }

  @EventHandler(Z64OnlineEvents.PLAYER_PUPPET_PRESPAWN)
  onPuppetPreSpawn(puppet: IPuppet) {
    let player = this.allocationManager.allocatePlayer(puppet.player, this.puppetModels)!;
    puppet.modelPointer = player.proxyPointer;
    player.playerIsSpawned = true;
    this.ModLoader.logger.debug(`Puppet ${puppet.id} prespawn clear`);
  }

  private setPuppetModel(player: ModelPlayer, ref: IModelReference, modelAge: AgeOrForm, playerAge: AgeOrForm) {
    player.AgesOrForms.forEach((ref: IModelReference) => {
      ref.loadModel();
    });
    ref.loadModel();

    if (playerAge !== modelAge) return;
    this.ModLoader.emulator.rdramWriteBuffer(player.proxyPointer, player.proxyData);
    let alias = this.ModLoader.emulator.rdramReadBuffer(ref.pointer, ALIAS_PROXY_SIZE).slice(0x5000);
    this.ModLoader.emulator.rdramWriteBuffer(player.proxyPointer + 0x5000, alias);
    this.ModLoader.logger.debug(`Player ${player.uuid} model set to ${ref.pointer.toString(16)}`);
    if (this.mainConfig.diagnosticMode) {
      DumpRam();
    }
  }

  @EventHandler(Z64OnlineEvents.PLAYER_PUPPET_SPAWNED)
  onPuppetSpawned(puppet: IPuppet) {
    let player = this.allocationManager.allocatePlayer(puppet.player, this.puppetModels)!;
    if (player.AgesOrForms.has(puppet.ageOrForm)) {
      this.setPuppetModel(player, player.AgesOrForms.get(puppet.ageOrForm)!, puppet.ageOrForm, puppet.ageOrForm);
    } else {
      this.setPuppetModel(player, this.puppetModels.get(puppet.ageOrForm)!, puppet.ageOrForm, puppet.ageOrForm);
    }
    if (this.mainConfig.diagnosticMode) {
      DumpRam();
    }
  }

  @EventHandler(Z64OnlineEvents.PLAYER_PUPPET_DESPAWNED)
  onPuppetDespawned(puppet: IPuppet) {
    this.allocationManager.getPlayer(puppet.player)!.isDead = true;
  }

  @EventHandler(Z64OnlineEvents.PUPPET_AGE_CHANGED)
  onPuppetAgeChange(puppet: IPuppet) {
    this.onPuppetSpawned(puppet);
  }

  private dealWithEquipmentPaks(age: AgeOrForm) {
    bus.emit(Z64OnlineEvents.EQUIPMENT_LOAD_START, {});
    this.allocationManager.getLocalPlayerData().equipment.forEach((value: IModelReference) => {
      value.loadModel();
      let map = FormToMap.GetMapFromForm(age)!;
      let eqmap = Z64OEquipmentManifest.getEquipmentMap(this.allocationManager.getModel(value).zobj);
      let link = this.child.findLink();
      Object.keys(eqmap).forEach((key: string)=>{
        let local: number = eqmap[key];
        let remote: number = map[key];
        if (local !== undefined && remote !== undefined){
          let p = link + remote + 0x4;
          let e = value.pointer + local;
          this.ModLoader.emulator.rdramWrite32(p, e);
        }
      });
    });
    bus.emit(Z64OnlineEvents.EQUIPMENT_LOAD_END, {});
  }

  onPuppetsClear(evt: any) {
    this.ModLoader.utils.setTimeoutFrames(() => {
      this.allocationManager.deallocateAllPlayers();
      this.allocationManager.doGC();
    }, 1);
  }

  @EventHandler(Z64.Z64Events.ON_SCENE_CHANGE)
  onSceneChange(scene: Scene) {
    this.child.onSceneChange(scene);
    this.dealWithEquipmentPaks(getAgeOrForm(this.core));
    bus.emit(Z64OnlineEvents.LOCAL_MODEL_REFRESH, scene);
  }

  @EventHandler(Z64.Z64Events.ON_AGE_CHANGE)
  onAgeChange() {
    //this.child.onSceneChange(1);
  }

  private handleModelChange(form: AgeOrForm, evt: Z64Online_ModelAllocation) {
    if (this.managerDisabled) return;
    if (evt.ref !== undefined) {
      if (this.allocationManager.getLocalPlayerData().AgesOrForms.get(form)!.hash === evt.ref.hash) return;
      this.allocationManager.SetLocalPlayerModel(form, evt.ref);
      if (Z64_GAME === Z64LibSupportedGames.MAJORAS_MASK) {
        if (!this.core.MM!.helper.isTitleScreen()) {
          this.onSceneChange(-1);
        }
      } else {
        this.onSceneChange(-1);
      }
      this.proxyNeedsSync = true;
      if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
        /* let r2 = this.allocationManager.getLocalPlayerData().currentScript!.onTunicChanged(evt.ref, this.core.OOT!.link.tunic);
        if (r2.hash !== evt.ref.hash) {
          this.allocationManager.SetLocalPlayerModel(form, r2);
        } */
      }
      return;
    }
    if (evt.model.byteLength === 1) {
      this.allocationManager.SetLocalPlayerModel(form, this.puppetModels.get(form)!);
      if (Z64_GAME === Z64LibSupportedGames.MAJORAS_MASK) {
        if (!this.core.MM!.helper.isTitleScreen()) {
          this.onSceneChange(-1);
        }
      } else {
        this.onSceneChange(-1);
      }
      evt.ref = this.puppetModels.get(form)!;
      this.proxyNeedsSync = true;
    } else {
      let model: IModelReference;
      model = ModelAPIHandlers.processModel(evt, this.ModLoader)!;
      model.script = evt.script;
      this.allocationManager.SetLocalPlayerModel(form, model);
      if (Z64_GAME === Z64LibSupportedGames.MAJORAS_MASK) {
        if (!this.core.MM!.helper.isTitleScreen()) {
          this.onSceneChange(-1);
        }
      } else {
        this.onSceneChange(-1);
      }
      evt.ref = model;
      this.proxyNeedsSync = true;
    }
    bus.emit(Z64OnlineEvents.LOCAL_MODEL_CHANGE_FINISHED, evt);
  }

  @EventHandler(Z64OnlineEvents.CHANGE_CUSTOM_MODEL)
  onChangeModel(evt: Z64Online_ModelAllocation) {
    this.handleModelChange(evt.age, evt);
  }

  @PrivateEventHandler(Z64O_PRIVATE_EVENTS.CLEAR_LINK_MODEL)
  onClear() {
    let link = this.child.findLink();
    if (this.ModLoader.emulator.rdramRead32(link + 0x5000) === 0x4D4F444C) {
      this.ModLoader.emulator.rdramWriteBuffer(link, this.allocationManager.getLocalPlayerData().additionalData.get("proxy"));
      for (let i = 0; i < 5; i++) {
        if (this.allocationManager.getLocalPlayerData().additionalData.has(i)) {
          this.ModLoader.rom.romWriteBuffer(this.allocationManager.getLocalPlayerData().additionalData.get(i), this.allocationManager.getLocalPlayerData().additionalData.get("proxy"));
        }
      }
    }
  }

  @EventHandler(ModLoaderEvents.ON_SOFT_RESET_PRE)
  onReset1() {
    this.allocationManager.deallocateAllModels();
    this.allocationManager.deallocateAllPlayers();
    this.allocationManager.doGC();
    this.lockManager = true;
  }

  @EventHandler(ModLoaderEvents.ON_SOFT_RESET_POST)
  onReset2() {
    this.lockManager = false;
  }

  @onTick()
  onTick() {
    if (this.managerDisabled) return;
    if (this.lockManager) return;
    if (!this.child.safetyCheck()) return;
    let link = this.child.findLink();
    if (this.ModLoader.emulator.rdramRead32(link + 0x5000) === 0x4D4F444C) {
      let status = this.ModLoader.emulator.rdramRead8(link + 0x5016);
      if (status === 0) {
        this.ModLoader.logger.debug("Found Link proxy with no data. Injecting...");
        this.onSceneChange(-1);
      }
    }
    if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
      this.allocationManager.getLocalPlayerData().currentScript!.onTick();
    }
  }

  @EventHandler(Z64.Z64Events.ON_DAY_TRANSITION)
  onDay() {
    if (this.managerDisabled) return;
    if (this.lockManager) return;
    if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
      let ref: IModelReference = this.allocationManager.getLocalPlayerData().AgesOrForms.get(this.AgeOrForm)!;
      let newRef = this.allocationManager.getLocalPlayerData().currentScript!.onDay(ref);
      this.ModLoader.utils.setTimeoutFrames(() => {
        let a = new Z64Online_ModelAllocation(Buffer.alloc(1), this.AgeOrForm, Z64_GAME);
        a.ref = newRef;
        if (this.AgeOrForm === AgeOrForm.ADULT) {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL, a);
        } else {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL, a);
        }
      }, 1);
    }
  }

  @EventHandler(Z64.Z64Events.ON_NIGHT_TRANSITION)
  onNight() {
    if (this.managerDisabled) return;
    if (this.lockManager) return;
    if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
      let ref: IModelReference = this.allocationManager.getLocalPlayerData().AgesOrForms.get(this.AgeOrForm)!;
      let newRef = this.allocationManager.getLocalPlayerData().currentScript!.onNight(ref);
      this.ModLoader.utils.setTimeoutFrames(() => {
        let a = new Z64Online_ModelAllocation(Buffer.alloc(1), this.AgeOrForm, Z64_GAME);
        a.ref = newRef;
        if (this.AgeOrForm === AgeOrForm.ADULT) {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL, a);
        } else {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL, a);
        }
      }, 1);
    }
  }

  @EventHandler(Z64.Z64Events.ON_HEALTH_CHANGE)
  onHealth(health: number) {
    if (this.managerDisabled) return;
    if (this.lockManager) return;
    if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
      let ref: IModelReference = this.allocationManager.getLocalPlayerData().AgesOrForms.get(this.AgeOrForm)!;
      let newRef = this.allocationManager.getLocalPlayerData().currentScript!.onHealthChanged(this.core.OOT!.save.heart_containers * 0x10, health, ref);
      this.ModLoader.utils.setTimeoutFrames(() => {
        let a = new Z64Online_ModelAllocation(Buffer.alloc(1), this.AgeOrForm, Z64_GAME);
        a.ref = newRef;
        if (this.AgeOrForm === AgeOrForm.ADULT) {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL, a);
        } else {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL, a);
        }
      }, 1);
    }
  }

  @EventHandler(Z64.Z64Events.ON_TUNIC_CHANGE)
  onTunic(tunic: Tunic) {
    if (this.managerDisabled) return;
    if (this.lockManager) return;
    if (Z64_GAME !== OOT_GAME) return;
    if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
      let ref: IModelReference = this.allocationManager.getLocalPlayerData().AgesOrForms.get(this.AgeOrForm)!;
      let newRef = this.allocationManager.getLocalPlayerData().currentScript!.onTunicChanged(ref, tunic);
      this.ModLoader.utils.setTimeoutFrames(() => {
        let a = new Z64Online_ModelAllocation(Buffer.alloc(1), this.AgeOrForm, Z64_GAME);
        a.ref = newRef;
        if (this.AgeOrForm === AgeOrForm.ADULT) {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL, a);
        } else {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL, a);
        }
      }, 1);
    }
  }
}