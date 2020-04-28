import bitwise from 'bitwise';
import { UInt8 } from 'bitwise/types';

export const enum FLAG_TYPE {
    SCENE,
    EVENT,
    ITEM,
    INF,
    SKULLTULA
}

export interface IFlagExceptionContainer {
    byte: number;
    bit: number;
    doException(original: Buffer, incoming: Buffer): Buffer;
}

export class FlagExceptionContainer implements IFlagExceptionContainer {
    byte: number;
    bit: number;

    constructor(byte: number, bit: number) {
        this.byte = byte;
        this.bit = bit;
    }

    doException(original: Buffer, incoming: Buffer): Buffer {
        let bits = bitwise.byte.read(original.readUInt8(this.byte) as UInt8);
        let bits2 = bitwise.byte.read(incoming.readUInt8(this.byte) as UInt8);
        bits2[this.bit] = bits[this.bit];
        let nn = bitwise.byte.write(bits2);
        incoming.writeUInt8(nn, this.byte);
        return incoming;
    }
}

export class FlagOverrideContainer implements IFlagExceptionContainer {
    byte: number;
    bit: number;

    constructor(byte: number, bit: number) {
        this.byte = byte;
        this.bit = bit;
    }

    doException(original: Buffer, incoming: Buffer): Buffer {
        return incoming;
    }
}

export class FlagExceptionManager {
    private map: Map<FLAG_TYPE, Map<number, Array<IFlagExceptionContainer>>> = new Map<FLAG_TYPE, Map<number, Array<IFlagExceptionContainer>>>();

    constructor() {
        this.map.set(FLAG_TYPE.SCENE, new Map<number, Array<IFlagExceptionContainer>>());
        this.map.set(FLAG_TYPE.EVENT, new Map<number, Array<IFlagExceptionContainer>>());
        this.map.set(FLAG_TYPE.ITEM, new Map<number, Array<IFlagExceptionContainer>>());
        this.map.set(FLAG_TYPE.INF, new Map<number, Array<IFlagExceptionContainer>>());
        this.map.set(FLAG_TYPE.SKULLTULA, new Map<number, Array<IFlagExceptionContainer>>());
    }

    setupGenericDesync(type: FLAG_TYPE, byte: number, bit: number) {
        if (!this.map.get(type)!.has(byte)) {
            this.map.get(type)!.set(byte, []);
        }
        this.map.get(type)!.get(byte)!.push(new FlagExceptionContainer(byte, bit));
    }

    setupGenericOverride(type: FLAG_TYPE, byte: number, bit: number){
        if (!this.map.get(type)!.has(byte)) {
            this.map.get(type)!.set(byte, []);
        }
        this.map.get(type)!.get(byte)!.push(new FlagOverrideContainer(byte, bit));
    }

    setupCustomHandler(type: FLAG_TYPE, ex: IFlagExceptionContainer) {
        if (!this.map.get(type)!.has(ex.byte)) {
            this.map.get(type)!.set(ex.byte, []);
        }
        this.map.get(type)!.get(ex.byte)!.push(ex);
    }

}