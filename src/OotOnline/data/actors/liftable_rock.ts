import { ActorHookBase, HookInfo } from '../ActorHookBase';

class liftable_rock extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x014e;
  }
}

module.exports = new liftable_rock();
