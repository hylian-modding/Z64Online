import { SmartBuffer } from "smart-buffer";

export interface IPuppetServerStub {
    buf: SmartBuffer;
    backingShared: any;
    backingBuffer: Buffer;
    lobby: string;
    writeData(buf: Buffer): void;
}
