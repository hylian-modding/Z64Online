import { ActorHookBase, HookInfo } from '../actor_systems/ActorHookBase';

class Obj_Oshihiki extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x00ff;
  }
}

module.exports = new Obj_Oshihiki();
