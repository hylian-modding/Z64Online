export interface IPuppetData {
    pointer: number;
    age: any;
    bundle: Buffer;
    backingShared: SharedArrayBuffer;
    backingBuffer: Buffer;
    onTick(): void;
    toJSON(): any;
}