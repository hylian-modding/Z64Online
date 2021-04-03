import fse from 'fs-extra';
import path from 'path';
import zip from 'adm-zip';
import crypto from 'crypto';

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

function pad(buf: Buffer) {
    let size = buf.byteLength;
    while (size % 0x10 !== 0) {
        size++;
    }
    let b = Buffer.alloc(size);
    buf.copy(b);
    return b;
}

let c = path.resolve("./cache/Z64O_Assets.content");

if (fse.existsSync(c)) {
    fse.unlinkSync(c);
}

if (1) {
    let og = process.cwd();
    let zipFile: zip = new zip();
    process.chdir("./OcarinaofTimeOnline-HolidayAssets");
    zipFile.addLocalFolder("./Rewards", "");
    process.chdir(og);

    const private_key = fse.readFileSync('./privateKey.pem', 'utf-8')
    //File to be signed
    let _file = pad(zipFile.toBuffer()).swap32();
    //Signing
    const signer = crypto.createSign('sha256');
    signer.update(_file);
    signer.end();
    const signature = signer.sign(private_key)

    let data: any = { data: _file, sig: signature };
    fse.writeFileSync(c, Buffer.from(JSON.stringify(data)));
}