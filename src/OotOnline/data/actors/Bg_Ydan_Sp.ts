import { ActorHookBase, HookInfo } from '../ActorHookBase';

class Bg_Ydan_Sp extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x000f;
    this.hooks.push(new HookInfo(0x171, 0x1, false));
  }
}

module.exports = new Bg_Ydan_Sp();
