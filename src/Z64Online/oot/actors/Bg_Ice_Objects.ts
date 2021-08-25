import { ActorHookBase, HookInfo } from '../actor_systems/ActorHookBase';

class Bg_Ice_Objects extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x00d6;
  }
}

module.exports = new Bg_Ice_Objects();
