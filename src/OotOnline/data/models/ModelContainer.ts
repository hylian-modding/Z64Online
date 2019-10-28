export const enum LOADED_MODEL {
  NONE = 0xff,
  ADULT = 0,
  CHILD = 1,
}

export class ModelContainer {
  adult!: Buffer;
  child!: Buffer;
  loadedModel: LOADED_MODEL = LOADED_MODEL.NONE;
}
