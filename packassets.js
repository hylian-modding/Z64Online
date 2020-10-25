"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
exports.MonkeyPatch_Stringify = void 0;
var fs_extra_1 = __importDefault(require("fs-extra"));
var path_1 = __importDefault(require("path"));
var adm_zip_1 = __importDefault(require("adm-zip"));
var MonkeyPatch_Stringify = /** @class */ (function () {
    function MonkeyPatch_Stringify() {
    }
    MonkeyPatch_Stringify.prototype.patch = function () {
        var _this = this;
        var BJSON = require('buffer-json');
        this.original = JSON.stringify;
        this.replacement = function (value, replacer, space) {
            if (replacer === undefined) {
                return _this.original(value, BJSON.replacer, space);
            }
            return _this.original(value, replacer, space);
        };
        JSON['stringify'] = this.replacement;
    };
    MonkeyPatch_Stringify.prototype.unpatch = function () {
        JSON['stringify'] = this.original;
    };
    return MonkeyPatch_Stringify;
}());
exports.MonkeyPatch_Stringify = MonkeyPatch_Stringify;
var mp = new MonkeyPatch_Stringify();
mp.patch();
function pad(buf) {
    var size = buf.byteLength;
    while (size % 0x10 !== 0) {
        size++;
    }
    var b = Buffer.alloc(size);
    buf.copy(b);
    return b;
}
if (!fs_extra_1["default"].existsSync(path_1["default"].resolve("./dist/halloween2020.content"))) {
    console.log("Packing holiday assets...");
    var og = process.cwd();
    process.chdir("./OcarinaofTimeOnline-HolidayAssets/Halloween");
    var zipFile = new adm_zip_1["default"]();
    zipFile.addLocalFolder("./assets", "assets");
    zipFile.writeZip("./assets.zip");
    process.chdir(og);
    //fse.moveSync(path.resolve("./OcarinaofTimeOnline-HolidayAssets/Halloween/assets.zip"), path.resolve("./dist/halloween2020.zip"));
    var content = JSON.stringify({ data: pad(fs_extra_1["default"].readFileSync('./OcarinaofTimeOnline-HolidayAssets/Halloween/assets.zip')).swap32() });
    console.log(path_1["default"].resolve("./dist/halloween2020.content"));
    fs_extra_1["default"].writeFileSync(path_1["default"].resolve("./dist/halloween2020.content"), Buffer.from(content));
}
