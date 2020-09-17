import fse from 'fs-extra';
import path from 'path';

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