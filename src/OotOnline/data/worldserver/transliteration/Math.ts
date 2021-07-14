import { number_ref } from "modloader64_api/Sylvain/ImGui";
import { SmartBuffer } from 'smart-buffer';
import Vector3 from "../../../../../../../ModLoader64/API/build/math/Vector3";

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