import { ActorHookBase, HookInfo } from '../ActorHookBase';

class Bg_Breakwall extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x0059;
    this.hooks.push(new HookInfo(0x16d, 0x1));
  }
}

module.exports = new Bg_Breakwall();
