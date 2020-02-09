/* eslint-disable @typescript-eslint/explicit-function-return-type */
const gulp = require(`gulp`);
const ts = require(`gulp-typescript`);
const replace = require('gulp-replace');
const _ = require(`lodash`);

const sourceFolder = `./src`;
const distFolder = `./dist`;

const GulpCommon = require(`./gulp.common`);

module.exports = _.reduce([ GulpCommon ], (partOfGulpModule, gulpFile) => {
  return {
    ...partOfGulpModule,
    ...gulpFile,
  };
}, {});
exports = module.exports;

/**
 * TS Compilator
 */

const prodTSConfig = ts.createProject(`./tsconfig.prod.json`);

exports[`build:ts`] = function buildTSTask () {
  return gulp.src(`${sourceFolder}/**/*.ts`)
    .pipe(prodTSConfig())
    .on('error', () => { /* Ignore compiler errors */})
    .pipe(gulp.dest(`${distFolder}`));
};

exports[`build:src`] = gulp.series(
  exports[`build:ts`],
  exports[`move:jts`],
);

exports[`build:packageJson`] = function buildPackageJson () {
  return gulp.src([
    `./package.json`,
  ])
    .pipe(replace(/\.\/dist\/index\.js/g, './index.js'))
    .pipe(gulp.dest(`${distFolder}`));
};

exports[`build`] = gulp.series(
  exports[`eslint`],
  exports[`clear:dist`],
  exports[`build:src`],
  exports[`build:packageJson`],
);
