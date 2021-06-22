import { IModelReference, IModelScript } from '@OotOnline/common/api/Z64API';

export class ModelPlayer {
  uuid: string = "";
  proxyPointer: number = -1;
  proxyData!: Buffer;
  isDead: boolean = true;
  isLoaded: boolean = false;
  hasLeftGame: boolean = false;
  adult!: IModelReference;
  child!: IModelReference;
  playerIsSpawned: boolean = false;
  equipment: Map<string, IModelReference> = new Map<string, IModelReference>();
  currentScript: IModelScript | undefined;
  additionalData: Map<any, any> = new Map<any, any>();

  constructor(uuid: string){
    this.uuid = uuid;
  }
}