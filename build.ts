import fs from 'fs-extra';
import child_process from 'child_process';
import path from 'path';

const name: string = "Z64Online";

function remove_nightly_tag() {
    try {
        let meta = JSON.parse(fs.readFileSync(`./src/${name}/package.json`).toString());
        meta.date = "";
        meta.commit = "";
        meta.version = meta.version.split("-")[0];
        fs.writeFileSync(`./src/${name}/package.json`, JSON.stringify(meta, null, 2));
    } catch (err: any) {
        console.log(err.stack);
    }
}

function update_nightly_tag() {
    try {
        let meta = JSON.parse(fs.readFileSync(`./src/${name}/package.json`).toString());
        meta.date = new Date().toUTCString();
        meta.commit = child_process.execSync("git rev-parse --short HEAD").toString().replace("\n", "");
        meta.version = meta.version.split("-")[0];
        meta.version = meta.version + `-nightly@${meta.commit}`;
        fs.writeFileSync(`./src/${name}/package.json`, JSON.stringify(meta, null, 2));
    } catch (err: any) {
        console.log(err.stack);
    }
}

function update_assembly() {
    let og = process.cwd();
    fs.readdirSync("./overlay").forEach((d: string) => {
        let dir = path.resolve("./overlay", d);
        if (fs.lstatSync(dir).isDirectory()) {
            let make = path.resolve(dir, "Makefile");
            if (fs.existsSync(make)) {
                process.chdir(dir);
                child_process.execSync("make clean && make -j6", { stdio: 'inherit' });
                process.chdir("./bin");
                child_process.execSync("bintots -d .");
                process.chdir(dir);
                fs.renameSync("./bin/bin.ts", `./bin/${path.parse(dir).name}.ts`);
                process.chdir(og);
                fs.copyFileSync(path.resolve(dir, `./bin/${path.parse(dir).name}.ts`), path.resolve(`./src/${name}/overlay`, `${path.parse(dir).name}.ts`));
            }
        }
    });
    fs.unlinkSync(`./src/${name}/overlay/HaxBase.ts`);
}

function update_specific_assembly() {
    let og = process.cwd();
    fs.readdirSync("./overlay").forEach((d: string) => {
        let dir = path.resolve("./overlay", d);
        if (fs.lstatSync(dir).isDirectory()) {
            let make = path.resolve(dir, "Makefile");
            if (fs.existsSync(make)) {
                for (let i = 0; i < process.argv.length; i++) {
                    if (process.argv[i].indexOf(d) > -1) {
                        process.chdir(dir);
                        child_process.execSync("make clean && make", { stdio: 'inherit' });
                        process.chdir("./bin");
                        fs.removeSync("./mm");
                        fs.removeSync("./oot_10");
                        fs.removeSync("./oot_debug");
                        child_process.execSync("bintots -d .");
                        process.chdir(dir);
                        fs.renameSync("./bin/bin.ts", `./bin/${path.parse(dir).name}.ts`);
                        process.chdir(og);
                        fs.copyFileSync(path.resolve(dir, `./bin/${path.parse(dir).name}.ts`), path.resolve(`./src/${name}/overlay`, `${path.parse(dir).name}.ts`));
                    }
                }
            }
        }
    });
}

const map: Map<string, Function> = new Map(([
    ["update_nightly_tag", update_nightly_tag],
    ["remove_nightly_tag", remove_nightly_tag],
    ["update_assembly", update_assembly],
    ["update_specific_assembly", update_specific_assembly]
]));

for (let i = 0; i < process.argv.length; i++) {
    if (map.has(process.argv[i])) {
        map.get(process.argv[i])!();
    }
}