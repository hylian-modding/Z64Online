import { ActorHookBase, HookInfo } from '../actor_systems/ActorHookBase';

class Bg_Mizu_Bwall extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x0059;
    this.hooks.push(new HookInfo(0x016d, 0x1));
  }
}

module.exports = new Bg_Mizu_Bwall();
