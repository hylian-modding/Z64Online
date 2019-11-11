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
import zlib, { deflateRaw } from 'zlib';
import {
  Ooto_AllocateModelPacket,
  Ooto_DownloadAllModelsPacket,
} from '../OotOPackets';
import { Age } from 'modloader64_api/OOT/OOTAPI';
import {
  ServerNetworkHandler,
  INetworkPlayer,
  NetworkHandler,
} from 'modloader64_api/NetworkHandler';
import { OotOnlineStorage } from '../../OotOnlineStorage';
import {
  IOotOnlineHelpers,
  OotOnlineEvents,
  Ooto_CustomModelMetadata,
} from '../../OotoAPI/OotoAPI';
import { ModelPlayer } from './ModelPlayer';
import { ModelAllocationManager } from './ModelAllocationManager';
import { Puppet } from '../linkPuppet/Puppet';
import { Zobj } from './zzstatic/src/data/zobj';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { ModelThread } from './ModelThread';

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
  hashOriginal!: string;
  hash!: string;

  constructor(index: number) {
    this.index = index;
  }
}

export class ModelManager {
  ModLoader: IModLoaderAPI;
  clientStorage: OotOnlineStorageClient;
  parent: IOotOnlineHelpers;
  allocationManager: ModelAllocationManager;
  customModelFileAdult = '';
  customModelFileChild = '';
  customModelFileAnims = '';
  customModelRepointsAdult = __dirname + '/zobjs/adult_patch.zobj';
  customModelRepointsChild = __dirname + '/zobjs/child_patch.zobj';

  constructor(
    ModLoader: IModLoaderAPI,
    clientStorage: OotOnlineStorageClient,
    parent: IOotOnlineHelpers
  ) {
    this.ModLoader = ModLoader;
    this.clientStorage = clientStorage;
    this.parent = parent;
    this.allocationManager = new ModelAllocationManager();
  }

  @EventHandler(OotOnlineEvents.CUSTOM_MODEL_APPLIED_ADULT)
  onCustomModel(evt: Ooto_CustomModelMetadata) {
    this.customModelFileAdult = evt.model;
    console.log(evt);
  }

  @EventHandler(OotOnlineEvents.CUSTOM_MODEL_APPLIED_CHILD)
  onCustomModel2(evt: Ooto_CustomModelMetadata) {
    this.customModelFileChild = evt.model;
    console.log(evt);
  }

  @EventHandler(OotOnlineEvents.CUSTOM_MODEL_APPLIED_ANIMATIONS)
  onCustomModel3(file: string) {
    this.customModelFileAnims = file;
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

  recompressFileIntoRom(rom: Buffer, index: number, file: Buffer) {
    let dma = 0x7430;
    let offset: number = index * 0x10;
    let start: number = rom.readUInt32BE(dma + offset + 0x8);
    let buf: Buffer = this.ModLoader.utils.yaz0Encode(file);
    buf.copy(rom, start);
  }

  @EventHandler(ModLoaderEvents.ON_ROM_PATCHED)
  onRomPatched(evt: any) {
    if (this.customModelFileChild === '' && this.customModelFileAdult === '') {
      return;
    }
    console.log('Starting custom model setup...');
    let adult = 502;
    let child = 503;
    let code = 27;
    let offset = 0xe65a0;

    if (this.customModelFileAdult !== '') {
      console.log('Loading new Link model (Adult)...');
      let adult_model: Buffer = fs.readFileSync(this.customModelFileAdult);
      let _adult_model = this.ModLoader.utils.yaz0Encode(adult_model);
      let adult_zobj = this.getRawFileFromRom(evt.rom, adult);
      _adult_model.copy(adult_zobj);
      this.injectRawFileToRom(evt.rom, adult, adult_zobj);

      let patch: RomPatch[] = new Array<RomPatch>();
      patch = JSON.parse(
        this.ModLoader.utils
          .yaz0Decode(fs.readFileSync(this.customModelRepointsAdult))
          .toString()
      );
      for (let i = 0; i < patch.length; i++) {
        let buf: Buffer = this.decompressFileFromRom(evt.rom, patch[i].index);
        for (let j = 0; j < patch[i].data.length; j++) {
          buf[patch[i].data[j].offset] = patch[i].data[j].value;
        }
        this.recompressFileIntoRom(evt.rom, patch[i].index, buf);
      }

      let code_file: Buffer = this.decompressFileFromRom(evt.rom, code);
      adult_model.writeUInt32BE(code_file.readUInt32BE(offset), 0x500c);

      this.clientStorage.adultModel = adult_model;
    }

    if (this.customModelFileChild !== '') {
      console.log('Loading new Link model (Child)...');
      let child_model: Buffer = fs.readFileSync(this.customModelFileChild);
      let _child_model = this.ModLoader.utils.yaz0Encode(child_model);
      let child_zobj = this.getRawFileFromRom(evt.rom, child);
      _child_model.copy(child_zobj);
      this.injectRawFileToRom(evt.rom, child, child_zobj);

      let patch: RomPatch[] = new Array<RomPatch>();
      patch = JSON.parse(
        this.ModLoader.utils
          .yaz0Decode(fs.readFileSync(this.customModelRepointsChild))
          .toString()
      );
      for (let i = 0; i < patch.length; i++) {
        let buf: Buffer = this.decompressFileFromRom(evt.rom, patch[i].index);
        for (let j = 0; j < patch[i].data.length; j++) {
          buf[patch[i].data[j].offset] = patch[i].data[j].value;
        }
        this.recompressFileIntoRom(evt.rom, patch[i].index, buf);
      }

      let code_file: Buffer = this.decompressFileFromRom(evt.rom, code);
      child_model.writeUInt32BE(code_file.readUInt32BE(offset + 0x4), 0x500c);

      this.clientStorage.childModel = child_model;
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

    console.log('Done.');
  }

  onPostInit() {
    this.ModLoader.emulator.rdramWriteBuffer(
      0x800000,
      this.allocationManager.models[0].model.adult
    );
    this.ModLoader.emulator.rdramWriteBuffer(
      0x837800,
      this.allocationManager.models[1].model.child
    );
  }

  @ServerNetworkHandler('Ooto_AllocateModelPacket')
  onModelAllocate_server(packet: Ooto_AllocateModelPacket) {
    let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
      packet.lobby,
      (this.parent as unknown) as IPlugin
    ) as OotOnlineStorage;
    if (!storage.playerModelCache.hasOwnProperty(packet.player.uuid)) {
      storage.playerModelCache[packet.player.uuid] = new ModelPlayer(
        packet.player.uuid
      );
    }
    if (packet.age === Age.CHILD) {
      storage.playerModelCache[
        packet.player.uuid
      ].model.child = zlib.inflateSync(packet.model);
      console.log(
        'server: Saving custom child model for player ' +
          packet.player.nickname +
          '.'
      );
    } else if (packet.age === Age.ADULT) {
      storage.playerModelCache[
        packet.player.uuid
      ].model.adult = zlib.inflateSync(packet.model);
      console.log(
        'server: Saving custom adult model for player ' +
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
      this.clientStorage.playerModelCache[packet.player.uuid] = new ModelPlayer(
        packet.player.uuid
      );
    }
    if (packet.age === Age.CHILD) {
      this.clientStorage.playerModelCache[
        packet.player.uuid
      ].model.child = zlib.inflateSync(packet.model);
      let thread: ModelThread = new ModelThread(
        this.clientStorage.playerModelCache[packet.player.uuid].model.child,
        this.ModLoader
      );
      thread.startThread();
      console.log(
        'client: Saving custom child model for player ' +
          packet.player.nickname +
          '.'
      );
    } else if (packet.age === Age.ADULT) {
      this.clientStorage.playerModelCache[
        packet.player.uuid
      ].model.adult = zlib.inflateSync(packet.model);
      let thread: ModelThread = new ModelThread(
        this.clientStorage.playerModelCache[packet.player.uuid].model.adult,
        this.ModLoader
      );
      thread.startThread();
      console.log(
        'client: Saving custom adult model for player ' +
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
      this.clientStorage.playerModelCache[key] = packet.models[key];
      if (this.clientStorage.playerModelCache[key].model.adult !== undefined) {
        let thread: ModelThread = new ModelThread(
          this.clientStorage.playerModelCache[key].model.adult,
          this.ModLoader
        );
        thread.startThread();
      }
      if (this.clientStorage.playerModelCache[key].model.child !== undefined) {
        let thread: ModelThread = new ModelThread(
          this.clientStorage.playerModelCache[key].model.child,
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
      this.ModLoader.emulator.rdramWrite16(0x60014e, puppet.age);
      return;
    }
    if (!this.allocationManager.isPlayerAllocated(puppet.player)) {
      this.allocationManager.allocateSlot(
        this.clientStorage.playerModelCache[puppet.player.uuid]
      );
    }
    let model: ModelPlayer = this.allocationManager.getPlayerAllocation(
      puppet.player
    );
    let index: number = this.allocationManager.getModelIndex(model);
    if (model.model.loadedModel === (puppet.age as number)) {
      this.ModLoader.emulator.rdramWrite16(0x60014e, index);
      return;
    }
    let allocation_size = 0x37800;
    let addr: number = 0x800000 + allocation_size * index;
    console.log(index + ' ' + addr.toString(16));
    if (puppet.age === Age.ADULT && model.model.adult !== undefined) {
      let buf: Buffer = Buffer.alloc(model.model.adult.byteLength);
      model.model.adult.copy(buf);
      this.ModLoader.emulator.rdramWriteBuffer(
        addr,
        new zzstatic().doRepoint(buf, index)
      );
    }
    if (puppet.age === Age.CHILD && model.model.child !== undefined) {
      let buf: Buffer = Buffer.alloc(model.model.child.byteLength);
      model.model.child.copy(buf);
      this.ModLoader.emulator.rdramWriteBuffer(
        addr,
        new zzstatic().doRepoint(buf, index)
      );
    }
    this.ModLoader.emulator.rdramWrite16(0x60014e, index);
  }

  @EventHandler(OotOnlineEvents.PLAYER_PUPPET_DESPAWNED)
  onPuppetDespawn(puppet: Puppet) {}
}
