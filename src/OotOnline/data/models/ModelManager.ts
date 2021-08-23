import { DumpRam, IModelReference, Z64OnlineEvents, Z64Online_EquipmentPak, Z64Online_LocalModelChangeProcessEvt, Z64Online_ModelAllocation } from '@OotOnline/common/api/Z64API';
import { CDNClient } from '@OotOnline/common/cdn/CDNClient';
import { getManifestForForm, UniversalAliasTable } from '@OotOnline/common/cosmetics/UniversalAliasTable';
import { CostumeHelper } from '@OotOnline/common/events/CostumeHelper';
import { Z64_ADULT_ZOBJ_DMA, Z64_CHILD_ZOBJ_DMA, Z64_GAME, Z64_IS_RANDOMIZER, Z64_MANIFEST } from '@OotOnline/common/types/GameAliases';
import { OOT_GAME } from '@OotOnline/common/types/OotAliases';
import { AgeOrForm, Manifest } from '@OotOnline/common/types/Types';
import { OotOnlineConfigCategory } from '@OotOnline/OotOnline';
import { Z64_EventConfig } from "@OotOnline/WorldEvents/Z64_EventConfig";
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
import { Age, IOOTCore, OotEvents, Scene, Tunic } from 'modloader64_api/OOT/OOTAPI';
import { onTick, Preinit } from 'modloader64_api/PluginLifecycle';
import path from 'path';
import { Z64RomTools } from 'Z64Lib/API/Z64RomTools';
import { EquipmentManifest } from '../../common/cosmetics/EquipmentManifest';
import { ModelAllocationManager } from '../../common/cosmetics/ModelAllocationManager';
import { ModelReference } from '../../common/cosmetics/ModelContainer';
import { OotOnlineStorageClient } from '../../OotOnlineStorageClient';
import { OOTO_PRIVATE_EVENTS } from '../InternalAPI';
import { Puppet } from '../linkPuppet/Puppet';
import { Z64_AllocateModelPacket, Z64_EquipmentPakPacket, Z64_GiveModelPacket } from '../OotOPackets';
import { ModelPlayer } from './ModelPlayer';

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
  lockManager: boolean = false;
  managerDisabled: boolean = false;
  mainConfig!: OotOnlineConfigCategory;

  constructor() {
    fs.copyFileSync(path.join(__dirname, "zobjs/OOT", "adult.zobj"), path.join(this.cacheDir, "adult.zobj"));
    fs.copyFileSync(path.join(__dirname, "zobjs/OOT", "child.zobj"), path.join(this.cacheDir, "child.zobj"));
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

  private loadFormProxy(rom: Buffer, form: AgeOrForm, defaultPath: string, proxyPath: string, manifest: Manifest, obj_id: number) {
    try {
      if (this.managerDisabled) return;
      let model: Buffer = new UniversalAliasTable().createTable(fs.readFileSync(defaultPath), getManifestForForm(form), true);
      CDNClient.singleton.registerWithCache(model);
      let proxy = new UniversalAliasTable().createTable(fs.readFileSync(proxyPath), getManifestForForm(form));
      if (this.ALREADY_REPOINTED || manifest.repoint(this.ModLoader, rom, proxy)) {
        this.ALREADY_REPOINTED = true;
        this.ModLoader.logger.info("Setting up zobj proxy.");
        let alloc = new Z64Online_ModelAllocation(model, Age.ADULT);
        this.allocationManager.getLocalPlayerData().additionalData.set(form, manifest.inject(this.ModLoader, rom, proxy, true, obj_id));
        this.ModLoader.utils.setTimeoutFrames(() => {
          bus.emit(Z64OnlineEvents.ALLOCATE_MODEL_BLOCK, alloc);
          this.allocationManager.getLocalPlayerData().AgesOrForms.set(form, alloc.ref);
        }, 2);
      }
    } catch (err) {
      this.ModLoader.logger.error(err.stack);
    }
  }

  loadAdultModelOOT(evt: any) {
    this.loadFormProxy(evt.rom, Age.ADULT, path.join(this.cacheDir, "adult.zobj"), path.resolve(__dirname, "zobjs", "OOT", "proxy_universal.zobj"), Z64_MANIFEST, 0x0015);
  }

  loadChildModelOOT(evt: any) {
    this.loadFormProxy(evt.rom, Age.CHILD, path.join(this.cacheDir, "child.zobj"), path.resolve(__dirname, "zobjs", "OOT", "proxy_universal.zobj"), Z64_MANIFEST, 0x0014);
  }

  private registerDefaultModel(form: AgeOrForm, zobj: string) {
    this.puppetModels.set(form, this.allocationManager.registerModel(new UniversalAliasTable().createTable(fs.readFileSync(zobj), getManifestForForm(form), true)));
    this.puppetModels.get(form)!.isPlayerModel = false;
  }

  setupPuppetModels(evt: any) {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir);
    }
    this.ModLoader.logger.info("Setting up puppet models...");

    this.ModLoader.utils.setTimeoutFrames(() => {
      if (Z64_GAME === OOT_GAME) {
        this.registerDefaultModel(AgeOrForm.ADULT, path.resolve(__dirname, "zobjs", "OOT", "adult.zobj"));
        this.registerDefaultModel(AgeOrForm.CHILD, path.resolve(__dirname, "zobjs", "OOT", "child.zobj"));
        this.allocationManager.SetLocalPlayerModel(AgeOrForm.ADULT, this.puppetModels.get(AgeOrForm.ADULT)!);
        this.allocationManager.SetLocalPlayerModel(AgeOrForm.CHILD, this.puppetModels.get(AgeOrForm.CHILD)!);
      }
      /**@todo add mm */
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
                this.ModLoader.clientSide.sendPacket(new Z64_AllocateModelPacket(form, this.ModLoader.clientLobby, ref.hash, this.core.OOT!.save.age));
              }
            });
          } else {
            this.ModLoader.clientSide.sendPacket(new Z64_AllocateModelPacket(form, this.ModLoader.clientLobby, ref.hash, this.core.OOT!.save.age));
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
                  let p = new Z64_EquipmentPakPacket(this.core.OOT!.save.age, this.ModLoader.clientLobby);
                  p.ids = this.clientStorage.equipmentHashes;
                  this.ModLoader.clientSide.sendPacket(p);
                }
              });
            } else {
              let p = new Z64_EquipmentPakPacket(this.core.OOT!.save.age, this.ModLoader.clientLobby);
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

  @PrivateEventHandler(OOTO_PRIVATE_EVENTS.TOGGLE_COSTUME_LOCK)
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
    if (Z64_GAME === OOT_GAME) {
      this.loadAdultModelOOT(evt);
      this.loadChildModelOOT(evt);
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
  onPuppetPreSpawn(puppet: Puppet) {
    /**@todo rewrite this shit after we uncrust the core. */
    let player = this.allocationManager.allocatePlayer(puppet.player, this.puppetModels)!;
    puppet.modelPointer = player.AgesOrForms.get(puppet.age)!.pointer;
    player.playerIsSpawned = true;
  }

  /**@todo Rewrite this entire function once MM is in. */
  private setPuppetModel(player: ModelPlayer, ref: IModelReference, modelAge: AgeOrForm, playerAge: AgeOrForm) {
    player.AgesOrForms.forEach((ref: IModelReference) => {
      ref.loadModel();
    });
    ref.loadModel();

    if (playerAge !== modelAge) return;
    
    if (this.mainConfig.diagnosticMode) {
      DumpRam();
    }
  }

  @EventHandler(Z64OnlineEvents.PLAYER_PUPPET_SPAWNED)
  onPuppetSpawned(puppet: Puppet) {
    let player = this.allocationManager.allocatePlayer(puppet.player, this.puppetModels)!;
    this.ModLoader.emulator.rdramWrite32(player.proxyPointer + 0x58C, puppet.data.pointer);
    if (player.AgesOrForms.has(puppet.age)) {
      this.setPuppetModel(player, player.AgesOrForms.get(puppet.age)!, puppet.age, this.core.OOT!.save.age);
    } else {
      this.setPuppetModel(player, this.puppetModels.get(puppet.age)!, puppet.age, this.core.OOT!.save.age);
    }
    if (this.mainConfig.diagnosticMode) {
      DumpRam();
    }
  }

  @EventHandler(Z64OnlineEvents.PLAYER_PUPPET_DESPAWNED)
  onPuppetDespawned(puppet: Puppet) {
    this.allocationManager.getPlayer(puppet.player)!.isDead = true;
    console.log(puppet.player.nickname + " dead");
  }

  @EventHandler(Z64OnlineEvents.PUPPET_AGE_CHANGED)
  onPuppetAgeChange(puppet: Puppet) {
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

  @EventHandler(OotEvents.ON_SCENE_CHANGE)
  onSceneChange(scene: Scene) {
    if (this.managerDisabled) return;
    if (this.lockManager) return;
    this.allocationManager.getLocalPlayerData().AgesOrForms.forEach((ref: IModelReference) => {
      ref.loadModel();
    });
    let curRef: IModelReference | undefined;
    let link = this.doesLinkObjExist(this.core.save.age);
    if (link.exists) {
      this.allocationManager.SetLocalPlayerModel(this.core.save.age, this.allocationManager.getLocalPlayerData().AgesOrForms.get(this.core.save.age)!);
      let copy = this.ModLoader.emulator.rdramReadBuffer(this.allocationManager.getLocalPlayerData().AgesOrForms.get(this.core.save.age)!.pointer, 0x6FB0);
      this.ModLoader.emulator.rdramWriteBuffer(link.pointer, copy);
      this.ModLoader.emulator.rdramWrite8(link.pointer + 0x5016, 0x1);
      curRef = this.allocationManager.getLocalPlayerData().AgesOrForms.get(this.core.save.age)!;
    }
    if (scene > -1 && this.allocationManager.getLocalPlayerData().currentScript !== undefined && curRef !== undefined) {
      let newRef = this.allocationManager.getLocalPlayerData().currentScript!.onSceneChange(scene, curRef)
      this.ModLoader.utils.setTimeoutFrames(() => {
        let a = new Z64Online_ModelAllocation(Buffer.alloc(1), this.core.OOT!.save.age);
        a.ref = newRef;
        if (this.core.OOT!.save.age === AgeOrForm.ADULT) {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_ADULT_GAMEPLAY, a);
        } else {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_CHILD_GAMEPLAY, a);
        }
      }, 1);
    }
    bus.emit(Z64OnlineEvents.LOCAL_MODEL_CHANGE_FINISHED, new Z64Online_LocalModelChangeProcessEvt(this.allocationManager.getLocalPlayerData().AgesOrForms.get(AgeOrForm.ADULT)!, this.allocationManager.getLocalPlayerData().AgesOrForms.get(AgeOrForm.CHILD)!));

    if (this.mainConfig.diagnosticMode) {
      DumpRam();
    }
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

  doesLinkObjExist(age: AgeOrForm) {
    let link_object_pointer: number = 0;
    let obj_list: number = 0x801D9C44;
    let obj_id = age === AgeOrForm.ADULT ? 0x00140000 : 0x00150000;
    for (let i = 4; i < 0x514; i += 4) {
      let value = this.ModLoader.emulator.rdramRead32(obj_list + i);
      if (value === obj_id) {
        link_object_pointer = obj_list + i + 4;
        break;
      }
    }
    if (link_object_pointer === 0) return { exists: false, pointer: 0 };
    link_object_pointer = this.ModLoader.emulator.rdramRead32(link_object_pointer);
    return { exists: this.ModLoader.emulator.rdramReadBuffer(link_object_pointer + 0x5000, 0xB).toString() === "MODLOADER64", pointer: link_object_pointer };
  }

  findLink() {
    let index = this.ModLoader.emulator.rdramRead8(global.ModLoader['link_instance'] + 0x1E);
    let obj_list: number = 0x801D9C44;
    obj_list += 0xC;
    let offset = index * 0x44;
    obj_list += offset;
    obj_list += 0x4;
    let pointer = this.ModLoader.emulator.rdramRead32(obj_list);
    return pointer;
  }

  findGameplayKeep() {
    let obj_list: number = 0x801D9C44;
    let obj_id = 0x00010000;
    for (let i = 4; i < 0x514; i += 4) {
      let value = this.ModLoader.emulator.rdramRead32(obj_list + i);
      if (value === obj_id) {
        return this.ModLoader.emulator.rdramRead32(obj_list + i + 4);
      }
    }
    return -1;
  }

  @onTick()
  onTick() {
    if (this.managerDisabled) return;
    if (this.lockManager) return;
    if (this.core.helper.isPaused()) return;
    if (this.core.helper.Player_InBlockingCsMode() || this.core.helper.isLinkEnteringLoadingZone()) return;
    let link = this.findLink();
    let status = this.ModLoader.emulator.rdramRead8(link + 0x5016);
    if (status === 0){
      this.ModLoader.logger.debug("Found Link proxy with no data. Injecting...");
      this.onSceneChange(-1);
    }
    if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
      this.allocationManager.getLocalPlayerData().currentScript!.onTick();
    }
  }

  @EventHandler(OotEvents.ON_DAY_TRANSITION)
  onDay() {
    if (this.managerDisabled) return;
    if (this.lockManager) return;
    if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
      let ref: IModelReference = this.allocationManager.getLocalPlayerData().AgesOrForms.get(this.core.OOT!.save.age)!;
      let newRef = this.allocationManager.getLocalPlayerData().currentScript!.onDay(ref);
      this.ModLoader.utils.setTimeoutFrames(() => {
        let a = new Z64Online_ModelAllocation(Buffer.alloc(1), this.core.OOT!.save.age);
        a.ref = newRef;
        if (this.core.OOT!.save.age === AgeOrForm.ADULT) {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_ADULT_GAMEPLAY, a);
        } else {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_CHILD_GAMEPLAY, a);
        }
      }, 1);
    }
  }

  @EventHandler(OotEvents.ON_NIGHT_TRANSITION)
  onNight() {
    if (this.managerDisabled) return;
    if (this.lockManager) return;
    if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
      let ref: IModelReference = this.allocationManager.getLocalPlayerData().AgesOrForms.get(this.core.OOT!.save.age)!;
      let newRef = this.allocationManager.getLocalPlayerData().currentScript!.onNight(ref);
      this.ModLoader.utils.setTimeoutFrames(() => {
        let a = new Z64Online_ModelAllocation(Buffer.alloc(1), this.core.OOT!.save.age);
        a.ref = newRef;
        if (this.core.OOT!.save.age === AgeOrForm.ADULT) {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_ADULT_GAMEPLAY, a);
        } else {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_CHILD_GAMEPLAY, a);
        }
      }, 1);
    }
  }

  @EventHandler(OotEvents.ON_HEALTH_CHANGE)
  onHealth(health: number) {
    if (this.managerDisabled) return;
    if (this.lockManager) return;
    if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
      let ref: IModelReference = this.allocationManager.getLocalPlayerData().AgesOrForms.get(this.core.OOT!.save.age)!;
      let newRef = this.allocationManager.getLocalPlayerData().currentScript!.onHealthChanged(this.core.OOT!.save.heart_containers * 0x10, health, ref);
      this.ModLoader.utils.setTimeoutFrames(() => {
        let a = new Z64Online_ModelAllocation(Buffer.alloc(1), this.core.OOT!.save.age);
        a.ref = newRef;
        if (this.core.OOT!.save.age === AgeOrForm.ADULT) {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_ADULT_GAMEPLAY, a);
        } else {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_CHILD_GAMEPLAY, a);
        }
      }, 1);
    }
  }

  @EventHandler(OotEvents.ON_TUNIC_CHANGE)
  onTunic(tunic: Tunic) {
    if (this.managerDisabled) return;
    if (this.lockManager) return;
    if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
      let ref: IModelReference = this.allocationManager.getLocalPlayerData().AgesOrForms.get(this.core.OOT!.save.age)!;
      let newRef = this.allocationManager.getLocalPlayerData().currentScript!.onTunicChanged(ref, tunic);
      this.ModLoader.utils.setTimeoutFrames(() => {
        let a = new Z64Online_ModelAllocation(Buffer.alloc(1), this.core.OOT!.save.age);
        a.ref = newRef;
        if (this.core.OOT!.save.age === AgeOrForm.ADULT) {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_ADULT_GAMEPLAY, a);
        } else {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_CHILD_GAMEPLAY, a);
        }
      }, 1);
    }
  }
}