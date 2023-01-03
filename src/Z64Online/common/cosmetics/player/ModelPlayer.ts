import { IModelReference, IModelScript } from '@Z64Online/common/api/Z64API';
import { AgeOrForm } from 'Z64Lib/API/Common/Z64API';

export class ModelPlayer {
  uuid: string = "";
  pointer: number = -1;
  isDead: boolean = true;
  isLoaded: boolean = false;
  hasLeftGame: boolean = false;
  AgesOrForms: Map<AgeOrForm, IModelReference> = new Map<AgeOrForm, IModelReference>();
  playerIsSpawned: boolean = false;
  equipment: Map<string, IModelReference> = new Map<string, IModelReference>();
  currentScript: IModelScript | undefined;
  additionalData: Map<any, any> = new Map<any, any>();

  constructor(uuid: string){
    this.uuid = uuid;
  }
}