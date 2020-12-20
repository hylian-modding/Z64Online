import { ModelPlayer } from './ModelPlayer';
import { INetworkPlayer } from 'modloader64_api/NetworkHandler';

export class ModelAllocationManager {
  MAX_MODELS = 36;
  RESERVED_SLOTS = 2;
  models: ModelPlayer[] = new Array<ModelPlayer>(this.MAX_MODELS);

  constructor() {
    for (let i = 0; i < this.MAX_MODELS; i++){
      //@ts-ignore
      this.models[i] = undefined;
    }
  }

  getModelInSlot(index: number){
    return this.models[index];
  }

  getAvailableSlots(): number{
    let n: number = 0;
    for (let i = this.RESERVED_SLOTS; i < this.models.length; i++) {
      if (this.models[i] === undefined) {
        n++;
      }
    }
    return n;
  }

  allocateSlot(model: ModelPlayer): number {
    let index = -1;
    for (let i = this.RESERVED_SLOTS; i < this.models.length; i++) {
      if (this.models[i] === undefined) {
        index = i;
        break;
      }
    }
    if (index > -1) {
      this.models[index] = model;
    }
    return index;
  }

  deallocateSlot(index: number) {
    //@ts-ignore
    this.models[index] = undefined;
  }

  isPlayerAllocated(player: INetworkPlayer): boolean {
    for (let i = this.RESERVED_SLOTS; i < this.models.length; i++) {
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
    for (let i = this.RESERVED_SLOTS; i < this.models.length; i++) {
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

  getAllocationByUUID(uuid: string){
    for (let i = this.RESERVED_SLOTS; i < this.models.length; i++) {
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
