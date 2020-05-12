export class ModelContainer {
  adult: ModelObject = new ModelObject(Buffer.alloc(1));
  child: ModelObject = new ModelObject(Buffer.alloc(1));
  equipment: ModelObject = new ModelObject(Buffer.alloc(1));

  setAdult(zobj: Buffer){
    this.adult = new ModelObject(zobj);
  }

  setChild(zobj: Buffer){
    this.child = new ModelObject(zobj);
  }

  setEquipment(zobj: Buffer){
    this.equipment = new ModelObject(zobj);
  }
}

export class ModelObject {
  zobj: Buffer;

  constructor(zobj: Buffer) {
    this.zobj = zobj;
  }
}