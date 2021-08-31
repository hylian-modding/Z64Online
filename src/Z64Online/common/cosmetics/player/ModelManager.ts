import { DumpRam, IModelReference, Z64OnlineEvents, Z64Online_EquipmentPak, Z64Online_ModelAllocation } from '@Z64Online/common/api/Z64API';
import { CDNClient } from '@Z64Online/common/cdn/CDNClient';
import { getManifestForForm, UniversalAliasTable } from '@Z64Online/common/cosmetics/UniversalAliasTable';
import { CostumeHelper } from '@Z64Online/common/events/CostumeHelper';
import { Z64_ADULT_ZOBJ_DMA, Z64_CHILD_ZOBJ_DMA, Z64_IS_RANDOMIZER } from '@Z64Online/common/types/GameAliases';
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
  PrivateEventHandler
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
import { onTick, Preinit } from 'modloader64_api/PluginLifecycle';
import { IZ64Main } from 'Z64Lib/API/Common/IZ64Main';
import { Z64 } from 'Z64Lib/API/imports';
import { Tunic } from 'Z64Lib/API/OOT/OOTAPI';
import { Z64RomTools } from 'Z64Lib/API/Utilities/Z64RomTools';
import { EquipmentManifest } from './EquipmentManifest';
import { ModelAllocationManager } from '../utils/ModelAllocationManager';
import { ModelReference } from '../utils/ModelContainer';
import { ModelPlayer } from './ModelPlayer';
import { Z64_GAME } from 'Z64Lib/src/Common/types/GameAliases';
import { IModelManagerShim } from "../utils/IModelManagerShim";
import { Z64O_PRIVATE_EVENTS } from '@Z64Online/common/api/InternalAPI';
import { Z64_AllocateModelPacket, Z64_EquipmentPakPacket, Z64_GiveModelPacket } from '@Z64Online/common/network/Z64OPackets';
import { Puppet_OOT } from '@Z64Online/oot/puppet/Puppet_OOT';
import { OotOnlineStorageClient } from '@Z64Online/oot/storage/OotOnlineStorageClient';
import { ALIAS_PROXY_SIZE } from '../Defines';
import { IPuppet } from '@Z64Online/common/puppet/IPuppet';

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
  customModelFilesAdult: Map<string, IModelReference> = new Map<string, IModelReference>();
  customModelFilesChild: Map<string, IModelReference> = new Map<string, IModelReference>();
  customModelFilesEquipment: Map<string, Buffer> = new Map<string, Buffer>();
  config!: Z64_EventConfig;
  //
  puppetModels: Map<AgeOrForm, IModelReference> = new Map<AgeOrForm, IModelReference>();
  lockManager: boolean = true;
  managerDisabled: boolean = false;
  mainConfig!: OotOnlineConfigCategory;
  child!: IModelManagerShim;

  getLinkAgeOrForm() {
    if (this.core.OOT !== undefined) return this.core.OOT!.save.age;
    if (this.core.MM !== undefined) return this.core.MM!.save.form;
    return AgeOrForm.CHILD;
  }

  get AgeOrForm(): AgeOrForm {
    return this.getLinkAgeOrForm();
  }

  @EventHandler(Z64OnlineEvents.CUSTOM_MODEL_LOAD_ADULT)
  onCustomModelAdult_new(evt: Z64Online_ModelAllocation) {
    if (this.managerDisabled) return;
    let ref: IModelReference;
    if (evt.model.indexOf("UNIVERSAL_ALIAS_TABLE") === -1) {
      ref = this.allocationManager.registerModel(new UniversalAliasTable().createTable(evt.model, getManifestForForm(evt.age)));
    } else {
      ref = this.allocationManager.registerModel(evt.model);
    }
    if (evt.script !== undefined) {
      ref.script = evt.script;
    }
    evt.ref = ref;
    this.customModelFilesAdult.set(evt.name + " (Adult)", evt.ref);
  }

  @EventHandler(Z64OnlineEvents.CUSTOM_MODEL_LOAD_CHILD)
  onCustomModelChild_new(evt: Z64Online_ModelAllocation) {
    if (this.managerDisabled) return;
    let ref = this.allocationManager.registerModel(evt.model);
    if (evt.model.indexOf("UNIVERSAL_ALIAS_TABLE") === -1) {
      ref = this.allocationManager.registerModel(new UniversalAliasTable().createTable(evt.model, getManifestForForm(evt.age)));
    } else {
      ref = this.allocationManager.registerModel(evt.model);
    }
    if (evt.script !== undefined) {
      ref.script = evt.script;
    }
    evt.ref = ref;
    this.customModelFilesChild.set(evt.name + " (Child)", evt.ref);
  }

  @EventHandler(Z64OnlineEvents.LOAD_EQUIPMENT_BUFFER)
  onLoadEq(eq: Z64Online_EquipmentPak) {
    if (this.managerDisabled) return;
    let copy = this.ModLoader.utils.cloneBuffer(eq.data);
    let ref = this.allocationManager.registerModel(copy);
    ref = this.allocationManager.allocateModel(ref)!;
    this.allocationManager.getLocalPlayerData().equipment.set(CostumeHelper.getEquipmentCategory(copy), ref);
    if (eq.remove) {
      this.allocationManager.getLocalPlayerData().equipment.delete(CostumeHelper.getEquipmentCategory(copy));
    }
  }

  @EventHandler(Z64OnlineEvents.LOAD_EQUIPMENT_PAK)
  onLoadEQExternal(eq: Z64Online_EquipmentPak) {
    if (this.managerDisabled) return;
    this.customModelFilesEquipment.set(eq.name, eq.data);
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
        let alloc = new Z64Online_ModelAllocation(model, AgeOrForm.ADULT);
        this.allocationManager.getLocalPlayerData().additionalData.set(form, manifest.inject(this.ModLoader, rom, proxy, true, obj_id));
        this.ModLoader.utils.setTimeoutFrames(() => {
          bus.emit(Z64OnlineEvents.ALLOCATE_MODEL_BLOCK, alloc);
          alloc.ref.isPlayerModel = false;
          this.allocationManager.getLocalPlayerData().AgesOrForms.set(form, alloc.ref);
        }, 2);
      }
    } catch (err) {
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
    } catch (err) {
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
    this.allocationManager = new ModelAllocationManager(this.ModLoader);
    this.config = this.ModLoader.config.registerConfigCategory("OotO_WorldEvents") as Z64_EventConfig;
    this.ModLoader.config.setData("OotO_WorldEvents", "adultCostume", "");
    this.ModLoader.config.setData("OotO_WorldEvents", "childCostume", "");
    this.ModLoader.config.setData("OotO_WorldEvents", "disableCostumeManager", false);
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
    if (!this.lockManager) {
      this.onSceneChange(-1);
    }
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
    // Leave this here. We do this so people fucking with code don't decompress and recompress it a bunch of times.
    let code_file: Buffer = tools.getCodeFile(evt.rom);
    /**@todo Rewrite this shit after the world events module is ported. */
    bus.emit(Z64OnlineEvents.POST_LOADED_MODELS_LIST, { adult: this.customModelFilesAdult, child: this.customModelFilesChild, equipment: this.customModelFilesEquipment });
    this.ModLoader.logger.info('Starting custom model setup...');
    try {
      this.child.onRomPatched(evt);
    } catch (err) {
      this.ModLoader.logger.error(err);
      throw err;
    }

    this.proxySyncTick = this.ModLoader.utils.setIntervalFrames(() => {
      this.syncProxiedObject();
    }, 100);

    this.ModLoader.logger.info('Done.');
    this.ModLoader.utils.setTimeoutFrames(() => {
      this.ModLoader.clientSide.sendPacket(new Z64_GiveModelPacket(this.ModLoader.clientLobby, this.ModLoader.me));
    }, 100);
  }

  @NetworkHandler('Z64OnlineLib_AllocateModelPacket')
  onModelAllocate_client(packet: Z64_AllocateModelPacket) {
    this.ModLoader.utils.setTimeoutFrames(() => {
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
      });
    }, 1);
  }

  @NetworkHandler('Z64OnlineLib_EquipmentPakPacket')
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
  }

  @EventHandler(EventsClient.ON_PLAYER_LEAVE)
  onPlayerLeft(player: INetworkPlayer) {
    this.allocationManager.deletePlayer(player);
  }

  @NetworkHandler("Z64OnlineLib_GiveModelPacket")
  onPlayerJoin_client(packet: Z64_GiveModelPacket) {
    this.proxyNeedsSync = true;
  }

  @EventHandler(Z64OnlineEvents.PLAYER_PUPPET_PRESPAWN)
  onPuppetPreSpawn(puppet: Puppet_OOT) {
    /**@todo rewrite this shit after we uncrust the core. */
    let player = this.allocationManager.allocatePlayer(puppet.player, this.puppetModels)!;
    puppet.modelPointer = player.proxyPointer;
    player.playerIsSpawned = true;
    this.ModLoader.logger.debug(`Puppet ${puppet.id} prespawn clear`);
  }

  /**@todo Rewrite this entire function once MM is in. */
  private setPuppetModel(player: ModelPlayer, ref: IModelReference, modelAge: AgeOrForm, playerAge: AgeOrForm) {
    player.AgesOrForms.forEach((ref: IModelReference) => {
      ref.loadModel();
    });
    ref.loadModel();

    if (playerAge !== modelAge) return;
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
      this.setPuppetModel(player, player.AgesOrForms.get(puppet.ageOrForm)!, puppet.ageOrForm, this.AgeOrForm);
    } else {
      this.setPuppetModel(player, this.puppetModels.get(puppet.ageOrForm)!, puppet.ageOrForm, this.AgeOrForm);
    }
    if (this.mainConfig.diagnosticMode) {
      DumpRam();
    }
  }

  @EventHandler(Z64OnlineEvents.PLAYER_PUPPET_DESPAWNED)
  onPuppetDespawned(puppet: Puppet_OOT) {
    this.allocationManager.getPlayer(puppet.player)!.isDead = true;
  }

  @EventHandler(Z64OnlineEvents.PUPPET_AGE_CHANGED)
  onPuppetAgeChange(puppet: Puppet_OOT) {
    this.onPuppetSpawned(puppet);
  }

  private getEquipmentManifest(ref: IModelReference) {
    try {
      let rp = this.ModLoader.emulator.rdramReadBuffer(ref.pointer, this.allocationManager.getModelSize(ref));
      let eq = Buffer.from('45515549504D414E4946455354000000', 'hex');
      let index = rp.indexOf(eq);
      let str = "";
      let curByte: number = 0;
      let curIndex: number = index + 0x10;
      while (curByte !== 0xFF) {
        str += rp.slice(curIndex, curIndex + 1).toString();
        curByte = rp.slice(curIndex, curIndex + 1).readUInt8(0);
        curIndex++;
      }
      str = str.substr(0, str.length - 1);
      let data: EquipmentManifest = JSON.parse(str);
      let start = rp.indexOf(Buffer.from('4D4F444C4F414445523634', 'hex')) + 0x10;
      let cat = CostumeHelper.getEquipmentCategory(rp);
      return { manifest: data, model: rp, lut: start, cat };
    } catch (err) {
      this.ModLoader.logger.error(err.stack);
      return undefined;
    }
  }

  private dealWithEquipmentPaks(age: AgeOrForm) {
    bus.emit(Z64OnlineEvents.EQUIPMENT_LOAD_START, {});
    this.allocationManager.getLocalPlayerData().equipment.forEach((value: IModelReference) => {
      value.loadModel();
      /** TODO: Rewrite this shit. */
    });
    bus.emit(Z64OnlineEvents.EQUIPMENT_LOAD_END, {});
  }

  @EventHandler(Z64OnlineEvents.PUPPETS_CLEAR)
  onPuppetsClear(evt: any) {
    this.ModLoader.utils.setTimeoutFrames(() => {
      this.allocationManager.deallocateAllPlayers();
    }, 1);
  }

  @EventHandler(Z64.OotEvents.ON_SCENE_CHANGE)
  onSceneChange(scene: Scene) {
    this.child.onSceneChange(scene);
  }

  private handleModelChange(form: AgeOrForm, evt: Z64Online_ModelAllocation) {
    if (this.managerDisabled) return;
    if (evt.ref !== undefined) {
      if (this.allocationManager.getLocalPlayerData().AgesOrForms.get(form)!.hash === evt.ref.hash) return;
      this.allocationManager.SetLocalPlayerModel(form, evt.ref);
      this.onSceneChange(-1);
      this.proxyNeedsSync = true;
      if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
        let r2 = this.allocationManager.getLocalPlayerData().currentScript!.onTunicChanged(evt.ref, this.core.OOT!.link.tunic);
        if (r2.hash !== evt.ref.hash) {
          this.allocationManager.SetLocalPlayerModel(form, r2);
        }
      }
      return;
    }
    let copy = this.ModLoader.utils.cloneBuffer(evt.model);
    if (evt.model.byteLength === 1) {
      this.allocationManager.SetLocalPlayerModel(form, this.puppetModels.get(AgeOrForm.ADULT)!);
      this.onSceneChange(-1);
      evt.ref = this.puppetModels.get(form)!;
      this.proxyNeedsSync = true;
    } else {
      let model: IModelReference;
      if (copy.indexOf("UNIVERSAL_ALIAS_TABLE") === -1) {
        model = this.allocationManager.registerModel(new UniversalAliasTable().createTable(copy, getManifestForForm(form)))!;
      } else {
        model = this.allocationManager.registerModel(copy)!;
      }
      model.script = evt.script;
      this.allocationManager.SetLocalPlayerModel(form, model);
      this.onSceneChange(-1);
      evt.ref = model;
      this.proxyNeedsSync = true;
    }
  }

  @EventHandler(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_ADULT_GAMEPLAY)
  onChangeModel(evt: Z64Online_ModelAllocation) {
    this.handleModelChange(AgeOrForm.ADULT, evt);
  }

  @EventHandler(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_CHILD_GAMEPLAY)
  onChangeModelChild(evt: Z64Online_ModelAllocation) {
    this.handleModelChange(AgeOrForm.CHILD, evt);
  }

  @EventHandler(Z64OnlineEvents.REFRESH_EQUIPMENT)
  onRefresh() {
    if (this.managerDisabled) return;
    this.ModLoader.utils.setTimeoutFrames(() => {
      this.onSceneChange(-1);
      this.proxyNeedsSync = true;
    }, 1);
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
    let status = this.ModLoader.emulator.rdramRead8(link + 0x5016);
    if (status === 0) {
      this.ModLoader.logger.debug("Found Link proxy with no data. Injecting...");
      this.onSceneChange(-1);
    }
    if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
      this.allocationManager.getLocalPlayerData().currentScript!.onTick();
    }
  }

  @EventHandler(Z64.OotEvents.ON_DAY_TRANSITION)
  onDay() {
    if (this.managerDisabled) return;
    if (this.lockManager) return;
    if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
      let ref: IModelReference = this.allocationManager.getLocalPlayerData().AgesOrForms.get(this.AgeOrForm)!;
      let newRef = this.allocationManager.getLocalPlayerData().currentScript!.onDay(ref);
      this.ModLoader.utils.setTimeoutFrames(() => {
        let a = new Z64Online_ModelAllocation(Buffer.alloc(1), this.AgeOrForm);
        a.ref = newRef;
        if (this.AgeOrForm === AgeOrForm.ADULT) {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_ADULT_GAMEPLAY, a);
        } else {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_CHILD_GAMEPLAY, a);
        }
      }, 1);
    }
  }

  @EventHandler(Z64.OotEvents.ON_NIGHT_TRANSITION)
  onNight() {
    if (this.managerDisabled) return;
    if (this.lockManager) return;
    if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
      let ref: IModelReference = this.allocationManager.getLocalPlayerData().AgesOrForms.get(this.AgeOrForm)!;
      let newRef = this.allocationManager.getLocalPlayerData().currentScript!.onNight(ref);
      this.ModLoader.utils.setTimeoutFrames(() => {
        let a = new Z64Online_ModelAllocation(Buffer.alloc(1), this.AgeOrForm);
        a.ref = newRef;
        if (this.AgeOrForm === AgeOrForm.ADULT) {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_ADULT_GAMEPLAY, a);
        } else {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_CHILD_GAMEPLAY, a);
        }
      }, 1);
    }
  }

  @EventHandler(Z64.OotEvents.ON_HEALTH_CHANGE)
  onHealth(health: number) {
    if (this.managerDisabled) return;
    if (this.lockManager) return;
    if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
      let ref: IModelReference = this.allocationManager.getLocalPlayerData().AgesOrForms.get(this.AgeOrForm)!;
      let newRef = this.allocationManager.getLocalPlayerData().currentScript!.onHealthChanged(this.core.OOT!.save.heart_containers * 0x10, health, ref);
      this.ModLoader.utils.setTimeoutFrames(() => {
        let a = new Z64Online_ModelAllocation(Buffer.alloc(1), this.AgeOrForm);
        a.ref = newRef;
        if (this.AgeOrForm === AgeOrForm.ADULT) {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_ADULT_GAMEPLAY, a);
        } else {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_CHILD_GAMEPLAY, a);
        }
      }, 1);
    }
  }

  @EventHandler(Z64.OotEvents.ON_TUNIC_CHANGE)
  onTunic(tunic: Tunic) {
    if (this.managerDisabled) return;
    if (this.lockManager) return;
    if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
      let ref: IModelReference = this.allocationManager.getLocalPlayerData().AgesOrForms.get(this.AgeOrForm)!;
      let newRef = this.allocationManager.getLocalPlayerData().currentScript!.onTunicChanged(ref, tunic);
      this.ModLoader.utils.setTimeoutFrames(() => {
        let a = new Z64Online_ModelAllocation(Buffer.alloc(1), this.AgeOrForm);
        a.ref = newRef;
        if (this.AgeOrForm === AgeOrForm.ADULT) {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_ADULT_GAMEPLAY, a);
        } else {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_CHILD_GAMEPLAY, a);
        }
      }, 1);
    }
  }
}