//import { PuppetOverlord } from "./linkPuppet/PuppetOverlord";

export const RECORD_TICK_MODULO = 6
export const NUM_SCHEDULE_TICKS = 196608;
export const NUM_TICKS_PER_DAY = 65535;
export const NUM_SCHEDULE_RECORD_TICKS = NUM_SCHEDULE_TICKS / RECORD_TICK_MODULO;
export const NUM_RECORD_TICKS_PER_DAY = NUM_TICKS_PER_DAY / RECORD_TICK_MODULO;

/*
    Day 1 should be considered offset by -0x4000 since it starts at 0x4000
    0xBFFF + 0xFFFF + 0xFFFF + 0x4000 = ~0x30000 total ticks
*/

export function get_scaled_time(time: number): number {
    return Math.round(time / RECORD_TICK_MODULO);
}

export function get_scaled_time_floor(time: number): number {
    return Math.floor(time / RECORD_TICK_MODULO);
}

export function get_scaled_time_ceil(time: number): number {
    return Math.ceil(time / RECORD_TICK_MODULO);
}

export function get_linear_time(time: number, day: number) {
    time += (NUM_TICKS_PER_DAY * day) - 16384;
    return time;
}

export function get_schedule_data_index_at_time(time: number, day: number): number {
    let schedule_tick: number = 0;

    if (day == 0) time -= 16384;
    else time += (NUM_TICKS_PER_DAY * day) - 16384

    schedule_tick = get_scaled_time_floor(time)

    console.log("time of " + time.toString() + " is schedule index of " + schedule_tick.toString())

    return schedule_tick
}

export class PlayerScheduleData {
    pos: Buffer;
    rot: Buffer;
    anim: Buffer;
    scene: number;
    alive: boolean;

    constructor() {
        this.pos = Buffer.alloc(12);
        this.rot = Buffer.alloc(6);
        this.anim = Buffer.alloc(86);
        this.scene = 111; // psi says this
        this.alive = false;
    }
}

// Roughly 3 mb per player? I am praying to memory jesus that this is ok
export class PlayerSchedule {
    schedule_data: PlayerScheduleData[];

    constructor() {
        this.schedule_data = new Array<PlayerScheduleData>(NUM_SCHEDULE_RECORD_TICKS);

        // Not sure if new Array<T>(N) constructs each element, so I am doing it manually
        for(let index = 0; index < NUM_SCHEDULE_RECORD_TICKS; index++) {
            this.schedule_data[index] = new PlayerScheduleData();
        }
    }
}

export default PlayerSchedule

