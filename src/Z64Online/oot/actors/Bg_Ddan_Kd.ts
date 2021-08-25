import { ActorHookBase, HookInfo } from '../actor_systems/ActorHookBase';

class Bg_Ddan_Kd extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x005c;
  }
}

module.exports = new Bg_Ddan_Kd();
