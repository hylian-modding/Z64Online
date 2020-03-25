import {
  IModLoaderAPI,
  ModLoaderEvents,
  IPlugin,
} from 'modloader64_api/IModLoaderAPI';
import {
  EventHandler,
  EventsServer,
  EventServerLeft,
  EventsClient,
  EventServerJoined,
} from 'modloader64_api/EventHandler';
import { OotOnlineStorageClient } from '../../OotOnlineStorageClient';
import { zzstatic } from './zzstatic/src/zzstatic';
import zlib from 'zlib';
import {
  Ooto_AllocateModelPacket,
  Ooto_DownloadAllModelsPacket,
  Ooto_IconAllocatePacket,
} from '../OotOPackets';
import { Age, OotEvents } from 'modloader64_api/OOT/OOTAPI';
import {
  ServerNetworkHandler,
  INetworkPlayer,
  NetworkHandler,
} from 'modloader64_api/NetworkHandler';
import { OotOnlineStorage } from '../../OotOnlineStorage';
import { IOotOnlineHelpers, OotOnlineEvents, ICustomEquipment } from '../../OotoAPI/OotoAPI';
import { ModelPlayer } from './ModelPlayer';
import { ModelAllocationManager } from './ModelAllocationManager';
import { Puppet } from '../linkPuppet/Puppet';
import fs from 'fs';
import { ModelThread } from './ModelThread';
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import path from 'path';
import { Postinit } from 'modloader64_api/PluginLifecycle';
import { ModelObject } from './ModelContainer';
import { ModelEquipmentPackager } from './ModelEquipmentPackager';

export class FilePatch {
  offset: number;
  value: number;

  constructor(offset: number, value: number) {
    this.offset = offset;
    this.value = value;
  }
}

export class RomPatch {
  index: number;
  data: FilePatch[] = new Array<FilePatch>();

  constructor(index: number) {
    this.index = index;
  }
}

export class ModelManager {
  @ModLoaderAPIInject()
  ModLoader!: IModLoaderAPI;
  clientStorage: OotOnlineStorageClient;
  parent: IOotOnlineHelpers;
  allocationManager: ModelAllocationManager;
  customModelFileAdult = '';
  customModelFileChild = '';
  customModelFileEquipment = '';
  customModelFileDesc = '';
  customModelFileAnims = '';
  customModelRepointsAdult = __dirname + '/zobjs/adult_patch.zobj';
  customModelRepointsChild = __dirname + '/zobjs/child_patch.zobj';
  customModelFileAdultIcon = '';
  customModelFileChildIcon = '';
  cacheDir: string = "./cache";
  equipmentAdultMap: Map<string, number> = new Map<string, number>();
  equipmentChildMap: Map<string, number> = new Map<string, number>();
  equipmentIndex = -1;
  equipmentMetadata: any = {};

  constructor(
    clientStorage: OotOnlineStorageClient,
    parent: IOotOnlineHelpers
  ) {
    this.clientStorage = clientStorage;
    this.parent = parent;
    this.allocationManager = new ModelAllocationManager();
    let d: any = JSON.parse(fs.readFileSync(path.join(__dirname, "DlistMap.json")).toString());
    Object.keys(d.adult).forEach((key: string) => {
      this.equipmentAdultMap.set(key, parseInt(d.adult[key]));
    });
    Object.keys(d.child).forEach((key: string) => {
      this.equipmentChildMap.set(key, parseInt(d.child[key]));
    });
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

  @EventHandler(OotOnlineEvents.CUSTOM_MODEL_APPLIED_EQUIPMENT)
  onCustomModel6(data: ICustomEquipment) {
    this.customModelFileEquipment = data.zobj;
    this.customModelFileDesc = data.txt;
  }

  injectRawFileToRom(rom: Buffer, index: number, file: Buffer) {
    let dma = 0x7430;
    let offset: number = index * 0x10;
    let start: number = rom.readUInt32BE(dma + offset + 0x8);
    file.copy(rom, start);
  }

  getRawFileFromRom(rom: Buffer, index: number): Buffer {
    let dma = 0x7430;
    let offset: number = index * 0x10;
    let start: number = rom.readUInt32BE(dma + offset + 0x8);
    let end: number = rom.readUInt32BE(dma + offset + 0xc);
    let size: number = end - start;
    let isFileCompressed = true;
    if (end === 0) {
      isFileCompressed = false;
      size =
        rom.readUInt32BE(dma + offset + 0x4) - rom.readUInt32BE(dma + offset);
      end = start + size;
    }
    let buf: Buffer = Buffer.alloc(size);
    rom.copy(buf, 0, start, end);
    return buf;
  }

  decompressFileFromRom(rom: Buffer, index: number): Buffer {
    let dma = 0x7430;
    let offset: number = index * 0x10;
    let start: number = rom.readUInt32BE(dma + offset + 0x8);
    let end: number = rom.readUInt32BE(dma + offset + 0xc);
    let size: number = end - start;
    let isFileCompressed = true;
    if (end === 0) {
      isFileCompressed = false;
      size =
        rom.readUInt32BE(dma + offset + 0x4) - rom.readUInt32BE(dma + offset);
      end = start + size;
    }
    let buf: Buffer = Buffer.alloc(size);
    rom.copy(buf, 0, start, end);
    if (isFileCompressed) {
      buf = this.ModLoader.utils.yaz0Decode(buf);
    }
    return buf;
  }

  recompressFileIntoRom(rom: Buffer, index: number, file: Buffer): Buffer {
    let dma = 0x7430;
    let offset: number = index * 0x10;
    let start: number = rom.readUInt32BE(dma + offset + 0x8);
    let buf: Buffer = this.ModLoader.utils.yaz0Encode(file);
    buf.copy(rom, start);
    return buf;
  }

  @Postinit()
  loadEquipment() {
    if (this.customModelFileEquipment !== '') {
      let model = this.allocationManager.getModelInSlot(this.equipmentIndex);
      let allocation_size = 0x37800;
      let addr: number = 0x800000 + allocation_size * this.equipmentIndex;
      this.ModLoader.emulator.rdramWriteBuffer(addr, new zzstatic().doRepoint(model.model.equipment.zobj, this.equipmentIndex));
    }
  }

  @EventHandler(OotEvents.ON_LOADING_ZONE)
  onSceneChange(evt: any) {
    if (this.customModelFileEquipment !== '') {
      let model = this.allocationManager.getModelInSlot(this.equipmentIndex);
      let allocation_size = 0x37800;
      let addr: number = 0x800000 + allocation_size * this.equipmentIndex;
      this.ModLoader.emulator.rdramWriteBuffer(addr, new zzstatic().doRepoint(model.model.equipment.zobj, this.equipmentIndex));
    }
  }

  loadAdultModel(evt: any, file: string) {
    let adult = 502;
    let code = 27;
    let offset = 0xe65a0;
    this.ModLoader.logger.info('Loading new Link model (Adult)...');
    let adult_model: Buffer = fs.readFileSync(file);
    let a_copy: Buffer = Buffer.alloc(adult_model.byteLength);
    adult_model.copy(a_copy);
    if (this.customModelFileEquipment !== '') {
      Object.keys(this.equipmentMetadata).forEach((key: string) => {
        if (this.equipmentAdultMap.has(key)) {
          this.ModLoader.logger.info("Loading dlist replacement for " + key + ".");
          a_copy.writeUInt32BE(this.equipmentMetadata[key], this.equipmentAdultMap.get(key)! + 0x4);
        }
      });
    }
    let _adult_model = this.ModLoader.utils.yaz0Encode(a_copy);
    let adult_zobj = this.getRawFileFromRom(evt.rom, adult);
    this.ModLoader.utils.clearBuffer(adult_zobj);
    _adult_model.copy(adult_zobj);
    this.injectRawFileToRom(evt.rom, adult, adult_zobj);

    let patch: RomPatch[] = new Array<RomPatch>();
    patch = JSON.parse(fs.readFileSync(this.customModelRepointsAdult).toString());
    for (let i = 0; i < patch.length; i++) {
      let buf: Buffer = this.decompressFileFromRom(evt.rom, patch[i].index);
      for (let j = 0; j < patch[i].data.length; j++) {
        buf[patch[i].data[j].offset] = patch[i].data[j].value;
      }
      let hash: string = this.ModLoader.utils.hashBuffer(buf);
      if (fs.existsSync(path.join(this.cacheDir, hash))) {
        this.ModLoader.logger.debug("Loading file " + patch[i].index + " from cache.");
        this.injectRawFileToRom(evt.rom, patch[i].index, fs.readFileSync(path.join(this.cacheDir, hash)));
      } else {
        fs.writeFileSync(path.join(this.cacheDir, hash), this.recompressFileIntoRom(evt.rom, patch[i].index, buf));
      }
    }
    let code_file: Buffer = this.decompressFileFromRom(evt.rom, code);
    adult_model.writeUInt32BE(code_file.readUInt32BE(offset), 0x500c);
    this.clientStorage.adultModel = adult_model;
  }

  loadChildModel(evt: any, file: string) {
    let child = 503;
    let code = 27;
    let offset = 0xe65a0;
    this.ModLoader.logger.info('Loading new Link model (Child)...');
    let child_model: Buffer = fs.readFileSync(file);
    let a_copy: Buffer = Buffer.alloc(child_model.byteLength);
    child_model.copy(a_copy);

    if (this.customModelFileEquipment !== '') {
      Object.keys(this.equipmentMetadata).forEach((key: string) => {
        if (this.equipmentChildMap.has(key)) {
          this.ModLoader.logger.info("Loading dlist replacement for " + key + ".");
          a_copy.writeUInt32BE(this.equipmentMetadata[key], this.equipmentChildMap.get(key)! + 0x4);
        }
      });
    }

    let _child_model = this.ModLoader.utils.yaz0Encode(a_copy);
    let child_zobj = this.getRawFileFromRom(evt.rom, child);
    this.ModLoader.utils.clearBuffer(child_zobj);
    _child_model.copy(child_zobj);
    
    this.injectRawFileToRom(evt.rom, child, child_zobj);

    let patch: RomPatch[] = new Array<RomPatch>();
    patch = JSON.parse(fs.readFileSync(this.customModelRepointsChild).toString());
    for (let i = 0; i < patch.length; i++) {
      let buf: Buffer = this.decompressFileFromRom(evt.rom, patch[i].index);
      for (let j = 0; j < patch[i].data.length; j++) {
        buf[patch[i].data[j].offset] = patch[i].data[j].value;
      }

      let hash: string = this.ModLoader.utils.hashBuffer(buf);
      if (fs.existsSync(path.join(this.cacheDir, hash))) {
        this.ModLoader.logger.debug("Loading file " + patch[i].index + " from cache.");
        this.injectRawFileToRom(evt.rom, patch[i].index, fs.readFileSync(path.join(this.cacheDir, hash)));
      } else {
        fs.writeFileSync(path.join(this.cacheDir, hash), this.recompressFileIntoRom(evt.rom, patch[i].index, buf));
      }
    }

    let code_file: Buffer = this.decompressFileFromRom(evt.rom, code);
    child_model.writeUInt32BE(code_file.readUInt32BE(offset + 0x4), 0x500c);

    this.clientStorage.childModel = child_model;
  }

  @EventHandler(ModLoaderEvents.ON_ROM_PATCHED)
  onRomPatched(evt: any) {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir);
    }
    let patch: RomPatch[] = new Array<RomPatch>();
    patch = JSON.parse(
      this.ModLoader.utils
        .yaz0Decode(fs.readFileSync(this.customModelRepointsAdult))
        .toString()
    );
    fs.writeFileSync("./adult.json", JSON.stringify(patch, null, 2));
    patch = JSON.parse(
      this.ModLoader.utils
        .yaz0Decode(fs.readFileSync(this.customModelRepointsChild))
        .toString()
    );
    fs.writeFileSync("./child.json", JSON.stringify(patch, null, 2));
    if (this.customModelFileChild === '' && this.customModelFileAdult === '') {
      return;
    }
    this.ModLoader.logger.info('Starting custom model setup...');
    let anim = 7;

    if (this.customModelFileEquipment !== '') {
      if (this.customModelFileAdult !== '' || this.customModelFileChild !== '') {
        this.ModLoader.logger.info("Loading new equipment models...");
        let mm: ModelEquipmentPackager = new ModelEquipmentPackager(this.customModelFileEquipment, this.customModelFileDesc);
        let model = new ModelPlayer("Equipment");
        this.clientStorage.equipmentModel = mm.process();
        model.model.equipment = new ModelObject(this.clientStorage.equipmentModel);
        this.equipmentIndex = this.allocationManager.allocateSlot(model);
        let metaSize: number = model.model.equipment.zobj.readUInt32BE(0xC);
        this.equipmentMetadata = JSON.parse(model.model.equipment.zobj.slice(0x310, 0x310 + metaSize).toString());
        let allocation_size = 0x37800;
        let addr: number = 0x80800000 + allocation_size * this.equipmentIndex;
        Object.keys(this.equipmentMetadata).forEach((key: string) => {
          this.equipmentMetadata[key] += addr;
        });
      }
    }

    if (this.customModelFileAdult !== '') {
      this.loadAdultModel(evt, this.customModelFileAdult);
    }

    if (this.customModelFileChild !== '') {
      this.loadChildModel(evt, this.customModelFileChild);
    }

    if (this.customModelFileAnims !== '') {
      this.ModLoader.logger.info('Loading new animations...');
      let anim_file: Buffer = fs.readFileSync(this.customModelFileAnims);
      let anim_zobj: Buffer = this.getRawFileFromRom(evt.rom, anim);
      this.ModLoader.utils.clearBuffer(anim_zobj);
      anim_file.copy(anim_zobj);
      this.injectRawFileToRom(evt.rom, anim, anim_zobj);
    }

    if (this.customModelFileAdultIcon !== '') {
      this.ModLoader.logger.info('Loading custom map icon (Adult) ...');
      this.clientStorage.adultIcon = fs.readFileSync(
        this.customModelFileAdultIcon
      );
    }

    if (this.customModelFileChildIcon !== '') {
      this.ModLoader.logger.info('Loading custom map icon (Child) ...');
      this.clientStorage.childIcon = fs.readFileSync(
        this.customModelFileChildIcon
      );
    }

    if (this.clientStorage.adultModel.byteLength > 1) {
      this.ModLoader.clientSide.sendPacket(
        new Ooto_AllocateModelPacket(
          zlib.deflateSync(this.clientStorage.adultModel),
          Age.ADULT,
          this.ModLoader.clientLobby
        )
      );
    }
    if (this.clientStorage.childModel.byteLength > 1) {
      this.ModLoader.clientSide.sendPacket(
        new Ooto_AllocateModelPacket(
          zlib.deflateSync(this.clientStorage.childModel),
          Age.CHILD,
          this.ModLoader.clientLobby
        )
      );
    }
    if (this.clientStorage.equipmentModel.byteLength > 1) {
      this.ModLoader.clientSide.sendPacket(
        new Ooto_AllocateModelPacket(
          zlib.deflateSync(this.clientStorage.equipmentModel),
          0x69,
          this.ModLoader.clientLobby
        )
      );
    }
    if (this.clientStorage.childIcon.byteLength > 1) {
      this.ModLoader.clientSide.sendPacket(
        new Ooto_IconAllocatePacket(
          zlib.deflateSync(this.clientStorage.childIcon),
          Age.CHILD,
          this.ModLoader.clientLobby
        )
      );
    }
    if (this.clientStorage.adultIcon.byteLength > 1) {
      this.ModLoader.clientSide.sendPacket(
        new Ooto_IconAllocatePacket(
          zlib.deflateSync(this.clientStorage.adultIcon),
          Age.ADULT,
          this.ModLoader.clientLobby
        )
      );
    }

    this.ModLoader.logger.info('Done.');
  }

  @ServerNetworkHandler('Ooto_AllocateModelPacket')
  onModelAllocate_server(packet: Ooto_AllocateModelPacket) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
      packet.lobby,
      (this.parent as unknown) as IPlugin
    ) as OotOnlineStorage;
    if (!storage.playerModelCache.hasOwnProperty(packet.player.uuid)) {
      storage.playerModelCache[packet.player.uuid] = new ModelPlayer(packet.player.uuid);
    }
    if (packet.age === Age.CHILD) {
      storage.playerModelCache[
        packet.player.uuid
      ].model.child.zobj = zlib.inflateSync(packet.model);
      this.ModLoader.logger.info(
        'server: Saving custom child model for player ' +
        packet.player.nickname +
        '.'
      );
    } else if (packet.age === Age.ADULT) {
      storage.playerModelCache[
        packet.player.uuid
      ].model.adult.zobj = zlib.inflateSync(packet.model);
      this.ModLoader.logger.info(
        'server: Saving custom adult model for player ' +
        packet.player.nickname +
        '.'
      );
    } else if (packet.age === 0x69) {
      storage.playerModelCache[
        packet.player.uuid
      ].model.equipment.zobj = zlib.inflateSync(packet.model);
      this.ModLoader.logger.info(
        'server: Saving custom equipment model(s) for player ' +
        packet.player.nickname +
        '.'
      );
    }
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
      let thread: ModelThread = new ModelThread(
        (this.clientStorage.playerModelCache[packet.player.uuid] as ModelPlayer).model.child.zobj,
        this.ModLoader
      );
      thread.startThread();
      this.ModLoader.logger.info(
        'client: Saving custom child model for player ' +
        packet.player.nickname +
        '.'
      );
    } else if (packet.age === Age.ADULT) {
      (this.clientStorage.playerModelCache[packet.player.uuid] as ModelPlayer).model.setAdult(zlib.inflateSync(packet.model));
      let thread: ModelThread = new ModelThread(
        (this.clientStorage.playerModelCache[packet.player.uuid] as ModelPlayer).model.adult.zobj,
        this.ModLoader
      );
      thread.startThread();
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
      thread.startThread();
      this.ModLoader.logger.info(
        'client: Saving custom equipment model(s) for player ' +
        packet.player.nickname +
        '.'
      );
    }
  }

  @ServerNetworkHandler('Ooto_IconAllocatePacket')
  onIconAllocateServer(packet: Ooto_IconAllocatePacket) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
      packet.lobby,
      (this.parent as unknown) as IPlugin
    ) as OotOnlineStorage;
    if (!storage.playerModelCache.hasOwnProperty(packet.player.uuid)) {
      storage.playerModelCache[packet.player.uuid] = new ModelPlayer(packet.player.uuid);
    }
    if (packet.age === Age.ADULT) {
      (storage.playerModelCache[
        packet.player.uuid
      ] as ModelPlayer).customIconAdult = zlib.inflateSync(packet.icon);
      this.ModLoader.logger.info(
        'server: Saving custom icon for (Adult) player ' +
        packet.player.nickname +
        '.'
      );
    }
    if (packet.age === Age.CHILD) {
      (storage.playerModelCache[
        packet.player.uuid
      ] as ModelPlayer).customIconChild = zlib.inflateSync(packet.icon);
      this.ModLoader.logger.info(
        'server: Saving custom icon for (Child) player ' +
        packet.player.nickname +
        '.'
      );
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

  @EventHandler(EventsServer.ON_LOBBY_LEAVE)
  onServerPlayerLeft(evt: EventServerLeft) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
      evt.lobby,
      (this.parent as unknown) as IPlugin
    ) as OotOnlineStorage;
    delete storage.playerModelCache[evt.player.uuid];
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

  @EventHandler(EventsServer.ON_LOBBY_JOIN)
  onPlayerJoin_server(evt: EventServerJoined) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
      evt.lobby,
      (this.parent as unknown) as IPlugin
    ) as OotOnlineStorage;
    this.ModLoader.serverSide.sendPacketToSpecificPlayer(
      new Ooto_DownloadAllModelsPacket(storage.playerModelCache, evt.lobby),
      evt.player
    );
  }

  @NetworkHandler('Ooto_DownloadAllModelsPacket')
  onModelDownload(packet: Ooto_DownloadAllModelsPacket) {
    Object.keys(packet.models).forEach((key: string) => {
      this.clientStorage.playerModelCache[key] = new ModelPlayer(key);
      if (packet.models[key].model.adult.zobj.byteLength > 1) {
        (this.clientStorage.playerModelCache[key] as ModelPlayer).model.setAdult(packet.models[key].model.adult.zobj);
        let thread: ModelThread = new ModelThread(
          this.clientStorage.playerModelCache[key].model.adult.zobj,
          this.ModLoader
        );
        thread.startThread();
      }
      if (packet.models[key].model.child.zobj.byteLength > 1) {
        (this.clientStorage.playerModelCache[key] as ModelPlayer).model.setChild(packet.models[key].model.child.zobj);
        let thread: ModelThread = new ModelThread(
          this.clientStorage.playerModelCache[key].model.child.zobj,
          this.ModLoader
        );
        thread.startThread();
      }
      if (packet.models[key].model.equipment.zobj.byteLength > 1) {
        (this.clientStorage.playerModelCache[key] as ModelPlayer).model.setEquipment(packet.models[key].model.equipment.zobj);
        let thread: ModelThread = new ModelThread(
          this.clientStorage.playerModelCache[key].model.equipment.zobj,
          this.ModLoader
        );
        thread.startThread();
      }
    });
  }

  @EventHandler(OotOnlineEvents.PLAYER_PUPPET_PRESPAWN)
  onPuppetPreSpawn(puppet: Puppet) {
    if (
      !this.clientStorage.playerModelCache.hasOwnProperty(puppet.player.uuid)
    ) {
      if (puppet.age === Age.ADULT) {
        this.ModLoader.emulator.rdramWriteBuffer(
          0x800000,
          this.allocationManager.getModelInSlot(0).model.adult.zobj
        );
      } else {
        this.ModLoader.emulator.rdramWriteBuffer(
          0x837800,
          this.allocationManager.getModelInSlot(1).model.child.zobj
        );
      }
      this.ModLoader.emulator.rdramWrite16(0x60014e, puppet.age);
      return;
    }
    if (!this.allocationManager.isPlayerAllocated(puppet.player)) {
      this.allocationManager.allocateSlot((this.clientStorage.playerModelCache[puppet.player.uuid] as ModelPlayer));
      this.ModLoader.logger.info(this.allocationManager.getAvailableSlots() + " model blocks left!");
    }
    let model: ModelPlayer = this.allocationManager.getPlayerAllocation(
      puppet.player
    );
    let index: number = this.allocationManager.getModelIndex(model);
    let allocation_size = 0x37800;
    let addr: number = 0x800000 + allocation_size * index;
    let zobj_size: number = allocation_size;
    if (puppet.age === Age.ADULT && model.model.adult !== undefined) {
      if (model.model.adult.zobj.byteLength > 1) {
        this.ModLoader.emulator.rdramWriteBuffer(
          addr,
          new zzstatic().doRepoint(model.model.adult.zobj, index)
        );
        zobj_size = model.model.adult.zobj.byteLength;
      }
    }
    if (puppet.age === Age.CHILD && model.model.child !== undefined) {
      if (model.model.child.zobj.byteLength > 1) {
        this.ModLoader.emulator.rdramWriteBuffer(
          addr,
          new zzstatic().doRepoint(model.model.child.zobj, index)
        );
        zobj_size = model.model.child.zobj.byteLength;
      }
    }
    if (model.model.equipment !== undefined) {
      if (model.model.equipment.zobj.byteLength > 1) {
        if ((zobj_size + (model.model.equipment.zobj.byteLength - 0x800)) < allocation_size) {
          let zobj: Buffer = new zzstatic().doRepoint(model.model.equipment.zobj, 0, false, 0x80000000 + addr + zobj_size - 0x800);
          this.ModLoader.emulator.rdramWriteBuffer(
            addr + zobj_size,
            zobj.slice(0x800)
          );
          let metaSize: number = model.model.equipment.zobj.readUInt32BE(0xC);
          let temp_equipmentMetadata: any = {};
          temp_equipmentMetadata = JSON.parse(model.model.equipment.zobj.slice(0x310, 0x310 + metaSize).toString());
          Object.keys(temp_equipmentMetadata).forEach((key: string) => {
            if (this.equipmentAdultMap.has(key) || this.equipmentChildMap.has(key)) {
              this.ModLoader.logger.info("Loading dlist replacement for " + key + ".");
              if (puppet.age === Age.ADULT){
                this.ModLoader.emulator.rdramWrite32(addr + this.equipmentAdultMap.get(key)! + 0x4, zobj.readUInt32BE(temp_equipmentMetadata[key] + 0x4));
              }else if (puppet.age === Age.CHILD){
                this.ModLoader.emulator.rdramWrite32(addr + this.equipmentChildMap.get(key)! + 0x4, zobj.readUInt32BE(temp_equipmentMetadata[key] + 0x4));
              }
            }
          });
        } else {
          this.ModLoader.logger.warn("Can't allocate equipment zobj in slot " + index + "!");
        }
      }
    }
    this.ModLoader.emulator.rdramWrite16(0x60014e, index);
  }

  @EventHandler(OotOnlineEvents.PLAYER_PUPPET_DESPAWNED)
  onPuppetDespawn(puppet: Puppet) { }
}
