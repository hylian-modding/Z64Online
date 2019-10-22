import { ModelContainer } from './ModelContainer';

export class ModelPlayer {
  uuid: string;
  model: ModelContainer = new ModelContainer();

  constructor(uuid: string) {
    this.uuid = uuid;
  }
}
