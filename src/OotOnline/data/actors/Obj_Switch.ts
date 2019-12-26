import { ActorHookBase, HookInfo } from '../ActorHookBase';

class Obj_Switch extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x012A;
    this.hooks.push(new HookInfo(0x150, 0x1));
    this.hooks.push(new HookInfo(0x154, 0x4, true));
  }
}

module.exports = new Obj_Switch();
