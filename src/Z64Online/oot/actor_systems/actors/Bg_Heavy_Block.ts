import { ActorHookBase, HookInfo } from '../ActorHookBase';

class Bg_Heavy_Block extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x0092;
  }
}

module.exports = new Bg_Heavy_Block();
