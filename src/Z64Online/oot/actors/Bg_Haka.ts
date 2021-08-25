import { ActorHookBase, HookInfo } from '../actor_systems/ActorHookBase';

class Bg_Haka extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x009d;
  }
}

module.exports = new Bg_Haka();
