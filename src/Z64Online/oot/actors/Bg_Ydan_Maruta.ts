import { ActorHookBase, HookInfo } from '../actor_systems/ActorHookBase';

class Bg_Ydan_Maruta extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x0051;
    this.hooks.push(new HookInfo(0x16d, 0x1));
  }
}

module.exports = new Bg_Ydan_Maruta();
