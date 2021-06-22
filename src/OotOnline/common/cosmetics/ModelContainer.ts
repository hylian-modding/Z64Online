import { IModelReference, IModelScript } from "@OotOnline/common/api/Z64API";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";

export class ModelReference implements IModelReference {
  hash: string;
  pointer: number = 0;
  isPlayerModel: boolean = true;
  isDead: boolean = false;
  isLoaded: boolean = false;
  script: IModelScript | undefined;
  ModLoader: IModLoaderAPI;

  constructor(hash: string, ModLoader: IModLoaderAPI) {
    this.hash = hash;
    this.ModLoader = ModLoader;
  }

  loadModel(): boolean {
    this.ModLoader.privateBus.emit("LOAD_MODEL", this);
    return this.isLoaded;
  }

  unregister(): boolean {
    this.ModLoader.privateBus.emit("KILL_MODEL", this)
    return this.isDead;
  }
}

export class ModelObject {
  private _zobj: Buffer;
  size: number;

  constructor(zobj: Buffer) {
    this._zobj = zobj;
    this.size = zobj.byteLength;
  }

  set zobj(buf: Buffer) {
    this._zobj = buf;
  }

  get zobj(): Buffer {
    let copy = Buffer.alloc(this._zobj.byteLength);
    this._zobj.copy(copy);
    return copy;
  }
}