import fse from 'fs-extra';
import path from 'path';
import child_process from 'child_process';

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
child_process.execSync("paker -d ./assets -o ./");
process.chdir(og);
fse.moveSync(path.resolve("./OcarinaofTimeOnline-HolidayAssets/Halloween/assets.pak"), path.resolve("./build/src/OotOnline/WorldEvents/Halloween/assets.pak"));