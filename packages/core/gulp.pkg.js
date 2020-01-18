/* eslint-disable @typescript-eslint/explicit-function-return-type */
const gulp = require(`gulp`);
const ts = require(`gulp-typescript`);

const sourceFolder = `./src`;
const distFolder = `./dist`;

const GulpCommon = require(`./gulp.common`);
const { GulpHelper } = require(`../../bootstrap/helpers/gulp.helper`);

module.exports = GulpHelper.combineGulpFiles(
  GulpCommon,
);
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

exports[`build`] = gulp.series(
  exports[`eslint`],
  exports[`clear:dist`],
  exports[`build:src`],
);
