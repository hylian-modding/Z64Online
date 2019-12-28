import { ActorHookBase, HookInfo } from '../ActorHookBase';

class En_Door extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x0009;
    this.hooks.push(new HookInfo(0x1C4, 0x4, true));
  }
}

module.exports = new En_Door();
