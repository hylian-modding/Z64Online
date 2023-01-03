"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var fs_extra_1 = __importDefault(require("fs-extra"));
var child_process_1 = __importDefault(require("child_process"));
var path_1 = __importDefault(require("path"));
var name = "Z64Online";
function remove_nightly_tag() {
    try {
        var meta = JSON.parse(fs_extra_1["default"].readFileSync("./src/".concat(name, "/package.json")).toString());
        meta.date = "";
        meta.commit = "";
        meta.version = meta.version.split("-")[0];
        fs_extra_1["default"].writeFileSync("./src/".concat(name, "/package.json"), JSON.stringify(meta, null, 2));
    }
    catch (err) {
        console.log(err.stack);
    }
}
function update_nightly_tag() {
    try {
        var meta = JSON.parse(fs_extra_1["default"].readFileSync("./src/".concat(name, "/package.json")).toString());
        meta.date = new Date().toUTCString();
        meta.commit = child_process_1["default"].execSync("git rev-parse --short HEAD").toString().replace("\n", "");
        meta.version = meta.version.split("-")[0];
        meta.version = meta.version + "-nightly@".concat(meta.commit);
        fs_extra_1["default"].writeFileSync("./src/".concat(name, "/package.json"), JSON.stringify(meta, null, 2));
    }
    catch (err) {
        console.log(err.stack);
    }
}
function update_assembly() {
    var og = process.cwd();
    fs_extra_1["default"].readdirSync("./overlay").forEach(function (d) {
        var dir = path_1["default"].resolve("./overlay", d);
        if (fs_extra_1["default"].lstatSync(dir).isDirectory()) {
            var make = path_1["default"].resolve(dir, "Makefile");
            if (fs_extra_1["default"].existsSync(make)) {
                process.chdir(dir);
                //let c = `${makeTemplate}`.replace("REPLACEMEPLS", d);
                //fs.writeFileSync("./Makefile", c);
                child_process_1["default"].execSync("make clean && make -j6", { stdio: 'inherit' });
                process.chdir("./bin");
                child_process_1["default"].execSync("bintots -d .");
                process.chdir(dir);
                fs_extra_1["default"].renameSync("./bin/bin.ts", "./bin/".concat(path_1["default"].parse(dir).name, ".ts"));
                process.chdir(og);
                fs_extra_1["default"].copyFileSync(path_1["default"].resolve(dir, "./bin/".concat(path_1["default"].parse(dir).name, ".ts")), path_1["default"].resolve("./src/".concat(name, "/overlay"), "".concat(path_1["default"].parse(dir).name, ".ts")));
            }
        }
    });
    fs_extra_1["default"].unlinkSync("./src/".concat(name, "/overlay/HaxBase.ts"));
}
function update_specific_assembly() {
    var og = process.cwd();
    fs_extra_1["default"].readdirSync("./overlay").forEach(function (d) {
        var dir = path_1["default"].resolve("./overlay", d);
        if (fs_extra_1["default"].lstatSync(dir).isDirectory()) {
            var make = path_1["default"].resolve(dir, "Makefile");
            if (fs_extra_1["default"].existsSync(make)) {
                for (var i = 0; i < process.argv.length; i++) {
                    if (process.argv[i].indexOf(d) > -1) {
                        process.chdir(dir);
                        child_process_1["default"].execSync("make clean && make", { stdio: 'inherit' });
                        process.chdir("./bin");
                        fs_extra_1["default"].removeSync("./mm");
                        fs_extra_1["default"].removeSync("./oot_10");
                        fs_extra_1["default"].removeSync("./oot_debug");
                        child_process_1["default"].execSync("bintots -d .");
                        process.chdir(dir);
                        fs_extra_1["default"].renameSync("./bin/bin.ts", "./bin/".concat(path_1["default"].parse(dir).name, ".ts"));
                        process.chdir(og);
                        fs_extra_1["default"].copyFileSync(path_1["default"].resolve(dir, "./bin/".concat(path_1["default"].parse(dir).name, ".ts")), path_1["default"].resolve("./src/".concat(name, "/overlay"), "".concat(path_1["default"].parse(dir).name, ".ts")));
                    }
                }
            }
        }
    });
}
var map = new Map(([
    ["update_nightly_tag", update_nightly_tag],
    ["remove_nightly_tag", remove_nightly_tag],
    ["update_assembly", update_assembly],
    ["update_specific_assembly", update_specific_assembly]
]));
for (var i = 0; i < process.argv.length; i++) {
    if (map.has(process.argv[i])) {
        map.get(process.argv[i])();
    }
}
