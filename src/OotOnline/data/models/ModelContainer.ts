import { Z64Online_ModelAllocation } from "@OotOnline/Z64API/OotoAPI";

export class ModelContainer {
  adult: ModelObject = new ModelObject(Buffer.alloc(1));
  child: ModelObject = new ModelObject(Buffer.alloc(1));
  equipment: Array<ModelObject> = [];

  setAdult(zobj: Buffer){
    this.adult = new ModelObject(zobj);
  }

  setChild(zobj: Buffer){
    this.child = new ModelObject(zobj);
  }
}

export class ModelObject {
  zobj: Buffer;
  proxy?: Z64Online_ModelAllocation;

  constructor(zobj: Buffer) {
    this.zobj = zobj;
  }
}