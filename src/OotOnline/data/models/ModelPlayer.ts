import { ModelContainer } from './ModelContainer';

export class ModelPlayer {
  uuid: string;
  model: ModelContainer = new ModelContainer();
  customIconAdult!: Buffer;
  customIconChild!: Buffer;

  constructor(uuid: string) {
    this.uuid = uuid;
  }
}
