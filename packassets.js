"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
exports.MonkeyPatch_Stringify = void 0;
var fs_extra_1 = __importDefault(require("fs-extra"));
var path_1 = __importDefault(require("path"));
var adm_zip_1 = __importDefault(require("adm-zip"));
var crypto_1 = __importDefault(require("crypto"));
// Copied from ML core. Needed for the packing process.
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
var c = path_1["default"].resolve("./cache/Z64O_Assets.content");
if (fs_extra_1["default"].existsSync(c)) {
    fs_extra_1["default"].unlinkSync(c);
}
if (1) {
    var og = process.cwd();
    var zipFile = new adm_zip_1["default"]();
    process.chdir("./OcarinaofTimeOnline-HolidayAssets");
    zipFile.addLocalFolder("./Rewards", "");
    process.chdir(og);
    var private_key = fs_extra_1["default"].readFileSync('./privateKey.pem', 'utf-8');
    //File to be signed
    var _file = pad(zipFile.toBuffer()).swap32();
    //Signing
    var signer = crypto_1["default"].createSign('sha256');
    signer.update(_file);
    signer.end();
    var signature = signer.sign(private_key);
    var data = { data: _file, sig: signature };
    fs_extra_1["default"].writeFileSync(c, Buffer.from(JSON.stringify(data)));
}
