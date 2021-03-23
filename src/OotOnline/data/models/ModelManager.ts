import {
  IModLoaderAPI,
  ModLoaderEvents,
} from 'modloader64_api/IModLoaderAPI';
import {
  bus,
  EventHandler,
  EventsClient,
} from 'modloader64_api/EventHandler';
import { OotOnlineStorageClient } from '../../OotOnlineStorageClient';
import zlib from 'zlib';
import { Age, OotEvents, IOOTCore, IOvlPayloadResult } from 'modloader64_api/OOT/OOTAPI';
import {
  INetworkPlayer,
  NetworkHandler,
} from 'modloader64_api/NetworkHandler';
import { Z64_AllocateModelPacket, Z64_EquipmentPakPacket, Z64_GiveModelPacket, Z64_IconAllocatePacket, Z64_ModifyModelPacket, Z64OnlineEvents, Z64Online_EquipmentPak, Z64Online_ModelAllocation } from '../../Z64API/OotoAPI';
import { ModelPlayer } from './ModelPlayer';
import { ModelAllocationManager } from './ModelAllocationManager';
import { Puppet } from '../linkPuppet/Puppet';
import fs from 'fs';
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import path from 'path';
import { ModelObject } from './ModelContainer';
import { PatchTypes } from 'modloader64_api/Patchers/PatchManager';
import { Z64RomTools, trimBuffer } from 'Z64Lib/API/Z64RomTools';
import { InjectCore } from 'modloader64_api/CoreInjection';
import { OOTAdultManifest } from 'Z64Lib/API/OOT/OOTAdultManfest';
import { OOTChildManifest } from 'Z64Lib/API/OOT/OOTChildManifest';
import { zzstatic } from 'Z64Lib/API/zzstatic';
import { Z64LibSupportedGames } from 'Z64Lib/API/Z64LibSupportedGames';
import { Preinit } from 'modloader64_api/PluginLifecycle';
import { Z64_EventConfig } from "@OotOnline/WorldEvents/Z64_EventConfig";
import { Heap } from 'modloader64_api/heap';
import { SmartBuffer } from 'smart-buffer';
import { FakeHeap } from '@OotOnline/WorldEvents/FakeHeap';

export class ModelManagerClient {
  @ModLoaderAPIInject()
  ModLoader!: IModLoaderAPI;
  @InjectCore()
  core!: IOOTCore;
  clientStorage!: OotOnlineStorageClient;
  allocationManager!: ModelAllocationManager;
  customModelFileAnims = '';
  customModelRepointsAdult = __dirname + '/zobjs/adult.json';
  customModelRepointsChild = __dirname + '/zobjs/child.json';
  customModelFileAdultIcon = '';
  customModelFileChildIcon = '';
  cacheDir: string = "./cache";
  isThreaded: boolean = false;
  //
  customModelBufferAdult: Buffer | undefined;
  customModelBufferChild: Buffer | undefined;
  proxySyncTick!: string;
  proxyNeedsSync: boolean = false;
  customModelFilesAdult: Map<string, Buffer> = new Map<string, Buffer>();
  customModelFilesChild: Map<string, Buffer> = new Map<string, Buffer>();
  customModelFilesEquipment: Map<string, Buffer> = new Map<string, Buffer>();
  config!: Z64_EventConfig;
  equipmentMapping!: Z64Online_ModelAllocation;
  equipmentMap: Map<string, Buffer> = new Map<string, Buffer>();
  equipmentHeap!: FakeHeap;
  proxyProcessFlags: Buffer = Buffer.alloc(2);

  @EventHandler(Z64OnlineEvents.CUSTOM_MODEL_APPLIED_ADULT)
  onCustomModel(file: string) {
    let figureOutName: string = path.parse(path.parse(file).dir).name;
    this.customModelFilesAdult.set(figureOutName, fs.readFileSync(file));
  }

  @EventHandler(Z64OnlineEvents.CUSTOM_MODEL_LOAD_BUFFER_ADULT)
  onCustomModelBufferAdult(buf: Buffer) {
    this.customModelBufferAdult = buf;
  }

  @EventHandler(Z64OnlineEvents.CUSTOM_MODEL_APPLIED_CHILD)
  onCustomModel2(file: string) {
    let figureOutName: string = path.parse(path.parse(file).dir).name;
    this.customModelFilesChild.set(figureOutName, fs.readFileSync(file));
  }

  @EventHandler(Z64OnlineEvents.CUSTOM_MODEL_LOAD_BUFFER_CHILD)
  onCustomModelBufferChild(buf: Buffer) {
    this.customModelBufferChild = buf;
  }

  @EventHandler(Z64OnlineEvents.CUSTOM_MODEL_APPLIED_ANIMATIONS)
  onCustomModel3(file: string) {
    this.customModelFileAnims = file;
  }

  @EventHandler(Z64OnlineEvents.CUSTOM_MODEL_APPLIED_ICON_ADULT)
  onCustomModel4(file: string) {
    this.customModelFileAdultIcon = file;
  }

  @EventHandler(Z64OnlineEvents.CUSTOM_MODEL_APPLIED_ICON_CHILD)
  onCustomModel5(file: string) {
    this.customModelFileChildIcon = file;
  }

  @EventHandler(Z64OnlineEvents.LOAD_EQUIPMENT_BUFFER)
  onLoadEq(eq: Z64Online_EquipmentPak) {
    this.equipmentMap.set(eq.name, eq.data);
  }

  @EventHandler(Z64OnlineEvents.LOAD_EQUIPMENT_PAK)
  onLoadEQExternal(eq: Z64Online_EquipmentPak) {
    this.customModelFilesEquipment.set(eq.name, eq.data);
    bus.emit(Z64OnlineEvents.LOAD_EQUIPMENT_BUFFER, eq);
  }

  @EventHandler(Z64OnlineEvents.CLEAR_EQUIPMENT)
  onClearEq(evt: any) {
    this.equipmentMap.clear();
  }

  @EventHandler(Z64OnlineEvents.ALLOCATE_MODEL_BLOCK)
  onAlloc(alloc: Z64Online_ModelAllocation) {
    let uuid = this.ModLoader.utils.getUUID();
    let mp = new ModelPlayer(uuid);
    switch (alloc.age) {
      case Age.ADULT:
        mp.model.adult.zobj = alloc.model;
        break;
      case Age.CHILD:
        mp.model.child.zobj = alloc.model;
        break;
    }
    alloc.slot = this.allocationManager.allocateSlot(mp);
    alloc.pointer = mp.pointer;
  }

  private createEquipmentHeap() {
    let uuid = this.ModLoader.utils.getUUID();
    let mp = new ModelPlayer(uuid);
    let alloc = new Z64Online_ModelAllocation(Buffer.alloc(0x37800), 0x69);
    alloc.slot = this.allocationManager.allocateSlot(mp);
    alloc.pointer = mp.pointer;
    this.equipmentHeap = new FakeHeap(this.ModLoader.emulator, alloc.pointer, alloc.model.byteLength);
    this.equipmentMapping = alloc;
  }

  private clearEquipmentHeap() {
    let b = this.ModLoader.emulator.rdramReadBuffer(this.equipmentMapping.pointer, this.equipmentMapping.model.byteLength);
    b = this.ModLoader.utils.clearBuffer(b);
    this.ModLoader.emulator.rdramWriteBuffer(this.equipmentMapping.pointer, b);
    this.equipmentHeap = new FakeHeap(this.ModLoader.emulator, this.equipmentMapping.pointer, this.equipmentMapping.model.byteLength);
  }

  @EventHandler(Z64OnlineEvents.FORCE_LOAD_MODEL_BLOCK)
  onForceLoad(slot: number) {
    let model = this.allocationManager.getModelInSlot(slot);
    if (model.model.adult.zobj.byteLength > 1) {
      this.ModLoader.emulator.rdramWriteBuffer(model.pointer, new zzstatic(Z64LibSupportedGames.OCARINA_OF_TIME).doRepoint(this.ModLoader.utils.cloneBuffer(model.model.adult.zobj), 0, true, model.pointer));
    }
    if (model.model.child.zobj.byteLength > 1) {
      this.ModLoader.emulator.rdramWriteBuffer(model.pointer, new zzstatic(Z64LibSupportedGames.OCARINA_OF_TIME).doRepoint(this.ModLoader.utils.cloneBuffer(model.model.child.zobj), 0, true, model.pointer));
    }
  }

  loadAdultModel(evt: any, file: Buffer, proxy?: boolean, buf?: Buffer) {
    let tools: Z64RomTools = new Z64RomTools(this.ModLoader, global.ModLoader.isDebugRom ? Z64LibSupportedGames.DEBUG_OF_TIME : Z64LibSupportedGames.OCARINA_OF_TIME);
    let model: Buffer;
    if (file !== undefined) {
      model = file;
    } else {
      model = buf!;
    }
    if (model === undefined) {
      let adult_path: string = path.join(this.cacheDir, "adult.zobj");
      model = fs.readFileSync(adult_path);
    }
    let manifest: OOTAdultManifest = new OOTAdultManifest();
    if (manifest.repoint(this.ModLoader, evt.rom, model)) {
      if (proxy) {
        this.ModLoader.logger.info("(Adult) Setting up zobj proxy.");
        let proxy = fs.readFileSync(path.resolve(__dirname, "zobjs", "OotO_Adult_Proxy.zobj"));
        let alloc = new Z64Online_ModelAllocation(model, Age.ADULT);
        alloc.rom = manifest.inject(this.ModLoader, evt.rom, proxy, true);
        this.ModLoader.utils.setTimeoutFrames(() => {
          bus.emit(Z64OnlineEvents.ALLOCATE_MODEL_BLOCK, alloc);
        }, 2);
        this.clientStorage.adultProxy = alloc;
        let code_file: Buffer = tools.decompressDMAFileFromRom(evt.rom, 27);
        let offset: number = 0xE65A0;
        model.writeUInt32BE(code_file.readUInt32BE(offset), 0x500c);
        this.clientStorage.adultModel = model;
      } else {
        manifest.inject(this.ModLoader, evt.rom, model);
        let code_file: Buffer = tools.decompressDMAFileFromRom(evt.rom, 27);
        let offset: number = 0xE65A0;
        model.writeUInt32BE(code_file.readUInt32BE(offset), 0x500c);
        this.clientStorage.adultModel = model;
      }
    }
  }

  loadChildModel(evt: any, file: Buffer, proxy?: boolean, buf?: Buffer) {
    let tools: Z64RomTools = new Z64RomTools(this.ModLoader, global.ModLoader.isDebugRom ? Z64LibSupportedGames.DEBUG_OF_TIME : Z64LibSupportedGames.OCARINA_OF_TIME);
    let model: Buffer;
    if (file !== undefined) {
      model = file;
    } else {
      model = buf!;
    }
    if (model === undefined) {
      let child_path: string = path.join(this.cacheDir, "child.zobj");
      model = fs.readFileSync(child_path);
    }
    let manifest: OOTChildManifest = new OOTChildManifest();
    if (manifest.repoint(this.ModLoader, evt.rom, model)) {
      if (proxy) {
        this.ModLoader.logger.info("(Child) Setting up zobj proxy.");
        let proxy = fs.readFileSync(path.resolve(__dirname, "zobjs", "OotO_Child_Proxy_v2.zobj"));
        proxy = trimBuffer(proxy);
        let alloc = new Z64Online_ModelAllocation(model, Age.CHILD);
        alloc.rom = manifest.inject(this.ModLoader, evt.rom, proxy, true);
        this.ModLoader.utils.setTimeoutFrames(() => {
          bus.emit(Z64OnlineEvents.ALLOCATE_MODEL_BLOCK, alloc);
        }, 2);
        this.clientStorage.childProxy = alloc;
        if (model.readUInt32BE(0x500C) === 0xFFFFFFFF) {
          // Assume pointer based on age.
          let code_file: Buffer = tools.decompressDMAFileFromRom(evt.rom, 27);
          let offset: number = 0xE65A0 + 0x4;
          model.writeUInt32BE(code_file.readUInt32BE(offset), 0x500c);
        } else {
          // User defined pointer. Inject it instead.
          let code_file: Buffer = tools.decompressDMAFileFromRom(evt.rom, 27);
          let offset: number = 0xE65A0 + 0x4;
          code_file.writeUInt32BE(model.readUInt32BE(0x500C), offset);
        }
        this.clientStorage.childModel = model;
      } else {
        manifest.inject(this.ModLoader, evt.rom, model);
        if (model.readUInt32BE(0x500C) === 0xFFFFFFFF) {
          // Assume pointer based on age.
          let code_file: Buffer = tools.decompressDMAFileFromRom(evt.rom, 27);
          let offset: number = 0xE65A0 + 0x4;
          model.writeUInt32BE(code_file.readUInt32BE(offset), 0x500c);
        } else {
          // User defined pointer. Inject it instead.
          let code_file: Buffer = tools.decompressDMAFileFromRom(evt.rom, 27);
          let offset: number = 0xE65A0 + 0x4;
          code_file.writeUInt32BE(model.readUInt32BE(0x500C), offset);
        }
        this.clientStorage.childModel = model;
      }
    }
  }

  setupPuppetModels(evt: any) {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir);
    }
    let child_path: string = path.join(this.cacheDir, "child.zobj");
    let adult_path: string = path.join(this.cacheDir, "adult.zobj");

    let puppet_child: Buffer = Buffer.alloc(1);
    let puppet_adult: Buffer = Buffer.alloc(1);

    if (fs.existsSync(child_path) && fs.existsSync(adult_path)) {
      puppet_child = fs.readFileSync(child_path);
      puppet_adult = fs.readFileSync(adult_path);
    } else {
      let tools: Z64RomTools = new Z64RomTools(this.ModLoader, global.ModLoader.isDebugRom ? Z64LibSupportedGames.DEBUG_OF_TIME : Z64LibSupportedGames.OCARINA_OF_TIME);
      this.ModLoader.logger.info("Setting up puppet models...");
      puppet_child = Buffer.alloc(0x37800);
      //tools.decompressObjectFileFromRom(evt.rom, 0x0014).copy(puppet_child);
      tools.decompressDMAFileFromRom(evt.rom, 503).copy(puppet_child);
      puppet_adult = Buffer.alloc(0x37800);
      //tools.decompressObjectFileFromRom(evt.rom, 0x0015).copy(puppet_adult);
      tools.decompressDMAFileFromRom(evt.rom, 502).copy(puppet_adult);
      puppet_child = PatchTypes.get(".bps")!.patch(puppet_child, fs.readFileSync(path.join(__dirname, "zobjs", "ChildLink.bps")));
      puppet_adult = PatchTypes.get(".bps")!.patch(puppet_adult, fs.readFileSync(path.join(__dirname, "zobjs", "AdultLink.bps")));
      fs.writeFileSync(child_path, trimBuffer(puppet_child));
      fs.writeFileSync(adult_path, trimBuffer(puppet_adult));
    }

    let a = new ModelPlayer("Adult");
    a.model.adult = new ModelObject(trimBuffer(puppet_adult));
    let c = new ModelPlayer("Child");
    c.model.child = new ModelObject(trimBuffer(puppet_child));
    this.ModLoader.utils.setTimeoutFrames(() => {
      this.allocationManager.allocateSlot(a);
      this.allocationManager.allocateSlot(c);
    }, 2);
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
      let def = zlib.deflateSync(this.clientStorage.adultModel);
      this.ModLoader.clientSide.sendPacket(new Z64_AllocateModelPacket(def, Age.ADULT, this.ModLoader.clientLobby, this.ModLoader.utils.hashBuffer(def)));
      let def2 = zlib.deflateSync(this.clientStorage.childModel);
      this.ModLoader.clientSide.sendPacket(new Z64_AllocateModelPacket(def2, Age.CHILD, this.ModLoader.clientLobby, this.ModLoader.utils.hashBuffer(def2)));
      let p = new Z64_EquipmentPakPacket(this.core.save.age, this.ModLoader.clientLobby);
      this.equipmentMap.forEach((value: Buffer, key: string) => {
        p.zobjs.push(zlib.deflateSync(value));
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
  }

  @EventHandler(ModLoaderEvents.ON_ROM_PATCHED)
  onRomPatched(evt: any) {
    bus.emit(Z64OnlineEvents.POST_LOADED_MODELS_LIST, { adult: this.customModelFilesAdult, child: this.customModelFilesChild, equipment: this.customModelFilesEquipment });
    let tools: Z64RomTools = new Z64RomTools(this.ModLoader, global.ModLoader.isDebugRom ? Z64LibSupportedGames.DEBUG_OF_TIME : Z64LibSupportedGames.OCARINA_OF_TIME);
    this.ModLoader.logger.info('Starting custom model setup...');
    let anim = 7;

    let titleScreenFix = this.ModLoader.utils.setIntervalFrames(() => {
      if (this.doesLinkObjExist(Age.ADULT).exists) {
        this.onSceneChange(-1);
        this.ModLoader.utils.clearIntervalFrames(titleScreenFix);
      }
    }, 1);

    try {
      if (this.customModelFilesAdult.size > 0 || this.customModelBufferAdult !== undefined) {
        this.loadAdultModel(evt, this.customModelFilesAdult.get(this.config.adultCostume)!, true, this.customModelBufferAdult);
        let def = zlib.deflateSync(this.clientStorage.adultModel);
        this.ModLoader.clientSide.sendPacket(
          new Z64_AllocateModelPacket(
            def,
            Age.ADULT,
            this.ModLoader.clientLobby,
            this.ModLoader.utils.hashBuffer(def)
          )
        );
        if (this.proxySyncTick === undefined) {
          this.proxySyncTick = this.ModLoader.utils.setIntervalFrames(this.syncProxiedObject.bind(this), 100);
        }
      }

      if (this.customModelFilesChild.size > 0 || this.customModelBufferChild !== undefined) {
        this.loadChildModel(evt, this.customModelFilesChild.get(this.config.childCostume)!, true, this.customModelBufferChild);
        let def = zlib.deflateSync(this.clientStorage.childModel);
        this.ModLoader.clientSide.sendPacket(
          new Z64_AllocateModelPacket(
            def,
            Age.CHILD,
            this.ModLoader.clientLobby,
            this.ModLoader.utils.hashBuffer(def)
          )
        );
        if (this.proxySyncTick === undefined) {
          this.proxySyncTick = this.ModLoader.utils.setIntervalFrames(this.syncProxiedObject.bind(this), 100);
        }
      }
    } catch (err) {
      this.ModLoader.logger.error(err.stack);
      throw err;
    }

    if (this.customModelFileAnims !== '') {
      this.ModLoader.logger.info('Loading new animations...');
      let anim_file: Buffer = fs.readFileSync(this.customModelFileAnims);
      let anim_zobj: Buffer = tools.decompressDMAFileFromRom(evt.rom, anim);
      if (anim_zobj.byteLength === anim_file.byteLength) {
        this.ModLoader.utils.clearBuffer(anim_zobj);
        anim_file.copy(anim_zobj);
      }
      tools.recompressDMAFileIntoRom(evt.rom, anim, anim_zobj);
    }

    if (this.customModelFileAdultIcon !== '') {
      this.ModLoader.logger.info('Loading custom map icon (Adult) ...');
      this.clientStorage.adultIcon = fs.readFileSync(
        this.customModelFileAdultIcon
      );
      let def = zlib.deflateSync(this.clientStorage.adultIcon);
      this.ModLoader.clientSide.sendPacket(
        new Z64_IconAllocatePacket(
          def,
          Age.ADULT,
          this.ModLoader.clientLobby,
          this.ModLoader.utils.hashBuffer(def)
        )
      );
    }

    if (this.customModelFileChildIcon !== '') {
      this.ModLoader.logger.info('Loading custom map icon (Child) ...');
      this.clientStorage.childIcon = fs.readFileSync(
        this.customModelFileChildIcon
      );
      let def = zlib.deflateSync(this.clientStorage.childIcon);
      this.ModLoader.clientSide.sendPacket(
        new Z64_IconAllocatePacket(
          def,
          Age.CHILD,
          this.ModLoader.clientLobby,
          this.ModLoader.utils.hashBuffer(def)
        )
      );
    }

    try {
      if (this.equipmentMap.size > 0) {
        let p = new Z64_EquipmentPakPacket(0x69, this.ModLoader.clientLobby);
        this.equipmentMap.forEach((value: Buffer, key: string) => {
          p.zobjs.push(zlib.deflateSync(value));
        });
        this.ModLoader.clientSide.sendPacket(p);
      }
    } catch (err) {
      console.log(err.stack);
    }

    this.ModLoader.logger.info('Done.');
    this.ModLoader.clientSide.sendPacket(new Z64_GiveModelPacket(this.ModLoader.clientLobby, this.ModLoader.me));
  }

  @NetworkHandler('Z64OnlineLib_AllocateModelPacket')
  onModelAllocate_client(packet: Z64_AllocateModelPacket) {
    if (
      !this.clientStorage.playerModelCache.hasOwnProperty(packet.player.uuid)
    ) {
      this.clientStorage.playerModelCache[packet.player.uuid] = new ModelPlayer(packet.player.uuid);
    }
    if (packet.age === Age.CHILD) {
      (this.clientStorage.playerModelCache[packet.player.uuid] as ModelPlayer).model.setChild(zlib.inflateSync(packet.model));
      this.ModLoader.logger.info('client: Saving custom child model for player ' + packet.player.nickname + '.');
    } else if (packet.age === Age.ADULT) {
      (this.clientStorage.playerModelCache[packet.player.uuid] as ModelPlayer).model.setAdult(zlib.inflateSync(packet.model));
      this.ModLoader.logger.info('client: Saving custom adult model for player ' + packet.player.nickname + '.');
    }
    if (!this.core.helper.isTitleScreen() && this.core.helper.isInterfaceShown()) {
      bus.emit(Z64OnlineEvents.FORCE_PUPPET_RESPAWN_IMMEDIATE, { player: packet.player, age: packet.age });
    }
  }

  @NetworkHandler('Z64OnlineLib_EquipmentPakPacket')
  onModelAllocate_Equipment(packet: Z64_EquipmentPakPacket) {
    if (
      !this.clientStorage.playerModelCache.hasOwnProperty(packet.player.uuid)
    ) {
      this.clientStorage.playerModelCache[packet.player.uuid] = new ModelPlayer(packet.player.uuid);
    }
    let mp = this.clientStorage.playerModelCache[packet.player.uuid] as ModelPlayer;
    mp.model.equipment = [];
    packet.zobjs.forEach((value: Buffer, index: number) => {
      let def = zlib.inflateSync(value);
      mp.model.equipment.push(new ModelObject(def));
    });
    if (!this.core.helper.isTitleScreen() && this.core.helper.isInterfaceShown()) {
      bus.emit(Z64OnlineEvents.FORCE_PUPPET_RESPAWN_IMMEDIATE, { player: packet.player, age: packet.age });
    }
  }

  @NetworkHandler('Z64OnlineLib_ModifyModelPacket')
  onModelMod(packet: Z64_ModifyModelPacket) {
    if (!this.allocationManager.isPlayerAllocated(packet.player)) {
      return;
    }
    if (packet.age === Age.CHILD) {
      this.ModLoader.logger.info("Getting model for player " + packet.player.nickname + "...");
      let model: ModelPlayer = this.allocationManager.getPlayerAllocation(
        packet.player
      );
      let index: number = this.allocationManager.getModelIndex(model);
      this.ModLoader.logger.info("This model is assigned to model block " + index + ".");
      let addr: number = model.pointer;
      this.ModLoader.logger.info("Model block " + index + " starts at address 0x" + addr.toString(16) + ".");
      let pos: number = 0;
      while (pos < packet.mod.byteLength) {
        let offset: number = packet.mod.readUInt16BE(pos);
        pos += 2;
        let length: number = packet.mod.readUInt16BE(pos);
        pos += 2;
        let data: Buffer = packet.mod.slice(pos, pos + length);
        pos += data.byteLength;
        this.ModLoader.emulator.rdramWriteBuffer(addr + packet.offset + offset, data);
      }
    }
  }

  @NetworkHandler('Z64OnlineLib_IconAllocatePacket')
  onIconAllocateClient(packet: Z64_IconAllocatePacket) {
    if (
      !this.clientStorage.playerModelCache.hasOwnProperty(packet.player.uuid)
    ) {
      this.clientStorage.playerModelCache[packet.player.uuid] = new ModelPlayer(packet.player.uuid);
    }
    if (packet.age === Age.ADULT) {
      (this.clientStorage.playerModelCache[
        packet.player.uuid
      ] as ModelPlayer).customIconAdult = zlib.inflateSync(packet.icon);
      this.ModLoader.logger.info(
        'client: Saving custom icon for (Adult) player ' +
        packet.player.nickname +
        '.'
      );
    }
    if (packet.age === Age.CHILD) {
      (this.clientStorage.playerModelCache[
        packet.player.uuid
      ] as ModelPlayer).customIconChild = zlib.inflateSync(packet.icon);
      this.ModLoader.logger.info(
        'client: Saving custom icon for (Child) player ' +
        packet.player.nickname +
        '.'
      );
    }
  }

  @EventHandler(EventsClient.ON_PLAYER_LEAVE)
  onPlayerLeft(player: INetworkPlayer) {
    delete this.clientStorage.playerModelCache[player.uuid];
    if (this.allocationManager.isPlayerAllocated(player)) {
      this.allocationManager.deallocateSlot(this.allocationManager.getModelIndex(this.allocationManager.getPlayerAllocation(player)));
      this.allocationManager.deallocateSlot(this.allocationManager.getModelIndex(this.allocationManager.getAllocationByUUID(player.uuid + "_Equipment")!));
    }
    this.ModLoader.logger.info(this.allocationManager.getAvailableSlots() + " model blocks left!");
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
            this.ModLoader.utils.hashBuffer(def)
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
            this.ModLoader.utils.hashBuffer(def)
          ),
          packet.target
        );
      }

      if (this.clientStorage.adultIcon.byteLength > 1) {
        let def = zlib.deflateSync(this.clientStorage.adultIcon);
        this.ModLoader.clientSide.sendPacketToSpecificPlayer(
          new Z64_IconAllocatePacket(
            def,
            Age.ADULT,
            this.ModLoader.clientLobby,
            this.ModLoader.utils.hashBuffer(def)
          ),
          packet.target
        );
      }

      if (this.clientStorage.childIcon.byteLength > 1) {
        let def = zlib.deflateSync(this.clientStorage.childIcon);
        this.ModLoader.clientSide.sendPacketToSpecificPlayer(
          new Z64_IconAllocatePacket(
            def,
            Age.CHILD,
            this.ModLoader.clientLobby,
            this.ModLoader.utils.hashBuffer(def)
          ),
          packet.target
        );
      }
    }
    try {
      if (this.equipmentMap.size > 0) {
        let p = new Z64_EquipmentPakPacket(0x69, this.ModLoader.clientLobby);
        this.equipmentMap.forEach((value: Buffer, key: string) => {
          p.zobjs.push(zlib.deflateSync(value));
        });
        this.ModLoader.clientSide.sendPacket(p);
      }
    } catch (err) {
      console.log(err.stack);
    }
  }

  @EventHandler(Z64OnlineEvents.PLAYER_PUPPET_PRESPAWN)
  onPuppetPreSpawn(puppet: Puppet) {
    let puppet_spawn_params_ptr: number = (this.clientStorage.overlayCache["link_no_pvp.ovl"] as IOvlPayloadResult).params;
    console.log(puppet_spawn_params_ptr.toString(16));
    let puppet_spawn_variable_offset: number = 0xE;
    this.ModLoader.emulator.rdramWriteBuffer(this.allocationManager.getModelInSlot(0).pointer, new zzstatic(Z64LibSupportedGames.OCARINA_OF_TIME).doRepoint(this.ModLoader.utils.cloneBuffer(this.allocationManager.getModelInSlot(0).model.adult.zobj), 0, true, this.allocationManager.getModelInSlot(0).pointer));
    this.ModLoader.emulator.rdramWriteBuffer(this.allocationManager.getModelInSlot(1).pointer, new zzstatic(Z64LibSupportedGames.OCARINA_OF_TIME).doRepoint(this.ModLoader.utils.cloneBuffer(this.allocationManager.getModelInSlot(1).model.child.zobj), 0, true, this.allocationManager.getModelInSlot(1).pointer));
    this.ModLoader.emulator.rdramWrite16(puppet_spawn_params_ptr + puppet_spawn_variable_offset, puppet.age);

    if (!this.clientStorage.playerModelCache.hasOwnProperty(puppet.player.uuid)) return;

    if (!this.allocationManager.isPlayerAllocated(puppet.player)) {
      let mp = (this.clientStorage.playerModelCache[puppet.player.uuid] as ModelPlayer);
      let slot = this.allocationManager.allocateSlot(mp);
      this.ModLoader.logger.info("Trying to allocate model block " + slot + ".");
      let eq_mp = new ModelPlayer(puppet.player.uuid + "_Equipment");
      eq_mp.model.equipment = mp.model.equipment;
      this.allocationManager.allocateSlot(eq_mp);
    }
    this.ModLoader.logger.info("Getting model for player " + puppet.player.nickname + "...");
    let model: ModelPlayer = this.allocationManager.getPlayerAllocation(puppet.player);
    let eqList: ModelPlayer = this.allocationManager.getAllocationByUUID(puppet.player.uuid + "_Equipment")!;
    eqList.model.equipment = model.model.equipment;
    let index: number = this.allocationManager.getModelIndex(model);
    this.ModLoader.logger.info("This model is assigned to model block " + index + ".");
    let addr: number = model.pointer;
    this.ModLoader.logger.info("Model block " + index + " starts at address 0x" + addr.toString(16) + ".");
    let Model: Buffer;
    if (puppet.age === Age.ADULT) {
      Model = this.ModLoader.utils.cloneBuffer(model.model.adult.zobj);
    } else {
      Model = this.ModLoader.utils.cloneBuffer(model.model.child.zobj)
    }
    let passed: boolean = false;
    /* if (eqList.model.equipment.length > 0) {
      this.ModLoader.logger.debug("Loading equipment overrides...");
      let temp = new FakeHeap(this.ModLoader.emulator, eqList.pointer, 0x37800);
      for (let i = 0; i < eqList.model.equipment.length; i++) {
        let cp = this.ModLoader.utils.cloneBuffer(eqList.model.equipment[i].zobj);
        let cp_p = temp.malloc(cp.byteLength);
        this.ModLoader.emulator.rdramWriteBuffer(cp_p, new zzstatic(Z64LibSupportedGames.OCARINA_OF_TIME).doRepoint(cp, 0, true, cp_p));
        cp = this.ModLoader.emulator.rdramReadBuffer(cp_p, cp.byteLength);
        let eq = Buffer.from('45515549504D414E4946455354000000', 'hex');
        let index = cp.indexOf(eq);
        let str = "";
        let curByte: number = 0;
        let curIndex: number = index + 0x10;
        while (curByte !== 0xFF) {
          str += cp.slice(curIndex, curIndex + 1).toString();
          curByte = cp.slice(curIndex, curIndex + 1).readUInt8(0);
          curIndex++;
        }
        str = str.substr(0, str.length - 1);
        let data = JSON.parse(str);
        let header = cp.indexOf(Buffer.from('4D4F444C4F414445523634', 'hex'));
        header += 0x10;
        if (puppet.age === Age.ADULT) {
          Object.keys(data.OOT.adult).forEach((key: string) => {
            let i = header + (parseInt(key) * 0x8) + 0x4;
            let offset = parseInt(data.OOT.adult[key]) + 0x4;
            Model.writeUInt32BE(cp.readUInt32BE(i), offset);
          });
        } else {
          Object.keys(data.OOT.child).forEach((key: string) => {
            let i = header + (parseInt(key) * 0x8) + 0x4;
            let offset = parseInt(data.OOT.child[key]) + 0x4;
            Model.writeUInt32BE(cp.readUInt32BE(i), offset);
          });
        }
      }
    } */
    if (puppet.age === Age.ADULT && model.model.adult !== undefined) {
      if (model.model.adult.zobj.byteLength > 1) {
        this.ModLoader.logger.info("Writing adult model into model block " + index + ".");
        this.ModLoader.emulator.rdramWriteBuffer(addr, new zzstatic(Z64LibSupportedGames.OCARINA_OF_TIME).doRepoint(Model, 0, true, model.pointer));
        passed = true;
      }
    }
    if (puppet.age === Age.CHILD && model.model.child !== undefined) {
      if (model.model.child.zobj.byteLength > 1) {
        this.ModLoader.logger.info("Writing child model into model block " + index + ".");
        this.ModLoader.emulator.rdramWriteBuffer(addr, new zzstatic(Z64LibSupportedGames.OCARINA_OF_TIME).doRepoint(Model, 0, true, model.pointer));
        passed = true;
      }
    }
    if (passed) {
      this.ModLoader.emulator.rdramWrite16(puppet_spawn_params_ptr + puppet_spawn_variable_offset, index);
      this.ModLoader.emulator.rdramWrite32(puppet_spawn_params_ptr + 0x8, model.pointer);
    }
  }

  private dealWithEquipmentPaks(age: Age) {
    let allocation_size = 0x37800;
    if (this.equipmentMap.size > 0) {
      let model: Buffer;
      if (age === Age.ADULT) {
        model = this.ModLoader.emulator.rdramReadBuffer(this.clientStorage.adultProxy.pointer, allocation_size);
      } else {
        model = this.ModLoader.emulator.rdramReadBuffer(this.clientStorage.childProxy.pointer, allocation_size);
      }
      this.clearEquipmentHeap();

      let returnModel: () => void = () => {
        if (age === Age.ADULT) {
          this.ModLoader.emulator.rdramWriteBuffer(this.clientStorage.adultProxy.pointer, model);
        } else {
          this.ModLoader.emulator.rdramWriteBuffer(this.clientStorage.childProxy.pointer, model);
        }
      };

      let accessoriesWrapper = this.equipmentHeap.malloc(0x30);
      let accessoriesBuffer: SmartBuffer = new SmartBuffer();
      accessoriesBuffer.writeUInt32BE(0xDF000000); // 0x0
      accessoriesBuffer.writeUInt32BE(0x00000000); // 0x4
      accessoriesBuffer.writeUInt32BE(0xE7000000); // 0x8
      accessoriesBuffer.writeUInt32BE(0x00000000); // 0xC
      accessoriesBuffer.writeUInt32BE(0xDE000000); // 0x10
      accessoriesBuffer.writeUInt32BE(accessoriesWrapper); // 0x14 - Hat Slot
      accessoriesBuffer.writeUInt32BE(0xDE000000); // 0x18
      accessoriesBuffer.writeUInt32BE(accessoriesWrapper); // 0x1C - Glasses Slot
      accessoriesBuffer.writeUInt32BE(0xDF000000); // 0x20
      accessoriesBuffer.writeUInt32BE(0x00000000); // 0x24

      bus.emit(Z64OnlineEvents.EQUIPMENT_LOAD_START, {});
      this.equipmentMap.forEach((value: Buffer, key: string) => {
        let p = this.equipmentHeap.malloc(value.byteLength);
        this.ModLoader.emulator.rdramWriteBuffer(p, new zzstatic(Z64LibSupportedGames.OCARINA_OF_TIME).doRepoint(this.ModLoader.utils.cloneBuffer(value), 0, true, p));
        let a = new Z64Online_ModelAllocation(value, 0x69);
        a.pointer = p;
        bus.emit(Z64OnlineEvents.EQUIPMENT_ZOBJ_LOADED, a);
        let rp = this.ModLoader.emulator.rdramReadBuffer(p, value.byteLength);
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
        let data = JSON.parse(str);
        let header = rp.indexOf(Buffer.from('4D4F444C4F414445523634', 'hex'));
        header += 0x10;
        if (age === Age.ADULT) {
          Object.keys(data.OOT.adult).forEach((key: string) => {
            if (typeof (data.OOT.adult[key]) === 'string') {
              let i = header + (parseInt(key) * 0x8) + 0x4;
              let offset = parseInt(data.OOT.adult[key]) + 0x4;
              model.writeUInt32BE(rp.readUInt32BE(i), offset);
            } else if (typeof (data.OOT.adult[key]) === 'object') {
              if (data.OOT.adult[key].slot === "hat") {
                console.log("hat");
                let i = header + (parseInt(key) * 0x8) + 0x4;
                accessoriesBuffer.writeUInt32BE(rp.readUInt32BE(i), 0x14);
              } else if (data.OOT.adult[key].slot === "glasses") {
                console.log("glasses");
                let i = header + (parseInt(key) * 0x8) + 0x4;
                accessoriesBuffer.writeUInt32BE(rp.readUInt32BE(i), 0x1C);
              }
            }
          });
        } else {
          Object.keys(data.OOT.child).forEach((key: string) => {
            let i = header + (parseInt(key) * 0x8) + 0x4;
            let offset = parseInt(data.OOT.child[key]) + 0x4;
            model.writeUInt32BE(rp.readUInt32BE(i), offset);
          });
        }
      });
      // Hook head bone.
      let offset = model.readUInt32BE(0x50C8 + 0x4) - this.clientStorage.adultProxy.pointer;
      // Find a DF command.
      let cmd: number = model.readUInt32BE(offset);
      while (cmd !== 0xDF000000) {
        offset += 4;
        cmd = model.readUInt32BE(offset);
      }
      model.writeUInt32BE(0xDE010000, offset);
      offset += 4;
      model.writeUInt32BE(accessoriesWrapper + 0x8, offset);
      this.ModLoader.emulator.rdramWriteBuffer(accessoriesWrapper, accessoriesBuffer.toBuffer());
      console.log(accessoriesWrapper.toString(16));
      returnModel();
      bus.emit(Z64OnlineEvents.EQUIPMENT_LOAD_END, {});
    }
  }

  @EventHandler(OotEvents.ON_SCENE_CHANGE)
  onSceneChange(scene: number) {
    if (this.equipmentHeap === undefined) {
      this.createEquipmentHeap();
    }
    if (this.core.save.age === Age.ADULT) {
      if (this.proxyProcessFlags[0] > 0 && scene > -1) {
        return;
      }
      let link = this.doesLinkObjExist(Age.ADULT);
      if (link.exists) {
        if (this.clientStorage.adultProxy !== undefined) {
          this.ModLoader.logger.debug("Adult proxy scene change!");
          bus.emit(Z64OnlineEvents.FORCE_LOAD_MODEL_BLOCK, this.clientStorage.adultProxy.slot);
          this.dealWithEquipmentPaks(this.core.save.age);
          this.ModLoader.emulator.rdramWriteBuffer(link.pointer, this.ModLoader.emulator.rdramReadBuffer(this.clientStorage.adultProxy.pointer, 0x5380));
          let p = this.ModLoader.emulator.rdramRead32(this.clientStorage.adultProxy.pointer + 0x5380) - 0x150;
          let buf = this.ModLoader.emulator.rdramReadBuffer(p, 0x1B0);
          this.ModLoader.emulator.rdramWriteBuffer(link.pointer + 0xEC60 - 0x150, buf);
          this.ModLoader.rom.romWriteBuffer(this.clientStorage.adultProxy.rom, this.ModLoader.emulator.rdramReadBuffer(link.pointer, 0x37800));
          this.proxyProcessFlags[0] = 1;
        }
      }
    } else {
      if (this.proxyProcessFlags[1] > 0 && scene > -1) {
        return;
      }
      let link = this.doesLinkObjExist(Age.CHILD);
      if (link.exists) {
        if (this.clientStorage.childProxy !== undefined) {
          this.ModLoader.logger.debug("Child proxy scene change!");
          bus.emit(Z64OnlineEvents.FORCE_LOAD_MODEL_BLOCK, this.clientStorage.childProxy.slot);
          this.dealWithEquipmentPaks(this.core.save.age);
          this.ModLoader.emulator.rdramWriteBuffer(link.pointer, this.ModLoader.emulator.rdramReadBuffer(this.clientStorage.childProxy.pointer, 0x53A8));
          let p = this.ModLoader.emulator.rdramRead32(this.clientStorage.childProxy.pointer + 0x53A8) - 0x150;
          let buf = this.ModLoader.emulator.rdramReadBuffer(p, 0x1B0);
          this.ModLoader.emulator.rdramWriteBuffer(link.pointer + 0xEC60 - 0x150, buf);
          this.ModLoader.rom.romWriteBuffer(this.clientStorage.childProxy.rom, this.ModLoader.emulator.rdramReadBuffer(link.pointer, 0x22380));
          this.proxyProcessFlags[1] = 1;
        }
      }
    }
  }

  @EventHandler(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_ADULT_GAMEPLAY)
  onChangeModel(evt: Z64Online_ModelAllocation) {
    if (this.clientStorage.adultProxy === undefined) {
      return;
    }
    let adult_path: string = path.join(this.cacheDir, "adult.zobj");
    if (evt.model.byteLength === 1) {
      evt.model = fs.readFileSync(adult_path);
    }
    evt.model.writeUInt32BE(0x06005380, 0x500C);
    let modelObj = this.allocationManager.getModelInSlot(this.clientStorage.adultProxy.slot);
    modelObj.model.adult.zobj = evt.model;
    this.clientStorage.adultModel = evt.model;
    let link = this.doesLinkObjExist(Age.ADULT);
    if (link.exists) {
      if (this.clientStorage.adultProxy !== undefined) {
        this.ModLoader.logger.debug("Found Link proxy...");
        let proxy = trimBuffer(fs.readFileSync(path.resolve(__dirname, "zobjs", "OotO_Adult_Proxy.zobj")));
        this.ModLoader.emulator.rdramWriteBuffer(link.pointer, proxy);
        this.ModLoader.utils.setTimeoutFrames(() => {
          this.ModLoader.logger.debug("Loading new model...");
          bus.emit(Z64OnlineEvents.FORCE_LOAD_MODEL_BLOCK, this.clientStorage.adultProxy.slot);
          this.dealWithEquipmentPaks(Age.ADULT);
          this.ModLoader.logger.debug("Loading alias table into proxy...");
          this.ModLoader.emulator.rdramWriteBuffer(link.pointer, this.ModLoader.emulator.rdramReadBuffer(this.clientStorage.adultProxy.pointer, 0x5380));
          this.ModLoader.logger.debug("Loading hierarchy into proxy...");
          let p = this.ModLoader.emulator.rdramRead32(this.clientStorage.adultProxy.pointer + 0x5380) - 0x150;
          let buf = this.ModLoader.emulator.rdramReadBuffer(p, 0x1B0);
          this.ModLoader.emulator.rdramWriteBuffer(link.pointer + 0xEC60 - 0x150, buf);
          this.ModLoader.rom.romWriteBuffer(this.clientStorage.adultProxy.rom, this.ModLoader.emulator.rdramReadBuffer(link.pointer, 0x37800));
          this.proxyNeedsSync = true;
        }, 1);
      }
    }
  }

  @EventHandler(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_CHILD_GAMEPLAY)
  onChangeModelChild(evt: Z64Online_ModelAllocation) {
    if (this.clientStorage.childProxy === undefined) {
      return;
    }
    let child_path: string = path.join(this.cacheDir, "child.zobj");
    if (evt.model.byteLength === 1) {
      evt.model = fs.readFileSync(child_path);
    }
    evt.model.writeUInt32BE(0x060053A8, 0x500C);
    let modelObj = this.allocationManager.getModelInSlot(this.clientStorage.childProxy.slot);
    modelObj.model.child.zobj = evt.model;
    this.clientStorage.childModel = evt.model;
    let link = this.doesLinkObjExist(Age.CHILD);
    if (link.exists) {
      if (this.clientStorage.childProxy !== undefined) {
        this.ModLoader.logger.debug("Found Link proxy...");
        let proxy = trimBuffer(fs.readFileSync(path.resolve(__dirname, "zobjs", "OotO_Child_Proxy_v2.zobj")));
        this.ModLoader.emulator.rdramWriteBuffer(link.pointer, proxy);
        this.ModLoader.utils.setTimeoutFrames(() => {
          this.ModLoader.logger.debug("Loading new model...");
          bus.emit(Z64OnlineEvents.FORCE_LOAD_MODEL_BLOCK, this.clientStorage.childProxy.slot);
          this.dealWithEquipmentPaks(Age.CHILD);
          this.ModLoader.logger.debug("Loading alias table into proxy...");
          this.ModLoader.emulator.rdramWriteBuffer(link.pointer, this.ModLoader.emulator.rdramReadBuffer(this.clientStorage.childProxy.pointer, 0x53A8));
          this.ModLoader.logger.debug("Loading hierarchy into proxy...");
          let p = this.ModLoader.emulator.rdramRead32(this.clientStorage.childProxy.pointer + 0x53A8) - 0x150;
          let buf = this.ModLoader.emulator.rdramReadBuffer(p, 0x1B0);
          this.ModLoader.emulator.rdramWriteBuffer(link.pointer + 0xEC60 - 0x150, buf);
          this.ModLoader.rom.romWriteBuffer(this.clientStorage.childProxy.rom, this.ModLoader.emulator.rdramReadBuffer(link.pointer, 0x22380));
          this.proxyNeedsSync = true;
        }, 1);
      }
    }
  }

  @EventHandler(Z64OnlineEvents.REFRESH_EQUIPMENT)
  onRefresh() {
    this.ModLoader.utils.setTimeoutFrames(() => {
      this.onSceneChange(-1);
      this.proxyNeedsSync = true;
    }, 1);
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
}