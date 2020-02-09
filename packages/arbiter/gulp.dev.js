/* eslint-disable @typescript-eslint/explicit-function-return-type */
const gulp = require(`gulp`);
const ts = require(`gulp-typescript`);
const mocha = require(`gulp-mocha`);

const Core = require(`@linfra/core`);

const sourceFolder = `./src`;
const distFolder = `./dist`;

const GulpCommon = require(`./gulp.common`);

module.exports = Core.Helpers.GulpHelper.combineGulpFiles(
  GulpCommon,
);
exports = module.exports;

/**
 * TS Compilator
 */

const devTSConfig = ts.createProject(`./tsconfig.json`);

exports[`build:ts`] = function buildTSTask () {
  return gulp.src(`${sourceFolder}/**/*.ts`)
    .pipe(devTSConfig())
    .on('error', () => { /* Ignore compiler errors */})
    .pipe(gulp.dest(`${distFolder}`));
};

exports[`build:src`] = gulp.series(
  exports[`build:ts`],
  exports[`move:jts`],
);

exports[`build`] = gulp.series(
  exports[`eslint`],
  exports[`clear:test`],
  exports[`build:src`],
);

exports[`build:watch`] = gulp.series(
  function buildWatchTask () {
    return gulp.watch([
      `${sourceFolder}/**/*.ts`,
      `${sourceFolder}/**/*.js`,
      `${sourceFolder}/**/*.json`,
    ], gulp.series(exports[`build`]));
  },
);

/**
 * Tests
 */

exports[`test:start`] = function testStartTask () {
  return gulp.src(`${distFolder}/**/*.spec.js`)
    .pipe(mocha({ reporter: 'spec', exit: true }))
    .once('error', (error) => {
      console.error(error);
    });
};

exports[`test:watch`] = gulp.series(
  exports[`test:start`],
  function testWatchTask () {
    return gulp.watch([
      `${distFolder}/**/*.js`,
    ], gulp.series(exports[`test:start`]));
  },
);
