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
import zlib from 'zlib';
import { Age, OotEvents, IOOTCore, IOvlPayloadResult, Tunic, Scene } from 'modloader64_api/OOT/OOTAPI';
import {
  INetworkPlayer,
  NetworkHandler,
} from 'modloader64_api/NetworkHandler';
import { Z64OnlineEvents, Z64Online_EquipmentPak, Z64Online_ModelAllocation, IModelReference, Z64Online_LocalModelChangeProcessEvt } from '../../Z64API/OotoAPI';
import { ModelPlayer } from './ModelPlayer';
import { ModelAllocationManager } from './ModelAllocationManager';
import { Puppet } from '../linkPuppet/Puppet';
import fs from 'fs';
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import path from 'path';
import { ModelReference } from '../../common/cosmetics/ModelContainer';
import { Z64RomTools } from 'Z64Lib/API/Z64RomTools';
import { InjectCore } from 'modloader64_api/CoreInjection';
import { OOTAdultManifest } from 'Z64Lib/API/OOT/OOTAdultManfest';
import { OOTChildManifest } from 'Z64Lib/API/OOT/OOTChildManifest';
import { Z64LibSupportedGames } from 'Z64Lib/API/Z64LibSupportedGames';
import { onTick, onViUpdate, Preinit } from 'modloader64_api/PluginLifecycle';
import { Z64_EventConfig } from "@OotOnline/WorldEvents/Z64_EventConfig";
import { Deprecated } from 'modloader64_api/Deprecated';
import * as f3djs from 'f3djs';
import { EqManifestToOffsetMap_Link, EqManifestToOffsetMap_Puppet, PuppetProxyGen_Adult, PuppetProxyGen_Child, PuppetProxyGen_Matrix, PuppetProxyGen_Matrix_Keys } from './PuppetProxyGen';
import { CostumeHelper } from '@OotOnline/common/events/CostumeHelper';
import { EquipmentManifest } from '../../common/cosmetics/EquipmentManifest';
import { Z64_AllocateModelPacket, Z64_EquipmentPakPacket, Z64_GiveModelPacket } from '../OotOPackets';

export class ModelManagerClient {
  @ModLoaderAPIInject()
  ModLoader!: IModLoaderAPI;
  @InjectCore()
  core!: IOOTCore;
  clientStorage!: OotOnlineStorageClient;
  allocationManager!: ModelAllocationManager;
  customModelRepointsAdult = __dirname + '/zobjs/adult.json';
  customModelRepointsChild = __dirname + '/zobjs/child.json';
  customModelFileAdultIcon = '';
  customModelFileChildIcon = '';
  cacheDir: string = "./cache";
  //
  proxySyncTick!: string;
  proxyNeedsSync: boolean = false;
  customModelFilesAdult: Map<string, IModelReference> = new Map<string, IModelReference>();
  customModelFilesChild: Map<string, IModelReference> = new Map<string, IModelReference>();
  customModelFilesEquipment: Map<string, Buffer> = new Map<string, Buffer>();
  config!: Z64_EventConfig;
  //
  puppetAdult!: IModelReference;
  puppetChild!: IModelReference;
  adultCodePointer: number = 0xDEADBEEF;
  childCodePointer: number = 0xBEEFDEAD;
  titleScreenFix: any;
  lockManager: boolean = false;
  managerDisabled: boolean = false;
  //
  adult_proxy_refs: Array<Buffer> = [];
  child_proxy_refs: Array<Buffer> = [];

  @EventHandler(Z64OnlineEvents.CUSTOM_MODEL_LOAD_ADULT)
  onCustomModelAdult_new(evt: Z64Online_ModelAllocation) {
    if (this.managerDisabled) return;
    if (evt.model.readUInt32BE(0x500C) === 0xFFFFFFFF) {
      evt.model.writeUInt32BE(0x06005380, 0x500C)
    }
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
    if (evt.model.readUInt32BE(0x500C) === 0xFFFFFFFF) {
      evt.model.writeUInt32BE(0x060053A8, 0x500C)
    }
    let ref = this.allocationManager.registerModel(evt.model);
    if (evt.script !== undefined) {
      ref.script = evt.script;
    }
    evt.ref = ref;
    this.customModelFilesChild.set(evt.name + " (Child)", evt.ref);
  }

  @Deprecated('Z64OnlineEvents.CUSTOM_MODEL_APPLIED_ADULT -> Z64OnlineEvents.CUSTOM_MODEL_LOAD_ADULT')
  @EventHandler(Z64OnlineEvents.CUSTOM_MODEL_APPLIED_ADULT)
  onCustomModel(file: string) {
    if (this.managerDisabled) return;
    let evt = new Z64Online_ModelAllocation(fs.readFileSync(file), Age.ADULT);
    let figureOutName: string = path.parse(path.parse(file).dir).name;
    evt.name = figureOutName;
    bus.emit(Z64OnlineEvents.CUSTOM_MODEL_LOAD_ADULT, evt);
  }

  @Deprecated('Z64OnlineEvents.CUSTOM_MODEL_LOAD_BUFFER_ADULT is deprecated.')
  @EventHandler(Z64OnlineEvents.CUSTOM_MODEL_LOAD_BUFFER_ADULT)
  onCustomModelBufferAdult(buf: Buffer) {
    if (this.managerDisabled) return;
    this.ModLoader.logger.warn("Z64OnlineEvents.CUSTOM_MODEL_LOAD_BUFFER_ADULT is deprecated. Please stop using this event.");
  }

  @Deprecated('Z64OnlineEvents.CUSTOM_MODEL_APPLIED_CHILD -> Z64OnlineEvents.CUSTOM_MODEL_LOAD_CHILD')
  @EventHandler(Z64OnlineEvents.CUSTOM_MODEL_APPLIED_CHILD)
  onCustomModel2(file: string) {
    if (this.managerDisabled) return;
    let evt = new Z64Online_ModelAllocation(fs.readFileSync(file), Age.CHILD);
    let figureOutName: string = path.parse(path.parse(file).dir).name;
    evt.name = figureOutName;
    bus.emit(Z64OnlineEvents.CUSTOM_MODEL_LOAD_CHILD, evt);
  }

  @Deprecated('Z64OnlineEvents.CUSTOM_MODEL_LOAD_BUFFER_CHILD is deprecated.')
  @EventHandler(Z64OnlineEvents.CUSTOM_MODEL_LOAD_BUFFER_CHILD)
  onCustomModelBufferChild(buf: Buffer) {
    if (this.managerDisabled) return;
    this.ModLoader.logger.warn("Z64OnlineEvents.CUSTOM_MODEL_LOAD_BUFFER_CHILD is deprecated. Please stop using this event.");
  }

  @Deprecated('CUSTOM_MODEL_APPLIED_ANIMATIONS is deprecated')
  @EventHandler(Z64OnlineEvents.CUSTOM_MODEL_APPLIED_ANIMATIONS)
  onCustomModel3(file: string) {
    if (this.managerDisabled) return;
    this.ModLoader.logger.warn("Z64OnlineEvents.CUSTOM_MODEL_APPLIED_ANIMATIONS is deprecated. Please stop using this event.");
  }

  @Deprecated()
  @EventHandler(Z64OnlineEvents.CUSTOM_MODEL_APPLIED_ICON_ADULT)
  onCustomModel4(file: string) {
    if (this.managerDisabled) return;
    this.customModelFileAdultIcon = file;
  }

  @Deprecated()
  @EventHandler(Z64OnlineEvents.CUSTOM_MODEL_APPLIED_ICON_CHILD)
  onCustomModel5(file: string) {
    if (this.managerDisabled) return;
    this.customModelFileChildIcon = file;
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

  loadAdultModel(evt: any) {
    if (this.managerDisabled) return;
    let tools: Z64RomTools = new Z64RomTools(this.ModLoader, global.ModLoader.isDebugRom ? Z64LibSupportedGames.DEBUG_OF_TIME : Z64LibSupportedGames.OCARINA_OF_TIME);
    let adult_path: string = path.join(this.cacheDir, "adult.zobj");
    let model: Buffer = fs.readFileSync(adult_path);
    let manifest: OOTAdultManifest = new OOTAdultManifest();
    if (manifest.repoint(this.ModLoader, evt.rom, model)) {
      this.ModLoader.logger.info("(Adult) Setting up zobj proxy.");
      let proxy = fs.readFileSync(path.resolve(__dirname, "zobjs", "OotO_Adult_Proxy.zobj"));
      let internals: Array<number> = require('./zobjs/adult_internal_refs.json');
      for (let i = 0; i < internals.length; i++) {
        let buf = Buffer.alloc(0x8);
        model.copy(buf, 0, internals[i], internals[i] + 0x8);
        this.adult_proxy_refs.push(buf);
      }
      let alloc = new Z64Online_ModelAllocation(model, Age.ADULT);
      this.allocationManager.getLocalPlayerData().additionalData.set("adult_rom", manifest.inject(this.ModLoader, evt.rom, proxy, true));
      this.ModLoader.utils.setTimeoutFrames(() => {
        bus.emit(Z64OnlineEvents.ALLOCATE_MODEL_BLOCK, alloc);
        this.allocationManager.getLocalPlayerData().adult = alloc.ref;
      }, 2);
      // Assume pointer based on age.
      let code_file: Buffer = tools.getCodeFile(evt.rom);
      let offset: number = 0xE65A0;
      model.writeUInt32BE(code_file.readUInt32BE(offset), 0x500c);
      this.adultCodePointer = code_file.readUInt32BE(offset);
    }
  }

  loadChildModel(evt: any) {
    if (this.managerDisabled) return;
    let tools: Z64RomTools = new Z64RomTools(this.ModLoader, global.ModLoader.isDebugRom ? Z64LibSupportedGames.DEBUG_OF_TIME : Z64LibSupportedGames.OCARINA_OF_TIME);
    let child_path: string = path.join(this.cacheDir, "child.zobj");
    let model: Buffer = fs.readFileSync(child_path);
    let manifest: OOTChildManifest = new OOTChildManifest();
    if (manifest.repoint(this.ModLoader, evt.rom, model)) {
      this.ModLoader.logger.info("(Child) Setting up zobj proxy.");
      let proxy = fs.readFileSync(path.resolve(__dirname, "zobjs", "OotO_Child_Proxy_v2.zobj"));
      let internals: Array<number> = require('./zobjs/child_internal_refs.json');
      for (let i = 0; i < internals.length; i++) {
        let buf = Buffer.alloc(0x8);
        model.copy(buf, 0, internals[i], internals[i] + 0x8);
        this.child_proxy_refs.push(buf);
      }
      let alloc = new Z64Online_ModelAllocation(model, Age.CHILD);
      this.allocationManager.getLocalPlayerData().additionalData.set("child_rom", manifest.inject(this.ModLoader, evt.rom, proxy, true));
      this.ModLoader.utils.setTimeoutFrames(() => {
        bus.emit(Z64OnlineEvents.ALLOCATE_MODEL_BLOCK, alloc);
        this.allocationManager.getLocalPlayerData().child = alloc.ref;
      }, 2);
      // Assume pointer based on age.
      let code_file: Buffer = tools.getCodeFile(evt.rom);
      let offset: number = 0xE65A0 + 0x4;
      model.writeUInt32BE(code_file.readUInt32BE(offset), 0x500c);
      this.childCodePointer = code_file.readUInt32BE(offset);
    }
  }

  setupPuppetModels(evt: any) {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir);
    }
    let puppet_child: Buffer;
    let puppet_adult: Buffer;
    let adult_path: string = path.join(this.cacheDir, "adult.zobj");
    let child_path: string = path.join(this.cacheDir, "child.zobj");
    let tools: Z64RomTools = new Z64RomTools(this.ModLoader, global.ModLoader.isDebugRom ? Z64LibSupportedGames.DEBUG_OF_TIME : Z64LibSupportedGames.OCARINA_OF_TIME);
    this.ModLoader.logger.info("Setting up puppet models...");
    puppet_child = this.ModLoader.utils.clearBuffer(tools.decompressDMAFileFromRom(evt.rom, 503));
    puppet_adult = this.ModLoader.utils.clearBuffer(tools.decompressDMAFileFromRom(evt.rom, 502));
    fs.readFileSync(path.resolve(__dirname, "zobjs", "adult.zobj")).copy(puppet_adult);
    fs.readFileSync(path.resolve(__dirname, "zobjs", "child.zobj")).copy(puppet_child);
    fs.writeFileSync(adult_path, puppet_adult);
    fs.writeFileSync(child_path, puppet_child);

    this.ModLoader.utils.setTimeoutFrames(() => {
      this.puppetAdult = this.allocationManager.registerModel(puppet_adult);
      this.puppetAdult.isPlayerModel = false;
      this.puppetChild = this.allocationManager.registerModel(puppet_child)!;
      this.puppetChild.isPlayerModel = false;
      this.allocationManager.SetLocalPlayerModel(Age.ADULT, this.puppetAdult);
      this.allocationManager.SetLocalPlayerModel(Age.CHILD, this.puppetChild);
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
    if (this.managerDisabled) return;
    if (this.proxyNeedsSync) {
      let def = zlib.deflateSync(this.clientStorage.adultModel);
      this.ModLoader.clientSide.sendPacket(new Z64_AllocateModelPacket(def, Age.ADULT, this.ModLoader.clientLobby, this.ModLoader.utils.hashBuffer(def), this.core.save.age));
      let def2 = zlib.deflateSync(this.clientStorage.childModel);
      this.ModLoader.clientSide.sendPacket(new Z64_AllocateModelPacket(def2, Age.CHILD, this.ModLoader.clientLobby, this.ModLoader.utils.hashBuffer(def2), this.core.save.age));
      let p = new Z64_EquipmentPakPacket(this.core.save.age, this.ModLoader.clientLobby);
      this.allocationManager.getLocalPlayerData().equipment.forEach((value: IModelReference, key: string) => {
        let model = this.allocationManager.getModel(value);
        p.zobjs.push(zlib.deflateSync(model.zobj));
      });
      this.ModLoader.clientSide.sendPacket(p);
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
  }

  @PrivateEventHandler('LOAD_MODEL')
  LOAD_MODEL_HANDLER(ref: ModelReference) {
    this.allocationManager.allocateModel(ref);
  }

  @PrivateEventHandler('KILL_MODEL')
  KILL_MODEL_HANDLER(ref: ModelReference) {
    this.allocationManager.unregisterModel(ref);
  }

  private startTitleScreenCheck() {
    if (this.managerDisabled) return;
    if (this.titleScreenFix) return;
    this.titleScreenFix = this.ModLoader.utils.setIntervalFrames(() => {
      if (this.doesLinkObjExist(Age.ADULT).exists) {
        this.onSceneChange(-1);
        this.ModLoader.utils.clearIntervalFrames(this.titleScreenFix);
        this.titleScreenFix = undefined;
        bus.emit(Z64OnlineEvents.ON_MODEL_MANAGER_READY, {});
      }
    }, 1);
  }

  @EventHandler(ModLoaderEvents.ON_ROM_PATCHED)
  onRomPatched(evt: any) {
    let tools: Z64RomTools = new Z64RomTools(this.ModLoader, global.ModLoader.isDebugRom ? Z64LibSupportedGames.DEBUG_OF_TIME : Z64LibSupportedGames.OCARINA_OF_TIME);
    let code_file: Buffer = tools.getCodeFile(evt.rom);
    if (this.managerDisabled) return;
    bus.emit(Z64OnlineEvents.POST_LOADED_MODELS_LIST, { adult: this.customModelFilesAdult, child: this.customModelFilesChild, equipment: this.customModelFilesEquipment });
    this.ModLoader.logger.info('Starting custom model setup...');
    this.loadAdultModel(evt);
    this.loadChildModel(evt);

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
      let z = zlib.inflateSync(packet.model);
      if (z.byteLength <= 1) return;
      let player: ModelPlayer;
      if (this.allocationManager.doesPlayerExist(packet.player)) {
        player = this.allocationManager.getPlayer(packet.player)!;
      } else {
        player = this.allocationManager.createPlayer(packet.player, this.puppetAdult, this.puppetChild)!;
      }
      let model = this.allocationManager.registerModel(z)!;
      if (packet.age === Age.CHILD) {
        player.child = model;
      } else if (packet.age === Age.ADULT) {
        player.adult = model;
      }
      if (this.allocationManager.isPlayerAllocated(player)) {
        this.setPuppetModel(player, model, packet.age, packet.ageThePlayerActuallyIs);
      }
    }, 20);
  }

  @NetworkHandler('Z64OnlineLib_EquipmentPakPacket')
  onModelAllocate_Equipment(packet: Z64_EquipmentPakPacket) {
    this.ModLoader.utils.setTimeoutFrames(() => {
      let player = this.allocationManager.createPlayer(packet.player, this.puppetAdult, this.puppetChild)!;
      player.equipment.clear();
      packet.zobjs.forEach((value: Buffer, index: number) => {
        let def = zlib.inflateSync(value);
        let model = this.allocationManager.registerModel(def)!;
        model.loadModel();
        let man = this.getEquipmentManifest(model);
        player.equipment.set(man.cat, model);
        if (this.allocationManager.isPlayerAllocated(player)) {
          this.setPuppetModel(player, packet.age === Age.ADULT ? player.adult : player.child, packet.age, packet.age);
        }
      });
    }, 20);
  }

  @EventHandler(EventsClient.ON_PLAYER_LEAVE)
  onPlayerLeft(player: INetworkPlayer) {
    this.allocationManager.deletePlayer(player);
  }

  @NetworkHandler("Z64OnlineLib_GiveModelPacket")
  onPlayerJoin_client(packet: Z64_GiveModelPacket) {
    if (packet.target.uuid !== this.ModLoader.me.uuid) {
      if (this.clientStorage.adultModel.byteLength > 1) {
        let def = zlib.deflateSync(this.clientStorage.adultModel);
        this.ModLoader.clientSide.sendPacketToSpecificPlayer(
          new Z64_AllocateModelPacket(
            def,
            Age.ADULT,
            this.ModLoader.clientLobby,
            this.ModLoader.utils.hashBuffer(def),
            this.core.save.age
          ), packet.target
        );
      }

      if (this.clientStorage.childModel.byteLength > 1) {
        let def = zlib.deflateSync(this.clientStorage.childModel);
        this.ModLoader.clientSide.sendPacketToSpecificPlayer(
          new Z64_AllocateModelPacket(
            def,
            Age.CHILD,
            this.ModLoader.clientLobby,
            this.ModLoader.utils.hashBuffer(def),
            this.core.save.age
          ),
          packet.target
        );
      }
    }
    try {
      let p = new Z64_EquipmentPakPacket(0x69, this.ModLoader.clientLobby);
      this.allocationManager.getLocalPlayerData().equipment.forEach((value: IModelReference, key: string) => {
        let model = this.allocationManager.getModel(value);
        p.zobjs.push(zlib.deflateSync(model.zobj));
      });
      this.ModLoader.clientSide.sendPacketToSpecificPlayer(p, packet.target);
    } catch (err) {
      console.log(err.stack);
    }
  }

  @EventHandler(Z64OnlineEvents.PLAYER_PUPPET_PRESPAWN)
  onPuppetPreSpawn(puppet: Puppet) {
    let param_pointer = (this.clientStorage.overlayCache["puppet.ovl"] as IOvlPayloadResult).params;
    let player = this.allocationManager.allocatePlayer(puppet.player, this.puppetAdult, this.puppetChild)!;
    this.ModLoader.emulator.rdramWrite32(param_pointer + 0x8, player.proxyPointer);
    this.ModLoader.emulator.rdramWrite16(param_pointer + 0xE, puppet.age);
    player.playerIsSpawned = true;
  }

  private setPuppetModel(player: ModelPlayer, ref: IModelReference, modelAge: Age, playerAge: Age) {
    player.adult.loadModel();
    player.child.loadModel();
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
      fn2(player.adult, PuppetProxyGen_Matrix);
    } else if (modelAge === Age.CHILD) {
      fn2(player.child, PuppetProxyGen_Matrix);
    }

    player.equipment.forEach((value: IModelReference) => {
      let man = this.getEquipmentManifest(value);
      Object.keys(man.manifest.OOT.child).forEach((key: string) => {
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
        let i = man.lut + (parseInt(key) * 0x8);
        adult_generator_table[EqManifestToOffsetMap_Puppet[man.manifest.OOT.adult[key]]] = this.ModLoader.utils.cloneBuffer(f3djs.gsSPBranchList(value.pointer + i));
      });
    });

    fn(player.adult, adult_generator_table, this.ModLoader);
    fn(player.child, child_generator_table, this.ModLoader);
  }

  @EventHandler(Z64OnlineEvents.PLAYER_PUPPET_SPAWNED)
  onPuppetSpawned(puppet: Puppet) {
    let player = this.allocationManager.allocatePlayer(puppet.player, this.puppetAdult, this.puppetChild)!;
    this.ModLoader.emulator.rdramWrite32(player.proxyPointer + 0x58C, puppet.data.pointer);
    if (puppet.age === Age.CHILD && player.child !== undefined) {
      this.setPuppetModel(player, player.child, Age.CHILD, Age.CHILD);
    } else if (puppet.age === Age.ADULT && player.adult !== undefined) {
      this.setPuppetModel(player, player.adult, Age.ADULT, Age.ADULT);
    } else if (puppet.age === Age.CHILD) {
      this.setPuppetModel(player, this.puppetChild, Age.CHILD, Age.CHILD);
    } else if (puppet.age === Age.ADULT) {
      this.setPuppetModel(player, this.puppetAdult, Age.ADULT, Age.ADULT);
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
  }

  private dealWithEquipmentPaks(age: Age) {
    bus.emit(Z64OnlineEvents.EQUIPMENT_LOAD_START, {});
    this.allocationManager.getLocalPlayerData().equipment.forEach((value: IModelReference) => {
      let data = this.getEquipmentManifest(value);
      let table: any = {};
      let player = new ModelPlayer("TEMP");
      if (age === Age.ADULT) {
        table = data.manifest.OOT.adult;
        let link = this.doesLinkObjExist(Age.ADULT);
        player.proxyPointer = link.pointer;
      } else if (age === Age.CHILD) {
        table = data.manifest.OOT.child;
        let link = this.doesLinkObjExist(Age.CHILD);
        player.proxyPointer = link.pointer;
      }
      Object.keys(table).forEach((key: string) => {
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
    this.allocationManager.getLocalPlayerData().adult.loadModel();
    this.allocationManager.getLocalPlayerData().child.loadModel();
    let curRef: IModelReference | undefined;
    if (this.core.save.age === Age.ADULT) {
      let link = this.doesLinkObjExist(Age.ADULT);
      if (link.exists) {
        this.ModLoader.emulator.rdramWriteBuffer(link.pointer, this.ModLoader.emulator.rdramReadBuffer(this.allocationManager.getLocalPlayerData().adult.pointer, 0x5380));
        let p = this.ModLoader.emulator.rdramRead32(this.allocationManager.getLocalPlayerData().adult.pointer + 0x5380) - 0x150;
        let buf = this.ModLoader.emulator.rdramReadBuffer(p, 0x150);
        this.ModLoader.emulator.rdramWriteBuffer(link.pointer + 0xEC60 - 0x150, buf);

        let internals: Array<number> = require('./zobjs/adult_internal_refs.json');
        for (let i = 0; i < internals.length; i++) {
          this.ModLoader.emulator.rdramWriteBuffer(link.pointer + internals[i], this.adult_proxy_refs[i]);
        }

        this.dealWithEquipmentPaks(Age.ADULT);
        this.hat_hook();
        this.ModLoader.rom.romWriteBuffer(this.allocationManager.getLocalPlayerData().additionalData.get("adult_rom")!, this.ModLoader.emulator.rdramReadBuffer(link.pointer, 0x37800));
        curRef = this.allocationManager.getLocalPlayerData().adult;
      }
    } else {
      let link = this.doesLinkObjExist(Age.CHILD);
      if (link.exists) {
        this.ModLoader.emulator.rdramWriteBuffer(link.pointer, this.ModLoader.emulator.rdramReadBuffer(this.allocationManager.getLocalPlayerData().child.pointer, 0x53A8));
        let p = this.ModLoader.emulator.rdramRead32(this.allocationManager.getLocalPlayerData().child.pointer + 0x53A8) - 0x150;
        let buf = this.ModLoader.emulator.rdramReadBuffer(p, 0x1B0);
        this.ModLoader.emulator.rdramWriteBuffer(link.pointer + 0xEC60 - 0x150, buf);

        let internals: Array<number> = require('./zobjs/child_internal_refs.json');
        for (let i = 0; i < internals.length; i++) {
          this.ModLoader.emulator.rdramWriteBuffer(link.pointer + internals[i], this.child_proxy_refs[i]);
        }

        this.dealWithEquipmentPaks(Age.CHILD);
        this.ModLoader.rom.romWriteBuffer(this.allocationManager.getLocalPlayerData().additionalData.get("child_rom")!, this.ModLoader.emulator.rdramReadBuffer(link.pointer, 0x22380));
        curRef = this.allocationManager.getLocalPlayerData().child;
      }
      this.ModLoader.emulator.rdramWrite32(link.pointer + 0x6000, this.allocationManager.getLocalPlayerData().adult.pointer);
      this.ModLoader.emulator.rdramWrite32(link.pointer + 0x6004, this.allocationManager.getLocalPlayerData().adult.pointer);
    }

    /*     this.ModLoader.emulator.rdramWritePtrBuffer(0x8016A66C, 0xC698, Buffer.alloc(0x170));
        this.ModLoader.emulator.rdramWritePtrBuffer(0x8016A66C, 0xC700, MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(186.0, 60.0, -10.7, -807.0, 0.02, 31.5, 1.0)));
        this.ModLoader.emulator.rdramWritePtrBuffer(0x8016A66C, 0xC740, Buffer.from('DA3800000400c700', 'hex'));
        this.ModLoader.emulator.rdramWritePtrBuffer(0x8016A66C, 0xC748, this.ModLoader.utils.cloneBuffer(f3djs.gsSPDisplayList(this.allocationManager.getLocalPlayerData().child.pointer + 0x51B0)));
        this.ModLoader.emulator.rdramWritePtrBuffer(0x8016A66C, 0xC750, Buffer.from('D838000200000064', 'hex'));
        this.ModLoader.emulator.rdramWritePtrBuffer(0x8016A66C, 0xC758, this.ModLoader.utils.cloneBuffer(f3djs.gsSPEndDisplayList()));
        this.ModLoader.emulator.rdramWritePtrBuffer(0x8016A66C, 0xC698, this.ModLoader.utils.cloneBuffer(f3djs.gsSPBranchList(0x0400C740))); */

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
    bus.emit(Z64OnlineEvents.LOCAL_MODEL_CHANGE_FINISHED, new Z64Online_LocalModelChangeProcessEvt(this.allocationManager.getLocalPlayerData().adult, this.allocationManager.getLocalPlayerData().child));
  }

  @EventHandler(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_ADULT_GAMEPLAY)
  onChangeModel(evt: Z64Online_ModelAllocation) {
    if (this.managerDisabled) return;
    if (evt.ref !== undefined) {
      if (this.allocationManager.getLocalPlayerData().adult.hash === evt.ref.hash) return;
      if (this.allocationManager.getLocalPlayerData().adult.script !== undefined) this.allocationManager.getLocalPlayerData().adult.script!.onModelRemoved();
      this.allocationManager.SetLocalPlayerModel(Age.ADULT, evt.ref);
      this.onSceneChange(-1);
      this.clientStorage.adultModel = this.allocationManager.getModel(evt.ref)!.zobj;
      this.proxyNeedsSync = true;
      return;
    }
    let copy = this.ModLoader.utils.cloneBuffer(evt.model);
    if (evt.model.byteLength === 1) {
      this.allocationManager.SetLocalPlayerModel(Age.ADULT, this.puppetAdult);
      this.clientStorage.adultModel = this.allocationManager.getModel(this.puppetAdult)!.zobj;
      this.onSceneChange(-1);
      evt.ref = this.puppetAdult;
      this.proxyNeedsSync = true;
    } else {
      if (copy.readUInt32BE(0x500C) === 0xFFFFFFFF) {
        copy.writeUInt32BE(this.adultCodePointer, 0x500C)
      }
      let model = this.allocationManager.registerModel(copy)!;
      if (evt.script !== undefined) {
        model.script = evt.script;
        model.script.onModelEquipped();
      }
      this.allocationManager.SetLocalPlayerModel(Age.ADULT, model);
      this.onSceneChange(-1);
      this.clientStorage.adultModel = this.allocationManager.getModel(model)!.zobj;
      evt.ref = model;
      this.proxyNeedsSync = true;
    }
  }

  @EventHandler(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_CHILD_GAMEPLAY)
  onChangeModelChild(evt: Z64Online_ModelAllocation) {
    if (this.managerDisabled) return;
    if (evt.ref !== undefined) {
      if (this.allocationManager.getLocalPlayerData().child.hash === evt.ref.hash) return;
      if (this.allocationManager.getLocalPlayerData().child.script !== undefined) this.allocationManager.getLocalPlayerData().child.script!.onModelRemoved();
      this.allocationManager.SetLocalPlayerModel(Age.CHILD, evt.ref);
      this.onSceneChange(-1);
      this.clientStorage.childModel = this.allocationManager.getModel(evt.ref)!.zobj;
      this.proxyNeedsSync = true;
      return;
    }
    let copy = this.ModLoader.utils.cloneBuffer(evt.model);
    if (evt.model.byteLength === 1) {
      this.allocationManager.SetLocalPlayerModel(Age.CHILD, this.puppetChild);
      this.clientStorage.childModel = this.allocationManager.getModel(this.puppetChild)!.zobj;
      this.onSceneChange(-1);
      evt.ref = this.puppetChild;
      this.proxyNeedsSync = true;
    } else {
      if (copy.readUInt32BE(0x500C) === 0xFFFFFFFF) {
        copy.writeUInt32BE(this.childCodePointer, 0x500C)
      }
      let model = this.allocationManager.registerModel(copy)!;
      if (evt.script !== undefined) {
        model.script = evt.script;
        model.script.onModelEquipped();
      }
      this.allocationManager.SetLocalPlayerModel(Age.CHILD, model);
      this.onSceneChange(-1);
      this.clientStorage.childModel = this.allocationManager.getModel(model)!.zobj;
      evt.ref = model;
      this.proxyNeedsSync = true;
    }
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
    if (!this.managerDisabled){
      this.ModLoader.rom.romWriteBuffer(this.allocationManager.getLocalPlayerData().additionalData.get("adult_rom")!, fs.readFileSync(path.resolve(__dirname, "zobjs", "OotO_Adult_Proxy.zobj")));
      this.ModLoader.rom.romWriteBuffer(this.allocationManager.getLocalPlayerData().additionalData.get("child_rom")!, fs.readFileSync(path.resolve(__dirname, "zobjs", "OotO_Child_Proxy_v2.zobj")));
    }
    this.lockManager = true;
  }

  @EventHandler(ModLoaderEvents.ON_SOFT_RESET_POST)
  onReset2() {
    this.lockManager = false;
    this.startTitleScreenCheck();
  }

  doesLinkObjExist(age: Age) {
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
    if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
      this.allocationManager.getLocalPlayerData().currentScript!.onTick();
    }
  }

  @EventHandler(OotEvents.ON_DAY_TRANSITION)
  onDay() {
    if (this.managerDisabled) return;
    if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
      let ref: IModelReference = this.core.save.age === 0 ? this.allocationManager.getLocalPlayerData().adult : this.allocationManager.getLocalPlayerData().child;
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
    if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
      let ref: IModelReference = this.core.save.age === 0 ? this.allocationManager.getLocalPlayerData().adult : this.allocationManager.getLocalPlayerData().child;
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
    if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
      let ref: IModelReference = this.core.save.age === 0 ? this.allocationManager.getLocalPlayerData().adult : this.allocationManager.getLocalPlayerData().child;
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
    if (this.allocationManager.getLocalPlayerData().currentScript !== undefined) {
      let ref: IModelReference = this.core.save.age === 0 ? this.allocationManager.getLocalPlayerData().adult : this.allocationManager.getLocalPlayerData().child;
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

  // #ifdef IS_DEV_BUILD
  @onViUpdate()
  onVi() {
    //this.allocationManager.onVi();
  }
  // #endif
}