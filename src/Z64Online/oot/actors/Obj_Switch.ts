import { ActorHookBase, HookInfo } from '../actor_systems/ActorHookBase';

class Obj_Switch extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x012a;
    this.hooks.push(new HookInfo(0x154, 0x4, true));
  }
}

module.exports = new Obj_Switch();
