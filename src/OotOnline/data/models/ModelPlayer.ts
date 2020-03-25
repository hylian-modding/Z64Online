import { ModelContainer } from './ModelContainer';

export class ModelPlayer {
  uuid: string = "";
  model: ModelContainer = new ModelContainer();
  customIconAdult: Buffer = Buffer.alloc(1);
  customIconChild: Buffer = Buffer.alloc(1);

  constructor(uuid: string){
    this.uuid = uuid;
  }
}
