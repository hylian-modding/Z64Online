import { ActorHookBase, HookInfo } from '../actor_systems/ActorHookBase';

class Bg_Mori_Kaitenkabe extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x0088;
    this.hooks.push(new HookInfo(0x16, 0x2));
    this.hooks.push(new HookInfo(0x32, 0x2));
  }
}

module.exports = new Bg_Mori_Kaitenkabe();
