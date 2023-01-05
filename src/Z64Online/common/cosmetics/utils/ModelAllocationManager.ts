import { ModelPlayer } from '../player/ModelPlayer';
import { INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { ModelObject, ModelReference } from './ModelContainer';
import { IModelReference } from '@Z64Online/common/api/Z64API';
import { AgeOrForm } from '@Z64Online/common/types/Types';
import { zzstatic2 } from 'Z64Lib/API/Utilities/zzstatic2';
import { Z64O_PRIVATE_EVENTS } from '@Z64Online/common/api/InternalAPI';

export class ModelAllocationManager {

  static singleton: ModelAllocationManager;

  private ModLoader: IModLoaderAPI;
  private localPlayer: ModelPlayer = new ModelPlayer("LOCAL PLAYER");
  private playerMLObjects: Map<string, INetworkPlayer> = new Map<string, INetworkPlayer>();
  private players: Map<string, ModelPlayer> = new Map<string, ModelPlayer>();
  private models: Map<string, ModelObject> = new Map<string, ModelObject>();
  private references: Map<string, IModelReference> = new Map<string, IModelReference>();
  private cleanupRoutine: any;

  constructor(ModLoader: IModLoaderAPI) {
    this.ModLoader = ModLoader;
    this.cleanupRoutine = this.ModLoader.utils.setIntervalFrames(() => { this.doGC() }, 1200);
    ModelAllocationManager.singleton = this;
  }

  doGC() {
    let map: Map<IModelReference, boolean> = new Map<ModelReference, boolean>();
    let proxies: Map<ModelPlayer, boolean> = new Map<ModelPlayer, boolean>();
    this.references.forEach((ref: IModelReference) => {
      if (!ref.isLoaded) return;
      if (ref.isPlayerModel) ref.isDead = true;
      map.set(ref, ref.isDead);
    });
    this.localPlayer.AgesOrForms.forEach((ref: IModelReference) => {
      map.set(ref, false);
    });
    this.localPlayer.equipment.forEach((value: IModelReference) => {
      map.set(value, false);
    });
    this.players.forEach((value: ModelPlayer, key: string) => {
      proxies.set(value, value.isDead);
      if (value.playerIsSpawned) {
        value.AgesOrForms.forEach((ref: IModelReference) => {
          map.set(ref, false);
        });
        value.equipment.forEach((value: IModelReference) => {
          map.set(value, false);
        });
      }
    });
    map.forEach((isDead: boolean, ref: IModelReference) => {
      ref.isDead = isDead;
      if (ref.isDead && !ref.doNotGC) {
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

  SetLocalPlayerModel(age: AgeOrForm, model: IModelReference) {
    if (this.localPlayer.currentScript !== undefined) {
      this.localPlayer.currentScript.onModelRemoved();
    }
    this.localPlayer.AgesOrForms.set(age, model);
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
    let pointer: number = this.ModLoader.gfx_heap!.malloc(modelObject.size);
    // We're out of heap space. Abort.
    if (pointer === 0){
      let loaded: number = 0;
      this.references.forEach((ref: IModelReference)=>{
        if (ref.isLoaded) loaded++;
      });
      throw new Error(`OUT OF GFX HEAP SPACE! ${this.models.size} models registered. ${loaded} loaded.`);
    }
    ref.pointer = pointer;
    let b = modelObject.zobj;
    try {
      this.ModLoader.privateBus.emit(Z64O_PRIVATE_EVENTS.PRE_OBJECT_LOAD, b);
      if (!ref.isPlayerModel) {
        let zz = new zzstatic2();
        zz.repoint(b, pointer);
      }
      this.ModLoader.privateBus.emit(Z64O_PRIVATE_EVENTS.POST_OBJECT_LOAD, b);
    } catch (err: any) {
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
    this.ModLoader.gfx_heap!.free(ref.pointer);
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

  createPlayer(player: INetworkPlayer, defaults: Map<AgeOrForm, IModelReference>) {
    // Player is already allocated.
    if (this.doesPlayerExist(player)) return this.getPlayer(player);
    let mp = new ModelPlayer(player.uuid);
    defaults.forEach((ref: IModelReference, key: AgeOrForm) => {
      mp.AgesOrForms.set(key, ref);
    });
    this.players.set(player.uuid, mp);
    this.playerMLObjects.set(player.uuid, player);
    return mp;
  }

  allocatePlayer(player: INetworkPlayer, defaults: Map<AgeOrForm, IModelReference>): ModelPlayer | undefined {
    let mp = this.createPlayer(player, defaults)!;
    if (mp.isLoaded) mp.isDead = false;
    if (!mp.isDead) return mp;

    // Player needs allocated.
    let pointer: number = this.ModLoader.heap!.malloc(0x24);
    if (pointer === 0) return undefined;
    defaults.forEach((ref: IModelReference, age: AgeOrForm) => {
      this.ModLoader.emulator.rdramWrite32(pointer + (age * 4), ref.pointer);
    });
    mp.pointer = pointer;
    this.players.set(player.uuid, mp);
    this.ModLoader.logger.debug("[Model Manager]: Allocated player " + player.nickname + " at " + pointer.toString(16) + ".");
    mp.isDead = false;
    mp.isLoaded = true;
    return mp;
  }

  allocateLocalPlayer() {
    // Player needs allocated.
    let pointer: number = this.ModLoader.heap!.malloc(0x24);
    if (pointer === 0) return;

    this.localPlayer.pointer = pointer;
    this.ModLoader.logger.debug("[Model Manager]: Allocated local player at " + pointer.toString(16) + ".");
    this.localPlayer.isDead = false;
    this.localPlayer.isLoaded = true;
  }

  isPlayerAllocated(player: ModelPlayer) {
    return !player.isDead && player.pointer > 0;
  }

  deallocatePlayer(player: INetworkPlayer) {
    if (!this.doesPlayerExist(player)) return;
    let alloc = this.getPlayer(player)!;
    if (alloc.pointer <= 0) return;

    this.ModLoader.gfx_heap!.free(alloc.pointer);
    alloc.pointer = -1;
    alloc.isLoaded = false;
    this.ModLoader.logger.debug("[Model Manager]: Freed memory from player " + player.nickname + ".");
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
