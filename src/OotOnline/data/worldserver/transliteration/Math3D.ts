import Vector3 from "modloader64_api/math/Vector3";
import { number_ref } from "modloader64_api/Sylvain/ImGui";

export class Math3D {
    /**
    * Calculates the cosine between vectors `a` and `b`
    */
    static Cos(a: Vector3, b: Vector3): number {
        let ret: number_ref = [0]
        Math3D.CosOut(a, b, ret)
        return ret[0]
    }

    /**
     * Calculates the cosine between bectors `a` and `b` and places the result in `ret`
     * returns true if the cosine cannot be calculated because the product of the magnitudes is zero
     */
    static CosOut(a: Vector3, b: Vector3, dst: number_ref): boolean {
        let magProduct: number = 0

        magProduct = a.magnitude() * b.magnitude()
        if (/*IS_ZERO(magProduct)*/ magProduct < 0.008) {
            dst[0] = 0.0;
            return true;
        }

        dst[0] = ((a.x * b.x) + (a.y * b.y) + (a.z * b.z)) / magProduct;
        return false;
    }

    /**
    * Reflects vector `vec` across the normal vector `normal`, reflection vector is placed in
    * `reflVec`
    */
    static Vec3fReflect(vec: Vector3, normal: Vector3): Vector3 {
        let normScaleY: number = 0
        let negVec: Vector3 = new Vector3()
        let normScaleZ: number = 0
        let normScaleX: number = 0
        let vecDotNorm: number = 0
        let reflVec: Vector3 = new Vector3()

        negVec.x = vec.x * -1.0;
        negVec.y = vec.y * -1.0;
        negVec.z = vec.z * -1.0;

        vecDotNorm = Math3D.Cos(negVec, normal);

        normScaleX = normal.x * vecDotNorm;
        normScaleY = normal.y * vecDotNorm;
        normScaleZ = normal.z * vecDotNorm;

        reflVec.x = ((normScaleX + vec.x) + (normScaleX + vec.x)) + negVec.x;
        reflVec.y = ((normScaleY + vec.y) + (normScaleY + vec.y)) + negVec.y;
        reflVec.z = ((normScaleZ + vec.z) + (normScaleZ + vec.z)) + negVec.z;

        return reflVec
    }
}

