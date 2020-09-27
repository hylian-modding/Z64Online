import { ActorHookBase, HookInfo } from '../ActorHookBase';
import { IActor } from 'modloader64_api/OOT/IActor';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';

class En_Door extends ActorHookBase {
  constructor() {
    super();
    this.actorID = 0x0009;
    let hk: HookInfo = new HookInfo(0x1C4, 0x4, true);
    hk.overrideIncoming = (actor: IActor, offset: number, data: Buffer, ModLoader: IModLoaderAPI): void => {
      let b: number = data.readUInt32BE(0);
      if (b === 0x830) {
        let lock: number = 0x187;
        if (actor.rdramRead8(lock) > 0) {
          actor.rdramWrite8(lock, 0);
        }
      }
    };
    this.hooks.push(hk);
  }
}

module.exports = new En_Door();
