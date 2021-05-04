import gulp from 'gulp';
var ts = require('gulp-typescript');
var tsProject = ts.createProject('./tsconfig.json');
var sourcemaps = require('gulp-sourcemaps');

gulp.task('postinstall', function () {
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