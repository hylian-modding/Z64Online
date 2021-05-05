import gulp from 'gulp';
import fs from 'fs-extra';
var ts = require('gulp-typescript');
var tsProject = ts.createProject('./tsconfig.json');
var sourcemaps = require('gulp-sourcemaps');

gulp.task('postinstall', function () {
    try{
        fs.mkdirSync("./build/src/OotOnline/libs");
        fs.copySync("./node_modules/Z64Lib", "./build/src/OotOnline/libs/Z64Lib", {dereference: true});
    }catch(err){
    }
    return gulp.src('.');
});

gulp.task('build', function () {
    return gulp.src('./src/**/*.ts')
        .pipe(sourcemaps.init())
        .pipe(tsProject())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./build/src'));
});

gulp.task('default', gulp.series(['build', 'postinstall']));