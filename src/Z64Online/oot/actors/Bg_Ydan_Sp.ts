import { ActorHookBase, HookInfo } from '../actor_systems/ActorHookBase';

class Bg_Ydan_Sp extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x000f;
    this.hooks.push(new HookInfo(0x154, 0x4, true));
  }
}

module.exports = new Bg_Ydan_Sp();
