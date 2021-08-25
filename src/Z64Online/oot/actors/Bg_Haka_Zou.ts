import { ActorHookBase, HookInfo } from '../actor_systems/ActorHookBase';

class Bg_Haka_Zou extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x00be;
    this.hooks.push(new HookInfo(0x154, 0x4, true));
  }
}

module.exports = new Bg_Haka_Zou();
