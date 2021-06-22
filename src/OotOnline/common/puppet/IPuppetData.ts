export interface IPuppetData {
    pointer: number;
    age: any;
    bundle: Buffer;
    onTick(): void;
    toJSON(): any;
}