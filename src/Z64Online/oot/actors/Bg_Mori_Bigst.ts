import { ActorHookBase, HookInfo } from '../actor_systems/ActorHookBase';

class Bg_Mori_Bigst extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x0086;
  }
}

module.exports = new Bg_Mori_Bigst();
