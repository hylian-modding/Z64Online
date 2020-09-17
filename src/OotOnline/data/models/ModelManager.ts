import {
  IModLoaderAPI,
  ModLoaderEvents,
} from 'modloader64_api/IModLoaderAPI';
import {
  EventHandler,
  EventsClient,
} from 'modloader64_api/EventHandler';
import { OotOnlineStorageClient } from '../../OotOnlineStorageClient';
import zlib from 'zlib';
import {
  Ooto_AllocateModelPacket,
  Ooto_IconAllocatePacket,
  OotO_GiveModelPacket,
  OotO_ModifyModelPacket,
} from '../OotOPackets';
import { Age, OotEvents, IOOTCore } from 'modloader64_api/OOT/OOTAPI';
import {
  INetworkPlayer,
  NetworkHandler,
} from 'modloader64_api/NetworkHandler';
import { OotOnlineEvents } from '../../OotoAPI/OotoAPI';
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
import { ModelThread } from 'Z64Lib/API/ModelThread';

export class ModelManagerClient {
  @ModLoaderAPIInject()
  ModLoader!: IModLoaderAPI;
  @InjectCore()
  core!: IOOTCore;
  clientStorage!: OotOnlineStorageClient;
  allocationManager: ModelAllocationManager;
  customModelFileAdult = '';
  customModelFileChild = '';
  customModelFileAnims = '';
  customModelRepointsAdult = __dirname + '/zobjs/adult.json';
  customModelRepointsChild = __dirname + '/zobjs/child.json';
  customModelFileAdultIcon = '';
  customModelFileChildIcon = '';
  cacheDir: string = "./cache";
  isThreaded: boolean = false;

  constructor() {
    this.allocationManager = new ModelAllocationManager();
  }

  @EventHandler(OotOnlineEvents.CUSTOM_MODEL_APPLIED_ADULT)
  onCustomModel(file: string) {
    this.customModelFileAdult = file;
  }

  @EventHandler(OotOnlineEvents.CUSTOM_MODEL_APPLIED_CHILD)
  onCustomModel2(file: string) {
    this.customModelFileChild = file;
  }

  @EventHandler(OotOnlineEvents.CUSTOM_MODEL_APPLIED_ANIMATIONS)
  onCustomModel3(file: string) {
    this.customModelFileAnims = file;
  }

  @EventHandler(OotOnlineEvents.CUSTOM_MODEL_APPLIED_ICON_ADULT)
  onCustomModel4(file: string) {
    this.customModelFileAdultIcon = file;
  }

  @EventHandler(OotOnlineEvents.CUSTOM_MODEL_APPLIED_ICON_CHILD)
  onCustomModel5(file: string) {
    this.customModelFileChildIcon = file;
  }

  @EventHandler(OotOnlineEvents.CUSTOM_MODEL_OVERRIDE_ADULT)
  onOverrideAdult(evt: any) {
    this.customModelFileAdult = evt.p;
  }

  @EventHandler(OotOnlineEvents.CUSTOM_MODEL_OVERRIDE_CHILD)
  onOverrideChild(evt: any) {
    this.customModelFileChild = evt.p;
  }

  loadAdultModel(evt: any, file: string) {
    let tools: Z64RomTools = new Z64RomTools(this.ModLoader, global.ModLoader.isDebugRom ? Z64LibSupportedGames.DEBUG_OF_TIME : Z64LibSupportedGames.OCARINA_OF_TIME);
    let model: Buffer = fs.readFileSync(file);
    let manifest: OOTAdultManifest = new OOTAdultManifest();
    if (manifest.repoint(this.ModLoader, evt.rom, model)) {
      manifest.inject(this.ModLoader, evt.rom, model);
      let code_file: Buffer = tools.decompressDMAFileFromRom(evt.rom, 27);
      let offset: number = 0xE65A0;
      model.writeUInt32BE(code_file.readUInt32BE(offset), 0x500c);
      this.clientStorage.adultModel = model;
    }
  }

  loadChildModel(evt: any, file: string) {
    let tools: Z64RomTools = new Z64RomTools(this.ModLoader, global.ModLoader.isDebugRom ? Z64LibSupportedGames.DEBUG_OF_TIME : Z64LibSupportedGames.OCARINA_OF_TIME);
    let model: Buffer = fs.readFileSync(file);
    let manifest: OOTChildManifest = new OOTChildManifest();
    if (manifest.repoint(this.ModLoader, evt.rom, model)) {
      manifest.inject(this.ModLoader, evt.rom, model);
      let code_file: Buffer = tools.decompressDMAFileFromRom(evt.rom, 27);
      let offset: number = 0xE65A0 + 0x4;
      model.writeUInt32BE(code_file.readUInt32BE(offset), 0x500c);
      this.clientStorage.childModel = model;
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
    a.model.adult = new ModelObject(trimBuffer(new zzstatic(Z64LibSupportedGames.OCARINA_OF_TIME).doRepoint(puppet_adult, 0)));
    let c = new ModelPlayer("Child");
    c.model.child = new ModelObject(trimBuffer(new zzstatic(Z64LibSupportedGames.OCARINA_OF_TIME).doRepoint(puppet_child, 1)));
    this.allocationManager.models[0] = a;
    this.allocationManager.models[1] = c;
  }

  @EventHandler(ModLoaderEvents.ON_ROM_PATCHED_PRE)
  onRomPatchedPre(evt: any) {
    this.setupPuppetModels(evt);
  }

  @EventHandler(ModLoaderEvents.ON_ROM_PATCHED)
  onRomPatched(evt: any) {
    let tools: Z64RomTools = new Z64RomTools(this.ModLoader, global.ModLoader.isDebugRom ? Z64LibSupportedGames.DEBUG_OF_TIME : Z64LibSupportedGames.OCARINA_OF_TIME);
    this.ModLoader.logger.info('Starting custom model setup...');
    let anim = 7;

    if (evt.rom.byteLength < (64 * 1024 * 1024)) {
      let resize = Buffer.alloc(64 * 1024 * 1024);
      evt.rom.copy(resize);
      evt.rom = resize;
    }

    if (this.customModelFileAdult !== '') {
      this.loadAdultModel(evt, this.customModelFileAdult);
      let def = zlib.deflateSync(this.clientStorage.adultModel);
      this.ModLoader.clientSide.sendPacket(
        new Ooto_AllocateModelPacket(
          def,
          Age.ADULT,
          this.ModLoader.clientLobby,
          this.ModLoader.utils.hashBuffer(def)
        )
      );
    }

    if (this.customModelFileChild !== '') {
      this.loadChildModel(evt, this.customModelFileChild);
      let def = zlib.deflateSync(this.clientStorage.childModel);
      this.ModLoader.clientSide.sendPacket(
        new Ooto_AllocateModelPacket(
          def,
          Age.CHILD,
          this.ModLoader.clientLobby,
          this.ModLoader.utils.hashBuffer(def)
        )
      );
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
        new Ooto_IconAllocatePacket(
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
        new Ooto_IconAllocatePacket(
          def,
          Age.CHILD,
          this.ModLoader.clientLobby,
          this.ModLoader.utils.hashBuffer(def)
        )
      );
    }

    this.ModLoader.logger.info('Done.');
    this.ModLoader.clientSide.sendPacket(new OotO_GiveModelPacket(this.ModLoader.clientLobby, this.ModLoader.me));
  }

  @NetworkHandler('Ooto_AllocateModelPacket')
  onModelAllocate_client(packet: Ooto_AllocateModelPacket) {
    if (
      !this.clientStorage.playerModelCache.hasOwnProperty(packet.player.uuid)
    ) {
      this.clientStorage.playerModelCache[packet.player.uuid] = new ModelPlayer(packet.player.uuid);
    }
    if (packet.age === Age.CHILD) {
      (this.clientStorage.playerModelCache[packet.player.uuid] as ModelPlayer).model.setChild(zlib.inflateSync(packet.model));
      if (this.isThreaded) {
        let thread: ModelThread = new ModelThread(
          (this.clientStorage.playerModelCache[packet.player.uuid] as ModelPlayer).model.child.zobj,
          this.ModLoader
        );
        thread.startThread(Z64LibSupportedGames.OCARINA_OF_TIME);
      }
      this.ModLoader.logger.info(
        'client: Saving custom child model for player ' +
        packet.player.nickname +
        '.'
      );
    } else if (packet.age === Age.ADULT) {
      (this.clientStorage.playerModelCache[packet.player.uuid] as ModelPlayer).model.setAdult(zlib.inflateSync(packet.model));
      if (this.isThreaded) {
        let thread: ModelThread = new ModelThread(
          (this.clientStorage.playerModelCache[packet.player.uuid] as ModelPlayer).model.adult.zobj,
          this.ModLoader
        );
        thread.startThread(Z64LibSupportedGames.OCARINA_OF_TIME);
      }
      this.ModLoader.logger.info(
        'client: Saving custom adult model for player ' +
        packet.player.nickname +
        '.'
      );
    } else if (packet.age === 0x69) {
      (this.clientStorage.playerModelCache[packet.player.uuid] as ModelPlayer).model.setEquipment(zlib.inflateSync(packet.model));
      let thread: ModelThread = new ModelThread(
        (this.clientStorage.playerModelCache[packet.player.uuid] as ModelPlayer).model.equipment.zobj,
        this.ModLoader
      );
      thread.startThread(Z64LibSupportedGames.OCARINA_OF_TIME);
      this.ModLoader.logger.info(
        'client: Saving custom equipment model(s) for player ' +
        packet.player.nickname +
        '.'
      );
    }
  }

  @NetworkHandler('OotO_ModifyModelPacket')
  onModelMod(packet: OotO_ModifyModelPacket) {
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
      let allocation_size = 0x37800;
      let addr: number = 0x800000 + allocation_size * index;
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

  @NetworkHandler('Ooto_IconAllocatePacket')
  onIconAllocateClient(packet: Ooto_IconAllocatePacket) {
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
      this.allocationManager.deallocateSlot(
        this.allocationManager.getModelIndex(
          this.allocationManager.getPlayerAllocation(player)
        )
      );
    }
    this.ModLoader.logger.info(this.allocationManager.getAvailableSlots() + " model blocks left!");
  }

  @NetworkHandler("OotO_GiveModelPacket")
  onPlayerJoin_client(packet: OotO_GiveModelPacket) {
    if (packet.target.uuid !== this.ModLoader.me.uuid) {
      if (this.clientStorage.adultModel.byteLength > 1) {
        let def = zlib.deflateSync(this.clientStorage.adultModel);
        this.ModLoader.clientSide.sendPacketToSpecificPlayer(
          new Ooto_AllocateModelPacket(
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
          new Ooto_AllocateModelPacket(
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
          new Ooto_IconAllocatePacket(
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
          new Ooto_IconAllocatePacket(
            def,
            Age.CHILD,
            this.ModLoader.clientLobby,
            this.ModLoader.utils.hashBuffer(def)
          ),
          packet.target
        );
      }
    }
  }

  @EventHandler("OotOnline:WriteDefaultPuppetZobjs")
  onWriteRequest(evt: any) {
    this.ModLoader.logger.debug("Writing default models...");
    this.ModLoader.emulator.rdramWriteBuffer(
      0x800000,
      this.allocationManager.getModelInSlot(0).model.adult.zobj
    );
    this.ModLoader.emulator.rdramWriteBuffer(
      0x837800,
      this.allocationManager.getModelInSlot(1).model.child.zobj
    );
  }

  @EventHandler(OotOnlineEvents.PLAYER_PUPPET_PRESPAWN)
  onPuppetPreSpawn(puppet: Puppet) {
    let puppet_spawn_params_ptr: number = 0x80600140;
    let puppet_spawn_variable_offset: number = 0xE;
    this.ModLoader.emulator.rdramWriteBuffer(
      0x800000,
      this.allocationManager.getModelInSlot(0).model.adult.zobj
    );
    this.ModLoader.emulator.rdramWriteBuffer(
      0x837800,
      this.allocationManager.getModelInSlot(1).model.child.zobj
    );
    this.ModLoader.emulator.rdramWritePtr16(puppet_spawn_params_ptr, puppet_spawn_variable_offset, puppet.age);
    if (
      !this.clientStorage.playerModelCache.hasOwnProperty(puppet.player.uuid)
    ) {
      return;
    }
    if (!this.allocationManager.isPlayerAllocated(puppet.player)) {
      let slot = this.allocationManager.allocateSlot((this.clientStorage.playerModelCache[puppet.player.uuid] as ModelPlayer));
      this.ModLoader.logger.info("Trying to allocate model block " + slot + ".");
      this.ModLoader.logger.info(this.allocationManager.getAvailableSlots() + " model blocks left!");
    }
    this.ModLoader.logger.info("Getting model for player " + puppet.player.nickname + "...");
    let model: ModelPlayer = this.allocationManager.getPlayerAllocation(
      puppet.player
    );
    let index: number = this.allocationManager.getModelIndex(model);
    this.ModLoader.logger.info("This model is assigned to model block " + index + ".");
    let allocation_size = 0x37800;
    let addr: number = 0x800000 + allocation_size * index;
    this.ModLoader.logger.info("Model block " + index + " starts at address 0x" + addr.toString(16) + ".");
    let zobj_size: number = allocation_size;
    let passed: boolean = false;
    if (puppet.age === Age.ADULT && model.model.adult !== undefined) {
      if (model.model.adult.zobj.byteLength > 1) {
        this.ModLoader.logger.info("Writing adult model into model block " + index + ".");
        this.ModLoader.emulator.rdramWriteBuffer(
          addr,
          new zzstatic(Z64LibSupportedGames.OCARINA_OF_TIME).doRepoint(this.ModLoader.utils.cloneBuffer(model.model.adult.zobj), index)
        );
        zobj_size = model.model.adult.zobj.byteLength;
        passed = true;
      }
    }
    if (puppet.age === Age.CHILD && model.model.child !== undefined) {
      if (model.model.child.zobj.byteLength > 1) {
        this.ModLoader.logger.info("Writing child model into model block " + index + ".");
        this.ModLoader.emulator.rdramWriteBuffer(
          addr,
          new zzstatic(Z64LibSupportedGames.OCARINA_OF_TIME).doRepoint(this.ModLoader.utils.cloneBuffer(model.model.child.zobj), index)
        );
        zobj_size = model.model.child.zobj.byteLength;
        passed = true;
      }
    }
    if (passed) {
      this.ModLoader.emulator.rdramWritePtr16(puppet_spawn_params_ptr, puppet_spawn_variable_offset, index);
    }
  }

  @EventHandler(OotEvents.ON_SCENE_CHANGE)
  onSceneChange(scene: number) {
    this.ModLoader.emulator.rdramWriteBuffer(
      0x800000,
      this.allocationManager.getModelInSlot(0).model.adult.zobj
    );
    this.ModLoader.emulator.rdramWriteBuffer(
      0x837800,
      this.allocationManager.getModelInSlot(1).model.child.zobj
    );
  }

  @EventHandler(EventsClient.ON_INJECT_FINISHED)
  onLoaded(evt: any) {
    this.ModLoader.emulator.rdramWriteBuffer(
      0x800000,
      this.allocationManager.getModelInSlot(0).model.adult.zobj
    );
    this.ModLoader.emulator.rdramWriteBuffer(
      0x837800,
      this.allocationManager.getModelInSlot(1).model.child.zobj
    );
  }
}