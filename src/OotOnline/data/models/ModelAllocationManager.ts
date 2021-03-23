import { ModelPlayer } from './ModelPlayer';
import { INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';

export class ModelAllocationManager {
  MAX_MODELS = 36;
  models: ModelPlayer[] = new Array<ModelPlayer>(this.MAX_MODELS);
  ModLoader: IModLoaderAPI;

  constructor(ModLoader: IModLoaderAPI) {
    for (let i = 0; i < this.MAX_MODELS; i++) {
      //@ts-ignore
      this.models[i] = undefined;
    }
    this.ModLoader = ModLoader;
  }

  getModelInSlot(index: number) {
    return this.models[index];
  }

  getAvailableSlots(): number {
    let n: number = 0;
    for (let i = 0; i < this.models.length; i++) {
      if (this.models[i] === undefined) {
        n++;
      }
    }
    return n;
  }

  allocateSlot(model: ModelPlayer): number {
    let index = -1;
    for (let i = 0; i < this.models.length; i++) {
      if (this.models[i] === undefined) {
        index = i;
        break;
      }
    }
    if (index > -1) {
      let p = this.ModLoader.heap!.malloc(0x37800);
      model.pointer = p;
      this.models[index] = model;
    }
    return index;
  }

  deallocateSlot(index: number) {
    this.ModLoader.emulator.rdramWriteBuffer(this.models[index].pointer, this.ModLoader.utils.clearBuffer(this.ModLoader.emulator.rdramReadBuffer(this.models[index].pointer, 0x37800)));
    this.ModLoader.heap!.free(this.models[index].pointer);
    //@ts-ignore
    this.models[index] = undefined;
  }

  isPlayerAllocated(player: INetworkPlayer): boolean {
    for (let i = 0; i < this.models.length; i++) {
      if (this.models[i] === undefined) {
        continue;
      }
      if (player.uuid === this.models[i].uuid) {
        return true;
      }
    }
    return false;
  }

  getPlayerAllocation(player: INetworkPlayer): ModelPlayer {
    for (let i = 0; i < this.models.length; i++) {
      if (this.models[i] === undefined) {
        continue;
      }
      if (player.uuid === this.models[i].uuid) {
        return this.models[i];
      }
    }
    //@ts-ignore
    return null;
  }

  getAllocationByUUID(uuid: string) {
    for (let i = 0; i < this.models.length; i++) {
      if (this.models[i] === undefined) {
        continue;
      }
      if (uuid === this.models[i].uuid) {
        return this.models[i];
      }
    }
    //@ts-ignore
    return null;
  }

  getModelIndex(model: ModelPlayer): number {
    return this.models.indexOf(model);
  }
}
