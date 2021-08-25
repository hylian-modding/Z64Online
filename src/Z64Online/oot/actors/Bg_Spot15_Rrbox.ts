import { ActorHookBase, HookInfo } from '../actor_systems/ActorHookBase';

class Bg_Spot15_Rrbox extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x0107;
  }
}

module.exports = new Bg_Spot15_Rrbox();
