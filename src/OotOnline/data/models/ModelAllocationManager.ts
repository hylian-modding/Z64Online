import { ModelPlayer } from './ModelPlayer';
import { Age } from 'modloader64_api/OOT/OOTAPI';
import { INetworkPlayer } from 'modloader64_api/NetworkHandler';
import fs from 'fs';
import { zzstatic } from './zzstatic/src/zzstatic';

export class ModelAllocationManager {
  MAX_MODELS = 36;
  models: ModelPlayer[] = new Array<ModelPlayer>(this.MAX_MODELS);

  constructor() {
    // These two are reserved.
    this.models[0] = new ModelPlayer('Adult Link');
    this.models[0].model.adult = new zzstatic().doRepoint(
      fs.readFileSync(__dirname + '/zobjs/AdultLink.zobj'),
      0
    );
    this.models[1] = new ModelPlayer('Child Link');
    this.models[1].model.child = new zzstatic().doRepoint(
      fs.readFileSync(__dirname + '/zobjs/ChildLink.zobj'),
      1
    );
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
      this.models[index] = model;
    }
    return index;
  }

  deallocateSlot(index: number) {
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

  getModelIndex(model: ModelPlayer): number {
    return this.models.indexOf(model);
  }
}
