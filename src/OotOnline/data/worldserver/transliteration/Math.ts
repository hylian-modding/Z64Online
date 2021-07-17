import { number_ref } from "modloader64_api/Sylvain/ImGui";
import { SmartBuffer } from 'smart-buffer';
import Vector3 from "modloader64_api/math/Vector3";

// Original struct
//typedef float MtxF_t[4][4];
//typedef union {
//    MtxF_t mf;
//    struct {
//        float xx, xy, xz, xw,
//              yx, yy, yz, yw,
//              zx, zy, zz, zw,
//              wx, wy, wz, ww;
//    };
//} MtxF;
export class MtxF {
    mf: number[][] = [[0, 0, 0, 0],
                      [0, 0, 0, 0],
                      [0, 0, 0, 0],
                      [0, 0, 0, 0]];

    get xx(): number {
        return this.mf[0][0];
    }
    set xx(value: number) {
        this.mf[0][0] = value;
    }

    get xy(): number {
        return this.mf[0][1];
    }
    set xy(value: number) {
        this.mf[0][1] = value;
    }

    get xz(): number {
        return this.mf[0][2];
    }
    set xz(value: number) {
        this.mf[0][2] = value;
    }

    get xw(): number {
        return this.mf[0][3];
    }
    set xw(value: number) {
        this.mf[0][3] = value;
    }

    get yx(): number {
        return this.mf[1][0];
    }
    set yx(value: number) {
        this.mf[1][0] = value;
    }

    get yy(): number {
        return this.mf[1][1];
    }
    set yy(value: number) {
        this.mf[1][1] = value;
    }

    get yz(): number {
        return this.mf[1][2];
    }
    set yz(value: number) {
        this.mf[1][2] = value;
    }

    get yw(): number {
        return this.mf[1][3];
    }
    set yw(value: number) {
        this.mf[1][3] = value;
    }

    get zx(): number {
        return this.mf[2][0];
    }
    set zx(value: number) {
        this.mf[2][0] = value;
    }

    get zy(): number {
        return this.mf[2][1];
    }
    set zy(value: number) {
        this.mf[2][1] = value;
    }

    get zz(): number {
        return this.mf[2][2];
    }
    set zz(value: number) {
        this.mf[2][2] = value;
    }

    get zw(): number {
        return this.mf[2][3];
    }
    set zw(value: number) {
        this.mf[2][3] = value;
    }

    get wx(): number {
        return this.mf[3][0];
    }
    set wx(value: number) {
        this.mf[3][0] = value;
    }

    get wy(): number {
        return this.mf[3][1];
    }
    set wy(value: number) {
        this.mf[3][1] = value;
    }

    get wz(): number {
        return this.mf[3][2];
    }
    set wz(value: number) {
        this.mf[3][2] = value;
    }

    get ww(): number {
        return this.mf[3][3];
    }
    set ww(value: number) {
        this.mf[3][3] = value;
    }
}

export const M_PI = 3.14159265358979323846
export const M_SQRT2 = 1.41421356237309504880
export const FLT_MAX = 340282346638528859811704183484516925440.0
export const SHT_MAX = 32767.0
export const SHT_MINV = (1.0 / SHT_MAX)
export function DEGTORAD(x) {
    return (x * M_PI / 180.0)
}

export function Math_ApproachF(pValue: number_ref, target: number, fraction: number, step: number) {
    if (pValue[0] != target) {
        let stepSize: number = (target - pValue[0]) * fraction;

        if (stepSize > step) {
            stepSize = step;
        }
        else if (stepSize < -step) {
            stepSize = -step;
        }

        pValue[0] += stepSize;
    }
}

/**
 * Changes pValue by step towards target. If this step is more than fraction of the remaining distance, step by that
 * instead, with a minimum step of minStep. Returns remaining distance to target.
 */
 export function Math_SmoothStepToF(pValue: number_ref, target: number, fraction: number, step: number, minStep: number): number {
    if (pValue[0] != target) {
        let stepSize: number = (target - pValue[0]) * fraction;

        if ((stepSize >= minStep) || (stepSize <= -minStep)) {
            if (stepSize > step) {
                stepSize = step;
            }

            if (stepSize < -step) {
                stepSize = -step;
            }

            pValue[0] += stepSize;
        }
        else {
            if (stepSize < minStep) {
                pValue[0] += minStep;
                stepSize = minStep;

                if (target < pValue[0]) {
                    pValue[0] = target;
                }
            }
            if (stepSize > -minStep) {
                pValue[0] += -minStep;

                if (pValue[0] < target) {
                    pValue[0] = target;
                }
            }
        }
    }

    return Math.abs(target - pValue[0]);
}

export function Rand_S16Offset(base: number, range: number): number {
    return ((Math.random() * range) + base) & 0xFFFF
}

export function Rand_S16OffsetStride(base: number, stride: number, range: number): number {
    return ((Math.random() * range) * stride + base) & 0xFFFF
}

export function Vec3ftoBuffer(vec: Vector3){
    let sb = new SmartBuffer();
    sb.writeFloatBE(vec.x);
    sb.writeFloatBE(vec.y);
    sb.writeFloatBE(vec.z);
    return sb.toBuffer();
}

export function Vec3stoBuffer(vec: Vector3){
    let sb = new SmartBuffer();
    sb.writeUInt16BE(vec.x);
    sb.writeUInt16BE(vec.y);
    sb.writeUInt16BE(vec.z);
    return sb.toBuffer();
}