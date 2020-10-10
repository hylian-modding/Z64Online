import fse from 'fs-extra';
import path from 'path';
import zip from 'adm-zip';
import { SmartBuffer } from 'smart-buffer';

if (!fse.existsSync("./build/src/OotOnline/libs")) {
    fse.mkdirSync("./build/src/OotOnline/libs");
}
fse.copySync("./libs", "./build/src/OotOnline/libs", { dereference: true });
try {
    fse.unlinkSync("./build/src/OotOnline/libs/Z64Lib/icon.gif");
} catch (err) {
}
try {
    fse.unlinkSync("./build/src/OotOnline/libs/Z64Lib/icon.png");
} catch (err) {
}

let og = process.cwd();
process.chdir("./OcarinaofTimeOnline-HolidayAssets/Halloween");
let zipFile: zip = new zip();
zipFile.addLocalFolder("./assets", "assets");
zipFile.writeZip("./assets.zip");
let buf: SmartBuffer = new SmartBuffer();
let data: Buffer = fse.readFileSync("./assets.zip");
buf.writeBuffer(data);
while (buf.length % 0x10 !== 0) {
    buf.writeUInt8(0);
}
fse.writeFileSync("./assets.zip", buf.toBuffer().swap32());

process.chdir(og);
fse.moveSync(path.resolve("./OcarinaofTimeOnline-HolidayAssets/Halloween/assets.zip"), path.resolve("./build/src/OotOnline/WorldEvents/Halloween/assets.zip"));