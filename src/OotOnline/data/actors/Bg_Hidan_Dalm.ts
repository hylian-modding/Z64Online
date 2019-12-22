import { ActorHookBase, HookInfo } from '../ActorHookBase';

class Bg_Hidan_Dalm extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x0040;
    this.hooks.push(new HookInfo(0x154, 0x4, true));
  }
}

module.exports = new Bg_Hidan_Dalm();
