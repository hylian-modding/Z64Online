import { AgeOrForm } from "../types/Types";

export interface IPuppetData {
    pointer: number;
    ageOrForm: AgeOrForm;
    backingShared: SharedArrayBuffer;
    backingBuffer: Buffer;
    ageOrFormLastFrame: AgeOrForm;
    onTick(): void;
    toJSON(): any;
    processBundle(bundle: Buffer): void;
}