import { ActorHookBase, HookInfo } from '../actor_systems/ActorHookBase';

class liftable_rock extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x014e;
    this.hooks.push(new HookInfo(0x13c, 0x4, true));
  }
}

module.exports = new liftable_rock();
