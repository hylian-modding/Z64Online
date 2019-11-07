import { zzstatic, zzstatic_cache } from "./zzstatic/src/zzstatic";
import fs from 'fs';
import { Pak } from 'modloader64_api/PakFormat';
import path from 'path';

var myArgs = process.argv.slice(2);

export class ModelThreadWorker {
    constructor() {}

    work() {
        let zz: zzstatic = new zzstatic();
        let buf: Buffer = fs.readFileSync(myArgs[0]);
        let cache: zzstatic_cache = zz.generateCache(buf);
        let pakf: string = path.join(__dirname, path.parse(myArgs[0]).name + ".zzcache");
        let pak: Pak = new Pak(pakf);
        pak.save(cache);
        pak.update();
    }
}

const thread: ModelThreadWorker = new ModelThreadWorker();
thread.work();