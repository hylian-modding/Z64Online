export function SQ(x) {
    return ((x) * (x));
}

export function ABS(x) {
    return ((x) >= 0 ? (x) : -(x));
}

export function DECR(x) {
    return (x == 0 ? 0 : x - 1);
}

export function CLAMP(x, min, max) {
    return ((x) < (min) ? (min) : (x) > (max) ? (max) : (x));
}

export function CLAMP_MAX(x, max) {
    return ((x) > (max) ? (max) : (x))
}

export function CLAMP_MIN(x, min) {
    return ((x) < (min) ? (min) : (x))
}

export function MEDIAN3(a1, a2, a3) {
    return ((a2 >= a1) ? ((a3 >= a2) ? a2 : ((a1 >= a3) ? a1 : a3)) : ((a2 >= a3) ? a2 : ((a3 >= a1) ? a1 : a3)))
}

