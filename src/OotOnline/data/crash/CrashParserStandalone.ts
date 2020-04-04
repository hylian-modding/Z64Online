import { CrashParserActorTable } from "./CrashParser";
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

fs.readdirSync("./").forEach((file: string)=>{
    let p: string = path.join("./", file);
    if (path.parse(p).ext === ".bin"){
        let cp: CrashParserActorTable = new CrashParserActorTable();
        let dump: Buffer = zlib.inflateSync(fs.readFileSync(p));
        fs.writeFileSync("./dump.bin", dump);
        fs.writeFileSync("./crash.html", cp.parse(dump));
    }
});