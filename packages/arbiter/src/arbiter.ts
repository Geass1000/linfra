import * as NodeFS from 'fs';
import * as _ from 'lodash';
import * as Core from '@linfra/core';

import { Interfaces } from './shared';

const FSHelper = Core.Helpers.FSHelper;

export class Arbiter {
  /**
   * Create instance of Arbiter class.
   *
   * @return {Arbiter}
   */
  static create (): Arbiter {
    const inst = new Arbiter();
    return inst;
  }

  /**
   * Extracts all package.json files from packages in a specific folder.
   *
   * @param  {string} folderPath - path to folder which contains packages
   * @return {Interfaces.PackageJSON[]}
   */
  private getPackageJSONFiles (
    folderPath: string,
  ): Interfaces.PackageJSON[] {
    const packages = FSHelper.getPathsOfFoldersByPath(folderPath);

    const packageJSONs: Interfaces.PackageJSON[] = [];
    _.forEach(packages, (packageFolderPath) => {
      const pathToPackageJSONInPackage = `${packageFolderPath}/package.json`;

      const packageJSONFile: string = NodeFS.readFileSync(pathToPackageJSONInPackage, {
        encoding: `utf8`,
      });

      try {
        const packageJSON: Interfaces.PackageJSON = JSON.parse(packageJSONFile);
        packageJSONs.push(packageJSON);
      } catch (error) {
        console.warn(`Arbiter - buildDependencyPipeline:`,
          `Package JSON file (${pathToPackageJSONInPackage}) has an invalid JSON structure`);
        return null;
      }
    });
    return packageJSONs;
  }
}
