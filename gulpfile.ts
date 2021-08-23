import gulp from 'gulp'
import fs from 'fs-extra'
import child_process from 'child_process'
import fse from 'fs-extra'
import path from 'path'
import zip from 'adm-zip'
import crypto from 'crypto'
var recursive = require('recursive-readdir')

// Copied from ML core. Needed for the packing process.
export class MonkeyPatch_Stringify {
    original: any
    replacement: any

    patch() {
        const BJSON = require('buffer-json')
        this.original = JSON.stringify
        this.replacement = (
            value: any,
            replacer?: (this: any, key: string, value: any) => any,
            space?: string | number
        ) => {
            if (replacer === undefined) {
                return this.original(value, BJSON.replacer, space)
            }
            return this.original(value, replacer, space)
        }
            ; (JSON as any)['stringify'] = this.replacement as Function
    }

    unpatch() {
        ; (JSON as any)['stringify'] = this.original as Function
    }
}

const mp = new MonkeyPatch_Stringify()
mp.patch()

function pad(buf: Buffer) {
    let size = buf.byteLength
    while (size % 0x10 !== 0) {
        size++
    }
    let b = Buffer.alloc(size)
    buf.copy(b)
    return b
}

gulp.task('postinstall', function () {
    return gulp.src('./node_modules/Z64Lib')
})

gulp.task('build', function () {
    try {
        let meta = JSON.parse(fs.readFileSync("./src/OotOnline/package.json").toString());
        meta.date = new Date().toUTCString();
        fs.writeFileSync("./src/OotOnline/package.json", JSON.stringify(meta, null, 2));
        child_process.execSync('npx tsc');
    } catch (err) {
        console.log(err.stack);
    }
    return gulp.src('./src/**/*.ts')
})

gulp.task('_build_production', function () {
    //console.log("enforcing style")
    //child_process.execSync(`npx prettier --write "**/*.ts"`)
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
            let meta = JSON.parse(fs.readFileSync("./src/OotOnline/package.json").toString());
            meta.date = new Date().toUTCString();
            fs.writeFileSync("./src/OotOnline/package.json", JSON.stringify(meta, null, 2));
            child_process.execSync('npx tsc')
        } catch (err) {
            console.log(err.stack);
        }
        fse.copySync("./src", "./build/src")
        console.log('restoring')
        back.forEach((file: Buffer, name: string) => {
            fs.writeFileSync(name, file)
        })
    })
    return gulp.src('./src/**/*.ts')
})

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
            try {
                fs.writeFileSync(files[i], child_process.execSync(`minify \"${files[i]}\"`).toString());
            } catch (err) {
                console.log("Failed to minify " + files[i]);
            }
            let lzma: any = require("lzma");
            let data = Buffer.from(lzma.compress(fs.readFileSync(files[i])));
            fs.writeFileSync(path.resolve(path.parse(files[i]).dir, path.parse(files[i]).name + ".mlz"), data.toString('base64'));
            fs.removeSync(files[i]);
        }
    })
    return gulp.src('./src/**/*.ts')
});

gulp.task("build_production", gulp.series(['_build_production', 'clean_up_crap', 'crush', 'postinstall']))

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
    fse.writeFileSync(c, Buffer.from(JSON.stringify(data)))
    fse.writeFileSync(c2, Buffer.from(JSON.stringify(data)))
    return gulp.src('.')
})

gulp.task('default', gulp.series(['build', 'postinstall']))
