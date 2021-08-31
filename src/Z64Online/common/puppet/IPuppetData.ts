import { AgeOrForm } from "../types/Types";

export interface IPuppetData {
    pointer: number;
    ageOrForm: AgeOrForm;
    bundle: Buffer;
    backingShared: SharedArrayBuffer;
    backingBuffer: Buffer;
    ageOrFormLastFrame: AgeOrForm;
    onTick(): void;
    toJSON(): any;
}