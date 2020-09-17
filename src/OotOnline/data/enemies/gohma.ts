import { ActorHookBase, HookInfo } from '../ActorHookBase';

class Gohma extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x0028;
    this.hooks.push(new HookInfo(0x180, 0x4, true));
    this.hooks.push(new HookInfo(0x154, 0x4));
    this.hooks.push(new HookInfo(0x144, 0x4));
  }
}

module.exports = new Gohma();
