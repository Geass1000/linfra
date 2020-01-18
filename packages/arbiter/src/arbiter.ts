import * as NodeFS from 'fs';
import * as _ from 'lodash';
import * as Core from '@linfra/core';

import { Interfaces } from './shared';

const FSHelper = Core.Helpers.FSHelper;
const TreeModule = Core.TreeModule;

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
   * Builds tree nodes for each package from args.
   *
   * @param  {Interfaces.PackageJSON[]} packageJSONs
   * @return {Core.TreeModule.TreeNode<Interfaces.PackageJSON>[]}
   */
  private buildTreeNodesOfPackages (
    packageJSONs: Interfaces.PackageJSON[],
  ): Core.TreeModule.TreeNode<Interfaces.PackageJSON>[] {
    const treeNodeForOwnPackages = _.map(packageJSONs, (packageJSON) => {
      const treeNodeForOwnPackage = new TreeModule.TreeNode(packageJSON);
      return treeNodeForOwnPackage;
    });

    _.forEach(treeNodeForOwnPackages, (treeNodeForOwnPackage) => {
      this.bindTreeNodesOfPackages(treeNodeForOwnPackage, treeNodeForOwnPackages);
    });

    return treeNodeForOwnPackages;
  }

  /**
   * Binds tree nodes of packages to the tree node of selected package.
   *
   * @mutable - change the list of node's children of selected package
   * @param  {Core.TreeModule.TreeNode<Interfaces.PackageJSON>} treeNodeForCurPackage
   * @param  {Core.TreeModule.TreeNode<Interfaces.PackageJSON>} treeNodeForOwnPackages
   * @return {void}
   */
  private bindTreeNodesOfPackages (
    treeNodeForCurPackage: Core.TreeModule.TreeNode<Interfaces.PackageJSON>,
    treeNodeForOwnPackages: Core.TreeModule.TreeNode<Interfaces.PackageJSON>[],
  ): void {
    const curPackage = treeNodeForCurPackage.value;

    _.forEach(treeNodeForOwnPackages, (treeNodeForOwnPackage) => {
      const onwPackage = treeNodeForOwnPackage.value;
      if (onwPackage.name === curPackage.name) {
        return;
      }

      const depPackagesNames = Object.keys(curPackage.dependencies);
      const indexOfPackage = _.findIndex(depPackagesNames, (key) => {
        return key === onwPackage.name;
      });

      if (indexOfPackage === -1) {
        return;
      }

      treeNodeForCurPackage.addChild(treeNodeForOwnPackage, `name`);
    });
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
