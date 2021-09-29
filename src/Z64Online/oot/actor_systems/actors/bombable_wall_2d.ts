import { ActorHookBase, HookInfo } from '../ActorHookBase';

class bombable_wall_2d extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x00d0;
    this.hooks.push(new HookInfo(0x288, 0x4, true));
  }
}

module.exports = new bombable_wall_2d();
