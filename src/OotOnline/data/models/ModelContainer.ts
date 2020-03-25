import crypto from 'crypto';

export class ModelContainer {
  adult: ModelObject = new ModelObject(Buffer.alloc(1));
  child: ModelObject = new ModelObject(Buffer.alloc(1));
  equipment: ModelObject = new ModelObject(Buffer.alloc(1));
  overallHash: string = "";

  setAdult(zobj: Buffer){
    this.adult = new ModelObject(zobj);
    this.recalcHash();
  }

  setChild(zobj: Buffer){
    this.child = new ModelObject(zobj);
    this.recalcHash();
  }

  setEquipment(zobj: Buffer){
    this.equipment = new ModelObject(zobj);
    this.recalcHash();
  }

  private recalcHash(){
    let str: string = "";
    str+=this.adult.hash;
    str+=this.child.hash;
    str+=this.equipment.hash;
    let b: Buffer = Buffer.from(str);
    this.overallHash = crypto.createHash('md5').update(b).digest('hex');
  }
}

export class ModelObject {
  zobj: Buffer;
  hash: string;

  constructor(zobj: Buffer) {
    this.zobj = zobj;
    this.hash = crypto.createHash('md5').update(zobj).digest('hex');
  }
}