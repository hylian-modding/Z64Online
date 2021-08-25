import { ActorHookBase, HookInfo } from '../actor_systems/ActorHookBase';

class Bg_Gate_Shutter extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x100;
  }
}

module.exports = new Bg_Gate_Shutter();
