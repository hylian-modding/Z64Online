import gulp from 'gulp'
import fs from 'fs-extra'
import child_process from 'child_process'
import fse from 'fs-extra'
import path from 'path'
import zip from 'adm-zip'
import crypto from 'crypto'
var recursive = require('recursive-readdir')
import zlib from 'zlib';
import { serialize } from './src/Z64Online/node_modules/bson';

function pad(buf: Buffer) {
    let size = buf.byteLength
    while (size % 0x10 !== 0) {
        size++
    }
    let b = Buffer.alloc(size)
    buf.copy(b)
    return b
}

gulp.task('update_assembly', function () {
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
                fs.copyFileSync(path.resolve(dir, `./bin/${path.parse(dir).name}.ts`), path.resolve("./src/Z64Online/overlay", `${path.parse(dir).name}.ts`));
            }
        }
    });
    fs.unlinkSync("./src/Z64Online/overlay/HaxBase.ts");
    return gulp.src('./src/**/*.ts')
});

gulp.task("update_control", function(){
    let og = process.cwd();
    fs.readdirSync("./overlay").forEach((d: string) => {
        if (d !== "EnemyControl") return;
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
                fs.copyFileSync(path.resolve(dir, `./bin/${path.parse(dir).name}.ts`), path.resolve("./src/Z64Online/overlay", `${path.parse(dir).name}.ts`));
            }
        }
    });
    return gulp.src('./src/**/*.ts')
});

gulp.task('build_dev', function () {
    try {
        let meta = JSON.parse(fs.readFileSync("./src/Z64Online/package.json").toString());
        meta.date = new Date().toUTCString();
        meta.commit = child_process.execSync("git rev-parse --short HEAD").toString().replace("\n", "");
        meta.version = meta.version.split("-")[0];
        meta.version = meta.version + `-nightly@${meta.commit}`;
        fs.writeFileSync("./src/Z64Online/package.json", JSON.stringify(meta, null, 2));
    } catch (err: any) {
        console.log(err.stack);
    }
    child_process.execSync('npx tsc', {stdio: 'inherit'});
    return gulp.src('./src/**/*.ts')
});

gulp.task('build', gulp.series(['build_dev']));

gulp.task('_build_production', function () {
    var uprocess = require('uprocess')
    var defines = {
    }
    let back: Map<string, Buffer> = new Map<string, Buffer>()
    recursive('./src', function (err: any, files: any) {
        for (let i = 0; i < files.length; i++) {
            files[i] = path.resolve(`./${files[i]}`)
            if (path.parse(files[i]).ext !== '.ts') {
                continue
            }
            back.set(files[i], fs.readFileSync(files[i]))
            fs.writeFileSync(files[i], uprocess.processFile(files[i], defines))
        }
        console.log('compiling')
        try {
            let meta = JSON.parse(fs.readFileSync("./src/Z64Online/package.json").toString());
            meta.date = new Date().toUTCString();
            fs.writeFileSync("./src/Z64Online/package.json", JSON.stringify(meta, null, 2));
            child_process.execSync('npx tsc', { stdio: 'inherit' });
        } catch (err: any) {
            console.log(err.stack);
        }
        fse.copySync("./src", "./build/src")
        console.log('restoring')
        back.forEach((file: Buffer, name: string) => {
            fs.writeFileSync(name, file)
        })
    })
    return gulp.src('./src/**/*.ts')
});

gulp.task('clean_up_crap', function () {
    let trash: string[] = ['.ts', '.map', '.lock'];
    recursive('./build', function (err: any, files: any) {
        for (let i = 0; i < files.length; i++) {
            files[i] = path.resolve(`./${files[i]}`)
            if (trash.indexOf(path.parse(files[i]).ext) > -1) {
                fs.removeSync(files[i]);
            }
        }
    })
    return gulp.src('./src/**/*.ts')
});

gulp.task('crush', function () {
    recursive('./build', function (err: any, files: any) {
        for (let i = 0; i < files.length; i++) {
            files[i] = path.resolve(`./${files[i]}`)
            if (path.parse(files[i]).ext !== ".js") continue;
            if (files[i].indexOf("node_modules") > -1) continue;
            let d = fs.readFileSync(files[i]);
            let size = d.byteLength;
            let check = d.toString();
            if (check.includes("!ML64_PROD_IGNORE")) {
                console.log(`${path.relative("./build", files[i])} skipped.`);
                fs.writeFileSync(files[i], child_process.execSync(`minify \"${files[i]}\"`).toString());
                continue;
            }
            fs.writeFileSync(files[i], child_process.execSync(`minify \"${files[i]}\"`).toString());
            let lzma: any = require("lzma");
            let data = Buffer.from(lzma.compress(fs.readFileSync(files[i])));
            fs.writeFileSync(path.resolve(path.parse(files[i]).dir, path.parse(files[i]).name + ".mlz"), data.toString('base64'));
            let comp = fs.readFileSync(files[i]).byteLength;
            let diff = size - comp;
            if (diff > 0) {
                console.log(`${path.relative("./build", files[i])} ${diff} bytes saved.`);
            } else {
                console.log(`${path.relative("./build", files[i])} ${diff} bytes lost!.`);
            }
            fs.removeSync(files[i]);
        }
    })
    return gulp.src('./src/**/*.ts')
});

gulp.task('packassets', function () {
    let c = path.resolve('./cache/Z64O_Assets.content')
    let c2 = path.resolve(
        `./dist/Z64O_Assets_${Date.now().toString(16).toUpperCase()}.content`
    )

    if (fse.existsSync(c)) {
        fse.unlinkSync(c)
    }

    let og = process.cwd()
    let zipFile: zip = new zip()
    process.chdir('./OcarinaofTimeOnline-HolidayAssets')
    zipFile.addLocalFolder('./Rewards', '')
    process.chdir(og)

    const private_key = fse.readFileSync('./OotO.pem', 'utf-8')
    //File to be signed
    let _file = pad(zipFile.toBuffer()).swap32()
    //Signing
    const signer = crypto.createSign('sha256')
    signer.update(_file)
    signer.end()
    const signature = signer.sign(private_key)

    let data: any = { data: _file, sig: signature }
    fse.writeFileSync(c, zlib.deflateSync(serialize(data)));
    fse.writeFileSync(c2, zlib.deflateSync(serialize(data)));
    return gulp.src('.')
});

gulp.task('generate_update_file', function () {
    try {
        let meta = JSON.parse(fs.readFileSync("./src/Z64Online/package.json").toString());
        fs.writeFileSync("./dist/update.json", JSON.stringify({
            version: meta.version,
            url: "https://repo.modloader64.com/mods/Z64O/update/Z64Online.pak",
            devUrl: "https://repo.modloader64.com/mods/Z64O/dev/Z64Online.pak"
        }, null, 2));
    } catch (err: any) {
        console.log(err.stack);
    }
    return gulp.src('./src/**/*.ts')
});

gulp.task('remove_nightly_flag', function () {
    try {
        let meta = JSON.parse(fs.readFileSync("./src/Z64Online/package.json").toString());
        meta.date = "";
        meta.commit = "";
        meta.version = meta.version.split("-")[0];
        fs.writeFileSync("./src/Z64Online/package.json", JSON.stringify(meta, null, 2));
    } catch (err: any) {
        console.log(err.stack);
    }
    return gulp.src('./src/**/*.ts')
});

gulp.task('oot', function () {
    let m = JSON.parse(fs.readFileSync("./modloader64-config.json").toString());
    m["ModLoader64"]["rom"] = "Legend of Zelda, The - Ocarina of Time (U) (V1.0) [!].z64";
    m["ModLoader64"]["patch"] = "Oot_Vanillamizer.bps";
    fs.writeFileSync("./modloader64-config.json", JSON.stringify(m, null, 2));
    return gulp.src('./src/**/*.ts');
});

gulp.task('roman', function () {
    let m = JSON.parse(fs.readFileSync("./modloader64-config.json").toString());
    m["ModLoader64"]["rom"] = "Legend of Zelda, The - Ocarina of Time (U) (V1.0) [!].z64";
    m["ModLoader64"]["patch"] = "Roman Color Test OOT.bps";
    fs.writeFileSync("./modloader64-config.json", JSON.stringify(m, null, 2));
    return gulp.src('./src/**/*.ts');
});

gulp.task('mm', function () {
    let m = JSON.parse(fs.readFileSync("./modloader64-config.json").toString());
    m["ModLoader64"]["rom"] = "Legend of Zelda, The - Majora's Mask (USA).z64";
    m["ModLoader64"]["patch"] = "MM_Vanillamizer_v14_16.bps";
    fs.writeFileSync("./modloader64-config.json", JSON.stringify(m, null, 2));
    return gulp.src('./src/**/*.ts');
});

gulp.task("build_production", gulp.series(['remove_nightly_flag', '_build_production', 'clean_up_crap', 'crush']));

gulp.task('default', gulp.series(['build']));
