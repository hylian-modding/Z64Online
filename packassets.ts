import fse from 'fs-extra';
import path from 'path';
import zip from 'adm-zip';

// Copied from ML core. Needed for the packing process.
export class MonkeyPatch_Stringify {

    original: any;
    replacement: any;

    patch() {
        const BJSON = require('buffer-json');
        this.original = JSON.stringify;
        this.replacement = (
            value: any,
            replacer?: (this: any, key: string, value: any) => any,
            space?: string | number
        ) => {
            if (replacer === undefined) {
                return this.original(value, BJSON.replacer, space);
            }
            return this.original(value, replacer, space);

        };
        (JSON as any)['stringify'] = this.replacement as Function;
    }

    unpatch() {
        (JSON as any)['stringify'] = this.original as Function;
    }
}

const mp = new MonkeyPatch_Stringify();
mp.patch();

function pad(buf: Buffer){
    let size = buf.byteLength;
    while (size % 0x10 !== 0) {
        size++;
    }
    let b = Buffer.alloc(size);
    buf.copy(b);
    return b;
}

if (!fse.existsSync(path.resolve("./dist/halloween2020.content"))) {
    console.log("Packing holiday assets...");
    let og = process.cwd();
    process.chdir("./OcarinaofTimeOnline-HolidayAssets/Halloween");
    let zipFile: zip = new zip();
    zipFile.addLocalFolder("./assets", "assets");
    zipFile.writeZip("./assets.zip");
    process.chdir(og);
    const content = JSON.stringify({ data: pad(fse.readFileSync('./OcarinaofTimeOnline-HolidayAssets/Halloween/assets.zip')).swap32() });
    fse.writeFileSync(path.resolve("./dist/halloween2020.content"), Buffer.from(content));
}