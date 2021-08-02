import {
  IModLoaderAPI,
  ModLoaderEvents,
} from 'modloader64_api/IModLoaderAPI';
import {
  bus,
  EventHandler,
  EventsClient,
  PrivateEventHandler
} from 'modloader64_api/EventHandler';
import { OotOnlineStorageClient } from '../../OotOnlineStorageClient';
import { Age, OotEvents, IOOTCore, IOvlPayloadResult, Tunic, Scene } from 'modloader64_api/OOT/OOTAPI';
import {
  INetworkPlayer,
  NetworkHandler,
} from 'modloader64_api/NetworkHandler';
import { ModelPlayer } from './ModelPlayer';
import { ModelAllocationManager } from '../../common/cosmetics/ModelAllocationManager';
import { Puppet } from '../linkPuppet/Puppet';
import fs from 'fs';
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import path from 'path';
import { ModelReference } from '../../common/cosmetics/ModelContainer';
import { trimBuffer, Z64RomTools } from 'Z64Lib/API/Z64RomTools';
import { InjectCore } from 'modloader64_api/CoreInjection';
import { onTick, Preinit } from 'modloader64_api/PluginLifecycle';
import { Z64_EventConfig } from "@OotOnline/WorldEvents/Z64_EventConfig";
import * as f3djs from 'f3djs';
import { EqManifestToOffsetMap_Link, EqManifestToOffsetMap_Puppet, PuppetProxyGen_Adult, PuppetProxyGen_Child, PuppetProxyGen_Matrix, PuppetProxyGen_Matrix_Keys } from './PuppetProxyGen';
import { CostumeHelper } from '@OotOnline/common/events/CostumeHelper';
import { EquipmentManifest } from '../../common/cosmetics/EquipmentManifest';
import { Z64_AllocateModelPacket, Z64_EquipmentPakPacket, Z64_GiveModelPacket } from '../OotOPackets';
import { IModelReference, Z64OnlineEvents, Z64Online_ModelAllocation, Z64Online_EquipmentPak, Z64Online_LocalModelChangeProcessEvt, DumpRam } from '@OotOnline/common/api/Z64API';
import { OotOnlineConfigCategory } from '@OotOnline/OotOnline';
import { OOTO_PRIVATE_EVENTS } from '../InternalAPI';
import { CDNClient } from '@OotOnline/common/cdn/CDNClient';
import { Z64_ADULT_MANIFEST, Z64_ADULT_ZOBJ_DMA, Z64_CHILD_MANIFEST, Z64_CHILD_ZOBJ_DMA, Z64_GAME, Z64_IS_RANDOMIZER, Z64_TITLE_SCREEN_FORM } from '@OotOnline/common/types/GameAliases';
import { AgeorForm, Manifest } from '@OotOnline/common/types/Types';
import { OOT_GAME } from '@OotOnline/common/types/OotAliases';

export class ModelManagerClient {
  @ModLoaderAPIInject()
  ModLoader!: IModLoaderAPI;
  @InjectCore()
  core!: IOOTCore;
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
  puppetModels: Map<AgeorForm, IModelReference> = new Map<AgeorForm, IModelReference>();
  titleScreenFix: any;
  lockManager: boolean = false;
  managerDisabled: boolean = false;
  mainConfig!: OotOnlineConfigCategory;

  @EventHandler(Z64OnlineEvents.CUSTOM_MODEL_LOAD_ADULT)
  onCustomModelAdult_new(evt: Z64Online_ModelAllocation) {
    if (this.managerDisabled) return;
    let ref = this.allocationManager.registerModel(evt.model);
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

  @EventHandler(Z64OnlineEvents.FORCE_LOAD_MODEL_BLOCK)
  onForceLoad(slot: number) {
    if (this.managerDisabled) return;
    this.ModLoader.logger.warn("Z64OnlineEvents.FORCE_LOAD_MODEL_BLOCK is deprecated. Please stop using this event.");
  }

  private loadFormProxy(rom: Buffer, form: AgeorForm, defaultPath: string, proxyPath: string, manifest: Manifest) {
    try{
      if (this.managerDisabled) return;
      let model: Buffer = fs.readFileSync(defaultPath);
      CDNClient.singleton.registerWithCache(model);
      if (manifest.repoint(this.ModLoader, rom, model)) {
        this.ModLoader.logger.info("Setting up zobj proxy.");
        let proxy = trimBuffer(fs.readFileSync(proxyPath));
        let alloc = new Z64Online_ModelAllocation(model, Age.ADULT);
        this.allocationManager.getLocalPlayerData().additionalData.set(form.toString(16), manifest.inject(this.ModLoader, rom, proxy, true));
        this.ModLoader.utils.setTimeoutFrames(() => {
          bus.emit(Z64OnlineEvents.ALLOCATE_MODEL_BLOCK, alloc);
          this.allocationManager.getLocalPlayerData().AgesOrForms.set(form, alloc.ref);
        }, 2);
      }
    }catch(err){
      this.ModLoader.logger.error(err.stack);
    }
  }

  loadAdultModelOOT(evt: any) {
    this.loadFormProxy(evt.rom, Age.ADULT, path.join(this.cacheDir, "adult.zobj"), path.resolve(__dirname, "zobjs", "OOT", "proxy_adult.zobj"), Z64_ADULT_MANIFEST);
  }

  loadChildModelOOT(evt: any) {
    this.loadFormProxy(evt.rom, Age.CHILD, path.join(this.cacheDir, "child.zobj"), path.resolve(__dirname, "zobjs", "OOT", "proxy_child.zobj"), Z64_CHILD_MANIFEST);
  }

  private registerDefaultModel(form: AgeorForm, zobj: string) {
    this.puppetModels.set(form, this.allocationManager.registerModel(fs.readFileSync(zobj)));
    this.puppetModels.get(form)!.isPlayerModel = false;
  }

  setupPuppetModels(evt: any) {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir);
    }
    this.ModLoader.logger.info("Setting up puppet models...");

    this.ModLoader.utils.setTimeoutFrames(() => {
      if (Z64_GAME === OOT_GAME) {
        this.registerDefaultModel(Age.ADULT, path.resolve(__dirname, "zobjs", "OOT", "adult.zobj"));
        this.registerDefaultModel(Age.CHILD, path.resolve(__dirname, "zobjs", "OOT", "child.zobj"));
        this.allocationManager.SetLocalPlayerModel(Age.ADULT, this.puppetModels.get(Age.ADULT)!);
        this.allocationManager.SetLocalPlayerModel(Age.CHILD, this.puppetModels.get(Age.CHILD)!);
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
      this.allocationManager.getLocalPlayerData().AgesOrForms.forEach((ref: IModelReference, form: AgeorForm) => {
        CDNClient.singleton.askCDN(this.allocationManager.getModel(ref).zobj).then((has: boolean) => {
          if (!has) {
            CDNClient.singleton.uploadFile(ref.hash, this.allocationManager.getModel(ref).zobj).then((done: boolean) => {
              if (done) {
                this.ModLoader.clientSide.sendPacket(new Z64_AllocateModelPacket(form, this.ModLoader.clientLobby, ref.hash, this.core.save.age));
              }
            });
          } else {
            this.ModLoader.clientSide.sendPacket(new Z64_AllocateModelPacket(form, this.ModLoader.clientLobby, ref.hash, this.core.save.age));
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
                  let p = new Z64_EquipmentPakPacket(this.core.save.age, this.ModLoader.clientLobby);
                  p.ids = this.clientStorage.equipmentHashes;
                  this.ModLoader.clientSide.sendPacket(p);
                }
              });
            } else {
              let p = new Z64_EquipmentPakPacket(this.core.save.age, this.ModLoader.clientLobby);
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

  private startTitleScreenCheck() {
    if (this.managerDisabled) return;
    if (this.titleScreenFix) return;
    this.titleScreenFix = this.ModLoader.utils.setIntervalFrames(() => {
      if (this.doesLinkObjExist(Z64_TITLE_SCREEN_FORM).exists) {
        this.onSceneChange(-1);
        this.ModLoader.utils.clearIntervalFrames(this.titleScreenFix);
        this.titleScreenFix = undefined;
        bus.emit(Z64OnlineEvents.ON_MODEL_MANAGER_READY, {});
        this.ModLoader.privateBus.emit(OOTO_PRIVATE_EVENTS.TOGGLE_COSTUME_LOCK, {});
      }
    }, 1);
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
    console.log({ adult: this.customModelFilesAdult, child: this.customModelFilesChild, equipment: this.customModelFilesEquipment });
    bus.emit(Z64OnlineEvents.POST_LOADED_MODELS_LIST, { adult: this.customModelFilesAdult, child: this.customModelFilesChild, equipment: this.customModelFilesEquipment });
    this.ModLoader.logger.info('Starting custom model setup...');
    if (Z64_GAME === OOT_GAME) {
      this.loadAdultModelOOT(evt);
      this.loadChildModelOOT(evt);
    }

    this.startTitleScreenCheck();
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
    let param_pointer = (this.clientStorage.overlayCache["puppet.ovl"] as IOvlPayloadResult).params;
    let player = this.allocationManager.allocatePlayer(puppet.player, this.puppetModels)!;
    this.ModLoader.emulator.rdramWrite32(param_pointer + 0x8, player.proxyPointer);
    this.ModLoader.emulator.rdramWrite16(param_pointer + 0xE, puppet.age);
    player.playerIsSpawned = true;
  }

  /**@todo Rewrite this entire function once MM is in. */
  private setPuppetModel(player: ModelPlayer, ref: IModelReference, modelAge: AgeorForm, playerAge: AgeorForm) {
    player.AgesOrForms.forEach((ref: IModelReference) => {
      ref.loadModel();
    });
    ref.loadModel();

    if (playerAge !== modelAge) return;

    this.ModLoader.emulator.rdramWriteBuffer(player.proxyPointer, this.ModLoader.emulator.rdramReadBuffer(ref.pointer + 0x5000, 0x3C0));
    let skeleton = this.ModLoader.emulator.rdramReadPtr32(ref.pointer + 0x500C, 0) - 0x150;
    let buf = this.ModLoader.emulator.rdramReadBuffer(skeleton, 0x1B0);
    this.ModLoader.emulator.rdramWriteBuffer(player.proxyPointer + 0x3D0, buf);
    this.ModLoader.emulator.rdramWrite32(player.proxyPointer + 0x580, ref.pointer);
    this.ModLoader.emulator.rdramWrite32(player.proxyPointer + 0x584, ref.pointer + 0x4000);

    // Support for mismatched age equips.
    let fn = function (__ref: IModelReference, obj: any, ModLoader: IModLoaderAPI) {
      Object.keys(obj).forEach((key: string) => {
        let dest: number = parseInt(key);
        if (typeof (obj[key]) === 'string') {
          let src: number = parseInt(obj[key]);
          ModLoader.emulator.rdramWriteBuffer(player.proxyPointer + dest, ModLoader.utils.cloneBuffer(f3djs.gsSPBranchList(__ref.pointer + src)));
        } else if (Buffer.isBuffer(obj[key])) {
          ModLoader.emulator.rdramWriteBuffer(player.proxyPointer + dest, obj[key]);
        } else if (Array.isArray(obj[key])) {
          ModLoader.emulator.rdramWriteBuffer(player.proxyPointer + dest, ModLoader.emulator.rdramReadBuffer(__ref.pointer + obj[key][0], obj[key][1]));
        }
      });
    };
    let fn2 = (__ref: IModelReference, obj: any) => {
      Object.keys(obj).forEach((key: string) => {
        let src: number = parseInt(obj[key]);
        let data: Buffer = this.ModLoader.emulator.rdramReadBuffer(__ref.pointer + src, 0x40);
        this.ModLoader.emulator.rdramWriteBuffer(player.proxyPointer + parseInt(key), data);
      });
    };

    let adult_generator_table = JSON.parse(JSON.stringify(PuppetProxyGen_Adult));
    let child_generator_table = JSON.parse(JSON.stringify(PuppetProxyGen_Child));

    if (modelAge === Age.ADULT) {
      fn2(player.AgesOrForms.get(Age.ADULT)!, PuppetProxyGen_Matrix);
    } else if (modelAge === Age.CHILD) {
      fn2(player.AgesOrForms.get(Age.CHILD)!, PuppetProxyGen_Matrix);
    }

    player.equipment.forEach((value: IModelReference) => {
      let man = this.getEquipmentManifest(value);
      if (man === undefined) return;
      Object.keys(man.manifest.OOT.child).forEach((key: string) => {
        // This check isn't really needed but TSC says its a compile error.
        if (man === undefined) return;
        let i = man.lut + (parseInt(key) * 0x8);
        if (PuppetProxyGen_Matrix_Keys.indexOf(key) > -1) {
          /** @TODO Do this better. */
          if (key === PuppetProxyGen_Matrix_Keys[0]) {
            fn2(value, { "0x6F0": `0x${this.ModLoader.emulator.rdramReadPtr32(value.pointer + i, 4).toString(16)}` });
          } else if (key === PuppetProxyGen_Matrix_Keys[1]) {
            fn2(value, { "0x730": `0x${this.ModLoader.emulator.rdramReadPtr32(value.pointer + i, 4).toString(16)}` });
          }
        } else {
          child_generator_table[EqManifestToOffsetMap_Puppet[man.manifest.OOT.child[key]]] = this.ModLoader.utils.cloneBuffer(f3djs.gsSPBranchList(value.pointer + i));
        }
      });

      Object.keys(man.manifest.OOT.adult).forEach((key: string) => {
        // Same with this one.
        if (man === undefined) return;
        let i = man.lut + (parseInt(key) * 0x8);
        adult_generator_table[EqManifestToOffsetMap_Puppet[man.manifest.OOT.adult[key]]] = this.ModLoader.utils.cloneBuffer(f3djs.gsSPBranchList(value.pointer + i));
      });
    });

    fn(player.AgesOrForms.get(Age.ADULT)!, adult_generator_table, this.ModLoader);
    fn(player.AgesOrForms.get(Age.CHILD)!, child_generator_table, this.ModLoader);
    if (this.mainConfig.diagnosticMode) {
      DumpRam();
    }
  }

  @EventHandler(Z64OnlineEvents.PLAYER_PUPPET_SPAWNED)
  onPuppetSpawned(puppet: Puppet) {
    let player = this.allocationManager.allocatePlayer(puppet.player, this.puppetModels)!;
    this.ModLoader.emulator.rdramWrite32(player.proxyPointer + 0x58C, puppet.data.pointer);
    if (player.AgesOrForms.has(puppet.age)) {
      this.setPuppetModel(player, player.AgesOrForms.get(puppet.age)!, puppet.age, this.core.save.age);
    } else {
      this.setPuppetModel(player, this.puppetModels.get(puppet.age)!, puppet.age, this.core.save.age);
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

  private hat_hook() {
    let proxy = this.doesLinkObjExist(this.core.save.age);
    if (proxy.exists) {
      let find = this.ModLoader.emulator.rdramRead32(proxy.pointer + 0x5380);
      find -= 0x06000000;
      find += proxy.pointer;
      find -= 0x150;
      find += 0xA8;
      this.ModLoader.emulator.rdramWrite32(find, 0x060053A0);
      this.ModLoader.emulator.rdramWrite32(find + 0x4, 0x060053A0);
    }
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

  private dealWithEquipmentPaks(age: Age) {
    bus.emit(Z64OnlineEvents.EQUIPMENT_LOAD_START, {});
    this.allocationManager.getLocalPlayerData().equipment.forEach((value: IModelReference) => {
      value.loadModel();
      let data = this.getEquipmentManifest(value);
      if (data === undefined) return;
      let table: any = {};
      let player = new ModelPlayer("TEMP");
      if (Z64_GAME === OOT_GAME) {
        if (age === Age.ADULT) {
          table = data.manifest.OOT.adult;
          let link = this.doesLinkObjExist(Age.ADULT);
          player.proxyPointer = link.pointer;
        } else if (age === Age.CHILD) {
          table = data.manifest.OOT.child;
          let link = this.doesLinkObjExist(Age.CHILD);
          player.proxyPointer = link.pointer;
        }
      }
      Object.keys(table).forEach((key: string) => {
        if (data === undefined) return;
        let i = data.lut + (parseInt(key) * 0x8) + 0x4;
        let offset = parseInt(EqManifestToOffsetMap_Link[table[key]]) + 0x4;
        this.ModLoader.emulator.rdramWrite32(player.proxyPointer + offset, data.model.readUInt32BE(i));
      });
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
    this.allocationManager.getLocalPlayerData().AgesOrForms.forEach((ref: IModelReference)=>{
      ref.loadModel();
    });
    let curRef: IModelReference | undefined;
    if (this.core.save.age === Age.ADULT) {
      let link = this.doesLinkObjExist(Age.ADULT);
      if (link.exists) {
        this.allocationManager.SetLocalPlayerModel(Age.ADULT, this.allocationManager.getLocalPlayerData().AgesOrForms.get(Age.ADULT)!);
        this.ModLoader.emulator.rdramWriteBuffer(link.pointer, this.ModLoader.emulator.rdramReadBuffer(this.allocationManager.getLocalPlayerData().AgesOrForms.get(Age.ADULT)!.pointer, 0x5380));
        let p = this.ModLoader.emulator.rdramRead32(this.allocationManager.getLocalPlayerData().AgesOrForms.get(Age.ADULT)!.pointer + 0x5380) - 0x150;
        let buf = this.ModLoader.emulator.rdramReadBuffer(p, 0x150);
        this.ModLoader.emulator.rdramWriteBuffer(link.pointer + 0xEC60 - 0x150, buf);
        this.dealWithEquipmentPaks(Age.ADULT);
        //this.hat_hook();
        this.ModLoader.rom.romWriteBuffer(this.allocationManager.getLocalPlayerData().additionalData.get(Age.ADULT.toString(16))!, this.ModLoader.emulator.rdramReadBuffer(link.pointer, 0x37800));
        curRef = this.allocationManager.getLocalPlayerData().AgesOrForms.get(Age.ADULT)!;
      }
    } else {
      let link = this.doesLinkObjExist(Age.CHILD);
      if (link.exists) {
        this.allocationManager.SetLocalPlayerModel(Age.CHILD, this.allocationManager.getLocalPlayerData().AgesOrForms.get(Age.CHILD)!);
        this.ModLoader.emulator.rdramWriteBuffer(link.pointer, this.ModLoader.emulator.rdramReadBuffer(this.allocationManager.getLocalPlayerData().AgesOrForms.get(Age.CHILD)!.pointer, 0x53A8));
        let p = this.ModLoader.emulator.rdramRead32(this.allocationManager.getLocalPlayerData().AgesOrForms.get(Age.CHILD)!.pointer + 0x53A8) - 0x150;
        let buf = this.ModLoader.emulator.rdramReadBuffer(p, 0x1B0);
        this.ModLoader.emulator.rdramWriteBuffer(link.pointer + 0xEC60 - 0x150, buf);
        this.dealWithEquipmentPaks(Age.CHILD);
        this.ModLoader.rom.romWriteBuffer(this.allocationManager.getLocalPlayerData().additionalData.get(Age.CHILD.toString(16))!, this.ModLoader.emulator.rdramReadBuffer(link.pointer, 0x22380));
        curRef = this.allocationManager.getLocalPlayerData().AgesOrForms.get(Age.CHILD)!;
      }
      this.ModLoader.emulator.rdramWrite32(link.pointer + 0x6000, this.allocationManager.getLocalPlayerData().AgesOrForms.get(Age.ADULT)!.pointer);
      this.ModLoader.emulator.rdramWrite32(link.pointer + 0x6004, this.allocationManager.getLocalPlayerData().AgesOrForms.get(Age.CHILD)!.pointer);
    }

    if (scene > -1 && this.allocationManager.getLocalPlayerData().currentScript !== undefined && curRef !== undefined) {
      let newRef = this.allocationManager.getLocalPlayerData().currentScript!.onSceneChange(scene, curRef)
      this.ModLoader.utils.setTimeoutFrames(() => {
        let a = new Z64Online_ModelAllocation(Buffer.alloc(1), this.core.save.age);
        a.ref = newRef;
        if (this.core.save.age === Age.ADULT) {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_ADULT_GAMEPLAY, a);
        } else {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_CHILD_GAMEPLAY, a);
        }
      }, 1);
    }
    bus.emit(Z64OnlineEvents.LOCAL_MODEL_CHANGE_FINISHED, new Z64Online_LocalModelChangeProcessEvt(this.allocationManager.getLocalPlayerData().AgesOrForms.get(Age.ADULT)!, this.allocationManager.getLocalPlayerData().AgesOrForms.get(Age.CHILD)!));

    if (this.mainConfig.diagnosticMode) {
      DumpRam();
    }
  }

  private handleModelChange(form: AgeorForm, evt: Z64Online_ModelAllocation){
    if (this.managerDisabled) return;
    if (evt.ref !== undefined) {
      if (this.allocationManager.getLocalPlayerData().AgesOrForms.get(form)!.hash === evt.ref.hash) return;
      this.allocationManager.SetLocalPlayerModel(form, evt.ref);
      this.onSceneChange(-1);
      this.proxyNeedsSync = true;
      if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
        let r2 = this.allocationManager.getLocalPlayerData().currentScript!.onTunicChanged(evt.ref, this.core.link.tunic);
        if (r2.hash !== evt.ref.hash) {
          this.allocationManager.SetLocalPlayerModel(form, r2);
        }
      }
      return;
    }
    let copy = this.ModLoader.utils.cloneBuffer(evt.model);
    if (evt.model.byteLength === 1) {
      this.allocationManager.SetLocalPlayerModel(form, this.puppetModels.get(Age.ADULT)!);
      this.onSceneChange(-1);
      evt.ref = this.puppetModels.get(form)!;
      this.proxyNeedsSync = true;
    } else {
      let model = this.allocationManager.registerModel(copy)!;
      model.script = evt.script;
      this.allocationManager.SetLocalPlayerModel(form, model);
      this.onSceneChange(-1);
      evt.ref = model;
      this.proxyNeedsSync = true;
    }
  }

  @EventHandler(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_ADULT_GAMEPLAY)
  onChangeModel(evt: Z64Online_ModelAllocation) {
    this.handleModelChange(Age.ADULT, evt);
  }

  @EventHandler(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_CHILD_GAMEPLAY)
  onChangeModelChild(evt: Z64Online_ModelAllocation) {
    this.handleModelChange(Age.CHILD, evt);
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
    if (!this.managerDisabled) {
      this.ModLoader.rom.romWriteBuffer(this.allocationManager.getLocalPlayerData().additionalData.get(Age.ADULT.toString(16))!, fs.readFileSync(path.resolve(__dirname, "zobjs", "proxy_adult.zobj")));
      this.ModLoader.rom.romWriteBuffer(this.allocationManager.getLocalPlayerData().additionalData.get(Age.CHILD.toString(16))!, fs.readFileSync(path.resolve(__dirname, "zobjs", "proxy_child.zobj")));
    }
    this.lockManager = true;
  }

  @EventHandler(ModLoaderEvents.ON_SOFT_RESET_POST)
  onReset2() {
    this.lockManager = false;
    this.startTitleScreenCheck();
  }

  doesLinkObjExist(age: AgeorForm) {
    let link_object_pointer: number = 0;
    let obj_list: number = 0x801D9C44;
    let obj_id = age === Age.ADULT ? 0x00140000 : 0x00150000;
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
    if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
      this.allocationManager.getLocalPlayerData().currentScript!.onTick();
    }
  }

  @EventHandler(OotEvents.ON_DAY_TRANSITION)
  onDay() {
    if (this.managerDisabled) return;
    if (this.lockManager) return;
    if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
      let ref: IModelReference = this.allocationManager.getLocalPlayerData().AgesOrForms.get(this.core.save.age)!;
      let newRef = this.allocationManager.getLocalPlayerData().currentScript!.onDay(ref);
      this.ModLoader.utils.setTimeoutFrames(() => {
        let a = new Z64Online_ModelAllocation(Buffer.alloc(1), this.core.save.age);
        a.ref = newRef;
        if (this.core.save.age === Age.ADULT) {
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
      let ref: IModelReference = this.allocationManager.getLocalPlayerData().AgesOrForms.get(this.core.save.age)!;
      let newRef = this.allocationManager.getLocalPlayerData().currentScript!.onNight(ref);
      this.ModLoader.utils.setTimeoutFrames(() => {
        let a = new Z64Online_ModelAllocation(Buffer.alloc(1), this.core.save.age);
        a.ref = newRef;
        if (this.core.save.age === Age.ADULT) {
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
      let ref: IModelReference = this.allocationManager.getLocalPlayerData().AgesOrForms.get(this.core.save.age)!;
      let newRef = this.allocationManager.getLocalPlayerData().currentScript!.onHealthChanged(this.core.save.heart_containers * 0x10, health, ref);
      this.ModLoader.utils.setTimeoutFrames(() => {
        let a = new Z64Online_ModelAllocation(Buffer.alloc(1), this.core.save.age);
        a.ref = newRef;
        if (this.core.save.age === Age.ADULT) {
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
      let ref: IModelReference = this.allocationManager.getLocalPlayerData().AgesOrForms.get(this.core.save.age)!;
      let newRef = this.allocationManager.getLocalPlayerData().currentScript!.onTunicChanged(ref, tunic);
      this.ModLoader.utils.setTimeoutFrames(() => {
        let a = new Z64Online_ModelAllocation(Buffer.alloc(1), this.core.save.age);
        a.ref = newRef;
        if (this.core.save.age === Age.ADULT) {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_ADULT_GAMEPLAY, a);
        } else {
          bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_CHILD_GAMEPLAY, a);
        }
      }, 1);
    }
  }
}