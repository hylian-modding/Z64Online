import { IOOTCore } from 'modloader64_api/OOT/OOTAPI';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';

export class PuppetData {
  pointer: number;
  ModLoader: IModLoaderAPI;
  core: IOOTCore;

  private readonly copyFields: string[] = new Array<string>();

  constructor(
    pointer: number,
    ModLoader: IModLoaderAPI,
    core: IOOTCore
  ) {
    this.pointer = pointer;
    this.ModLoader = ModLoader;
    this.core = core;
    this.copyFields.push('pos');
    this.copyFields.push('rot');
  }

  get pos(): Buffer {
    return this.core.link.position.getRawPos();
  }

  set pos(pos: Buffer) {
    this.ModLoader.emulator.rdramWriteBuffer(this.pointer + 0x24, pos);
  }

  get rot(): Buffer {
    return this.core.link.rotation.getRawRot();
  }

  set rot(rot: Buffer) {
    this.ModLoader.emulator.rdramWriteBuffer(this.pointer + 0xB4, rot);
  }

  toJSON() {
    const jsonObj: any = {};

    for (let i = 0; i < this.copyFields.length; i++) {
      jsonObj[this.copyFields[i]] = (this as any)[this.copyFields[i]];
    }
    //console.log(JSON.stringify(jsonObj, null, 2));
    return jsonObj;
  }
}
