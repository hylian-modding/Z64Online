import { ActorHookBase, HookInfo } from '../ActorHookBase';
import { IActor } from 'modloader64_api/OOT/IActor';

class En_Door extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x0009;
    let hk: HookInfo = new HookInfo(0x1C4, 0x4, true);
    hk.overrideIncoming = (actor: IActor, offset: number, data: Buffer): void => {
      let b: number = data.readUInt32BE(0);
      if (b === 0x830) {
        let lock: number = 0x184;
        if (actor.rdramRead32(lock) > 0) {
          actor.rdramWrite32(lock, 0);
        }
      }
    };
    this.hooks.push(hk);
  }
}

module.exports = new En_Door();
