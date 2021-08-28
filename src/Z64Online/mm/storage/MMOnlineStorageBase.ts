import { MMOSaveData } from "../save/MMOSaveData";

export class MMOnlineStorageBase {
    saveManager!: MMOSaveData;
    permFlags: Buffer = Buffer.alloc(0x960);
    permEvents: Buffer = Buffer.alloc(152);
    minimapStorage: Buffer = Buffer.alloc(0x1C);
}