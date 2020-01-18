import * as _ from 'lodash';

export class GulpHelper {
  static combineGulpFiles (...gulpFiles: any[]): any {
    const gulpModule = _.reduce(gulpFiles, (partOfGulpModule, gulpFile) => {
      return {
        ...partOfGulpModule,
        ...gulpFile,
      };
    }, {});

    return gulpModule;
  }
}
