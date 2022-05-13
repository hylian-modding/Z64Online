import { MMOSaveData} from "../save/MMOSaveData";

export const SCENE_ARR_SIZE = 0xD20;
export const EVENT_ARR_SIZE = 0x8;
export const ITEM_FLAG_ARR_SIZE = 0x18;
export const MASK_FLAG_ARR_SIZE = 0x18;
export const WEEK_EVENT_ARR_SIZE = 0x64;

export class MMOnlineStorageBase {

    sceneStorage: Buffer = Buffer.alloc(SCENE_ARR_SIZE);
    eventStorage: Buffer = Buffer.alloc(EVENT_ARR_SIZE);
    itemFlagStorage: Buffer = Buffer.alloc(ITEM_FLAG_ARR_SIZE);
    eventFlags: Buffer = Buffer.alloc(0x64);
    questStorage: Buffer = Buffer.alloc(0x12);
    saveManager!: MMOSaveData;
    permFlags: Buffer = Buffer.alloc(0x960);
    permEvents: Buffer = Buffer.alloc(152);
    cycleEvents: Buffer = Buffer.alloc(571);
    sceneEvents: Buffer = Buffer.alloc(76);
    minimapStorage: Buffer = Buffer.alloc(0x1C);

    MM_IS_FAIRY: boolean = false;
    MM_IS_SKULL: boolean = false;
    MM_IS_KEY_KEEP: boolean = false;
    MM_IS_TIME: boolean = false;
}