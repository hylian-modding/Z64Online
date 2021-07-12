import { ModelPlayer } from './ModelPlayer';
import { INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { ModelObject, ModelReference } from '../../common/cosmetics/ModelContainer';
import { zzstatic } from 'Z64Lib/API/zzstatic';
import fs from 'fs';
import path from 'path';
import { Z64LibSupportedGames } from 'Z64Lib/API/Z64LibSupportedGames';
import { Age } from 'modloader64_api/OOT/OOTAPI';
import { IModelReference } from '@OotOnline/Z64API/OotoAPI';

export class ModelAllocationManager {
  private ModLoader: IModLoaderAPI;
  private localPlayer: ModelPlayer = new ModelPlayer("LOCAL PLAYER");
  private playerMLObjects: Map<string, INetworkPlayer> = new Map<string, INetworkPlayer>();
  private players: Map<string, ModelPlayer> = new Map<string, ModelPlayer>();
  private models: Map<string, ModelObject> = new Map<string, ModelObject>();
  private references: Map<string, IModelReference> = new Map<string, IModelReference>();
  private cleanupRoutine: any;
  private zz: zzstatic;

  constructor(ModLoader: IModLoaderAPI) {
    this.ModLoader = ModLoader;
    this.cleanupRoutine = this.ModLoader.utils.setIntervalFrames(() => { this.doGC() }, 1200);
    this.zz = new zzstatic(Z64LibSupportedGames.OCARINA_OF_TIME);
  }

  onVi() {
    // #ifdef IS_DEV_BUILD
    if (this.ModLoader.ImGui.begin("Model Debug Menu")) {
      this.ModLoader.ImGui.columns(2);
      this.ModLoader.ImGui.text("Model reference data");
      let totalRefs = 0;
      this.references.forEach((ref: IModelReference) => {
        totalRefs++;
        this.ModLoader.ImGui.text(ref.hash.toUpperCase() + " -> " + ref.pointer.toString(16).toUpperCase());
      });
      this.ModLoader.ImGui.text("Total refs: " + totalRefs.toString());
      this.ModLoader.ImGui.nextColumn();
      this.ModLoader.ImGui.text("Player reference data");
      this.players.forEach((player: ModelPlayer) => {
        this.ModLoader.ImGui.text("-----");
        this.ModLoader.ImGui.text(player.uuid + " -> " + player.proxyPointer.toString(16));
        let a = "";
        let c = "";
        if (player.adult !== undefined) {
          a = player.adult.hash;
        }
        if (player.child !== undefined) {
          c = player.child.hash;
        }
        this.ModLoader.ImGui.text("Has Adult Model: " + (player.adult !== undefined).toString() + " | " + a);
        this.ModLoader.ImGui.text("Has Child Model: " + (player.child !== undefined).toString() + " | " + c);
      });
      this.ModLoader.ImGui.end();
    }
    // #endif
  }

  doGC() {
    let map: Map<IModelReference, boolean> = new Map<ModelReference, boolean>();
    let proxies: Map<ModelPlayer, boolean> = new Map<ModelPlayer, boolean>();
    this.references.forEach((ref: IModelReference) => {
      if (!ref.isLoaded) return;
      if (ref.isPlayerModel) ref.isDead = true;
      map.set(ref, ref.isDead);
    });
    if (this.localPlayer.adult !== undefined) map.set(this.localPlayer.adult, false);
    if (this.localPlayer.child !== undefined) map.set(this.localPlayer.child, false);
    this.localPlayer.equipment.forEach((value: IModelReference) => {
      map.set(value, false);
    });
    this.players.forEach((value: ModelPlayer, key: string) => {
      proxies.set(value, value.isDead);
      if (value.playerIsSpawned) {
        if (value.adult !== undefined) map.set(value.adult, false)
        if (value.child !== undefined) map.set(value.child, false);
        value.equipment.forEach((value: IModelReference) => {
          map.set(value, false);
        });
      }
    });
    map.forEach((isDead: boolean, ref: IModelReference) => {
      ref.isDead = isDead;
      if (ref.isDead) {
        this.deallocateModel(ref);
      }
    });
    proxies.forEach((isDead: boolean, ref: ModelPlayer) => {
      ref.isDead = isDead;
      if (ref.isDead) {
        this._deallocatePlayerByUUID(ref.uuid);
      }
      if (ref.hasLeftGame) {
        this.players.delete(ref.uuid);
        this.playerMLObjects.delete(ref.uuid);
      }
    });
  }

  SetLocalPlayerModel(age: Age, model: IModelReference) {
    if (this.localPlayer.currentScript !== undefined) {
      this.localPlayer.currentScript.onModelRemoved();
    }
    switch (age) {
      case Age.ADULT:
        this.localPlayer.adult = model;
        break;
      case Age.CHILD:
        this.localPlayer.child = model;
        break;
    }
    this.localPlayer.currentScript = model.script;
    if (this.localPlayer.currentScript !== undefined) {
      this.localPlayer.currentScript.onModelEquipped();
    }
  }

  getLocalPlayerData(): ModelPlayer {
    return this.localPlayer;
  }

  isModelRegistered(zobj: Buffer) {
    let hash: string = this.ModLoader.utils.hashBuffer(zobj);
    return this.models.has(hash) && this.references.has(hash);
  }

  private getReference(zobj: Buffer): IModelReference {
    let hash: string = this.ModLoader.utils.hashBuffer(zobj);
    return this.references.get(hash)!;
  }

  getModel(ref: IModelReference) {
    return this.models.get(ref.hash)!;
  }

  getModelSize(ref: IModelReference): number {
    return this.models.get(ref.hash)!.size;
  }

  registerModel(zobj: Buffer): IModelReference {
    let hash: string = this.ModLoader.utils.hashBuffer(zobj);
    if (this.models.has(hash)) return this.getReference(zobj);
    let ref = new ModelReference(hash, this.ModLoader);
    this.references.set(hash, ref);
    let modelObject = new ModelObject(zobj);
    this.models.set(hash, modelObject);
    return ref;
  }

  unregisterModel(ref: ModelReference) {
    this.deallocateModel(ref);
    this.references.delete(ref.hash);
    this.models.delete(ref.hash);
  }

  isModelAllocated(ref: IModelReference) {
    return ref.isLoaded;
  }

  allocateModel(ref: IModelReference): IModelReference | undefined {
    if (this.isModelAllocated(ref)) return ref;
    let modelObject = this.getModel(ref);
    let pointer: number = this.ModLoader.heap!.malloc(modelObject.size);
    // We're out of heap space. Abort.
    if (pointer === 0) return undefined;
    ref.pointer = pointer;
    let b = modelObject.zobj;
    try {
      b = this.zz.doRepoint(b, 0, false, ref.pointer)
    } catch (err) {
      this.ModLoader.logger.error(err.stack);
      return undefined;
    }
    this.ModLoader.emulator.rdramWriteBuffer(ref.pointer, b);
    this.ModLoader.logger.debug("[Model Manager]: Allocated 0x" + modelObject.size.toString(16) + " bytes for model with hash " + ref.hash + " at " + pointer.toString(16) + ".");
    ref.isLoaded = ref.pointer !== 0;
    return ref;
  }

  deallocateModel(ref: IModelReference) {
    if (ref.pointer === 0) return;
    if (!ref.isLoaded) return;
    this.ModLoader.heap!.free(ref.pointer);
    this.ModLoader.logger.debug("[Model Manager]: Freed 0x" + this.getModelSize(ref).toString(16) + " bytes from model with hash " + ref.hash + ".");
    ref.isLoaded = false;
    ref.isDead = true;
    ref.pointer = 0;
  }

  doesPlayerExist(player: INetworkPlayer) {
    return this.players.has(player.uuid);
  }

  getPlayer(player: INetworkPlayer) {
    return this.players.get(player.uuid);
  }

  createPlayer(player: INetworkPlayer, defaultAdult: IModelReference, defaultChild: IModelReference) {
    // Player is already allocated.
    if (this.doesPlayerExist(player)) return this.getPlayer(player);
    let mp = new ModelPlayer(player.uuid);
    mp.adult = defaultAdult;
    mp.child = defaultChild;
    this.players.set(player.uuid, mp);
    this.playerMLObjects.set(player.uuid, player);
    return mp;
  }

  allocatePlayer(player: INetworkPlayer, defaultAdult: IModelReference, defaultChild: IModelReference): ModelPlayer | undefined {
    let mp = this.createPlayer(player, defaultAdult, defaultChild)!;
    if (mp.isLoaded) mp.isDead = false;
    if (!mp.isDead) return mp;

    // Player needs allocated.
    let proxy: Buffer = fs.readFileSync(path.resolve(__dirname, "zobjs", "Puppet_Proxy.zobj"));
    let pointer: number = this.ModLoader.heap!.malloc(proxy.byteLength);

    if (pointer === 0) return undefined;

    mp.proxyPointer = pointer;
    mp.proxyData = proxy;
    this.players.set(player.uuid, mp);
    let b = this.zz.doRepoint(proxy, 0, false, pointer);
    this.ModLoader.emulator.rdramWriteBuffer(pointer, b);
    this.ModLoader.logger.debug("[Model Manager]: Allocated 0x" + proxy.byteLength.toString(16) + " bytes for player " + player.nickname + " at " + pointer.toString(16) + ".");
    mp.isDead = false;
    mp.isLoaded = true;
    return mp;
  }

  isPlayerAllocated(player: ModelPlayer) {
    return !player.isDead && player.proxyPointer > 0;
  }

  deallocatePlayer(player: INetworkPlayer) {
    if (!this.doesPlayerExist(player)) return;
    let alloc = this.getPlayer(player)!;
    if (alloc.proxyPointer <= 0) return;

    this.ModLoader.heap!.free(alloc.proxyPointer);
    alloc.proxyPointer = -1;
    alloc.isLoaded = false;
    this.ModLoader.logger.debug("[Model Manager]: Freed 0x" + alloc.proxyData.byteLength.toString(16) + " bytes from player " + player.nickname + ".");
  }

  private _deallocatePlayerByUUID(uuid: string) {
    let _player = this.playerMLObjects.get(uuid)!;
    this.deallocatePlayer(_player);
  }

  deletePlayer(player: INetworkPlayer) {
    if (!this.doesPlayerExist(player)) return;
    this.getPlayer(player)!.isDead = true;
    this.getPlayer(player)!.hasLeftGame = true;
  }

  deallocateAllPlayers() {
    this.players.forEach((player: ModelPlayer) => {
      player.playerIsSpawned = false;
      player.isDead = true;
    });
  }

  deallocateAllModels() {
    this.references.forEach((ref: IModelReference) => {
      this.deallocateModel(ref);
    });
  }
}
