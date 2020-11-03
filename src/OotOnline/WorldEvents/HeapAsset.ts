export class HeapAsset {
    name: string;
    slot: number;
    asset: Buffer;
    callback: Function | undefined;
    pointer: number = 0;

    constructor(name: string, slot: number, asset: Buffer) {
        this.name = name;
        this.slot = slot;
        this.asset = asset;
    }
}
