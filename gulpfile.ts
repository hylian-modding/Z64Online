import gulp from 'gulp';
import fse from 'fs-extra';
var ts = require('gulp-typescript');
var tsProject = ts.createProject('./tsconfig.json');

gulp.task('postinstall', function () {
    if (!fse.existsSync("./build/src/OotOnline/libs")) {
        console.log("Binding Z64Lib...");
        fse.mkdirSync("./build/src/OotOnline/libs");
        fse.copySync("./libs", "./build/src/OotOnline/libs", { dereference: true });
        try {
            fse.unlinkSync("./build/src/OotOnline/libs/Z64Lib/icon.gif");
        } catch (err) {
        }
        try {
            fse.unlinkSync("./build/src/OotOnline/libs/Z64Lib/icon.png");
        } catch (err) {
        }
    }
    return gulp.src('.');
});

gulp.task('build', function () {
    return gulp.src('./src/**/*.ts')
        .pipe(tsProject())
        .pipe(gulp.dest('./build/src'));
});

gulp.task('default', gulp.series(['build', 'postinstall']));