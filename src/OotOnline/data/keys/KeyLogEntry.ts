export class KeyLogEntry{
    index: number;
    delta!: number;
    timestamp!: number;
    keyCount: number;

    constructor(index: number, keyCount: number){
        this.index = index;
        this.keyCount = keyCount;
    }

    getDelta(int: number) {
        if (int === 0xFF){
            return 0;
        }
        let diff = Math.abs(this.keyCount - int);
        if (this.keyCount > int) {
            diff /= -1;
        }
        this.keyCount += diff;
        this.timestamp = Date.now();
        return diff;
    }

    applyDelta(entry: KeyLogEntry){
        this.keyCount += entry.delta;
    }
}

export class SavedLogEntry{
    index: number;
    delta: number;
    timestamp: number;

    constructor(index: number, delta: number, timestamp: number){
        this.index = index;
        this.delta = delta;
        this.timestamp = timestamp;
    }
}