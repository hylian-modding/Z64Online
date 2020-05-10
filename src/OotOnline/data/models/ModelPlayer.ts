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

export class ModelPlayerProxy{
  uuid: string = "";
  adultKey: string = "";
  childKey: string = "";
  equipmentKey: string = "";
  iconAdultKey: string = "";
  iconChildKey: string = "";

  constructor(uuid: string){
    this.uuid = uuid;
  }

  generateModelPlayer(map: Map<string, Buffer>): ModelPlayer{
    let p = new ModelPlayer(this.uuid);
    p.model = new ModelContainer();
    if (this.adultKey !== ''){
      p.model.setAdult(map.get(this.adultKey)!);
    }
    if (this.childKey !== ''){
      p.model.setChild(map.get(this.childKey)!);
    }
    if (this.iconAdultKey !== ''){
      p.customIconAdult = map.get(this.iconAdultKey)!;
    }
    if (this.iconChildKey !== ''){
      p.customIconChild = map.get(this.iconChildKey)!;
    }
    return p;
  }
}