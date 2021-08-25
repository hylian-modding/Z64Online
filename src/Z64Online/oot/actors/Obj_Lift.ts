import { ActorHookBase, HookInfo } from '../actor_systems/ActorHookBase';

class Obj_Lift extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x012c;
    this.hooks.push(new HookInfo(0x150, 0x1));
  }
}

module.exports = new Obj_Lift();
