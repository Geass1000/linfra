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
   * Returns true if packages have circular dependencies and false otherwise.
   *
   * @param  {Interfaces.PackageJSON[]} packageJSONs
   * @return {boolean}
   */
  packagesHasCircularDependencies (
    packageJSONs: Interfaces.PackageJSON[],
  ): boolean {
    const treeNodeForOwnPackages = this.buildTreeNodesOfPackages(packageJSONs);

    while (!_.isEmpty(treeNodeForOwnPackages)) {
      const nodeWithoutDeps = _.find(treeNodeForOwnPackages, (treeNodeForOwnPackage) => {
        const nodeHasChildren = treeNodeForOwnPackage.hasChildren();
        return nodeHasChildren === false;
      });

      if (_.isNil(nodeWithoutDeps)) {
        return true;
      }

      this.removeTreeNodeFromTreeNodeList(
        nodeWithoutDeps,
        treeNodeForOwnPackages,
      );
    }

    return false;
  }

  /**
   * Removes tree node of current package from the list of tree nodes of packages.
   *
   * @mutable - change the list of node's children of selected package
   * @param  {Core.TreeModule.TreeNode<Interfaces.PackageJSON>} curTreeNode
   * @param  {Core.TreeModule.TreeNode<Interfaces.PackageJSON>} treeNodeList
   * @return {void}
   */
  private removeTreeNodeFromTreeNodeList (
    curTreeNode: Core.TreeModule.TreeNode<Interfaces.PackageJSON>,
    treeNodeList: Core.TreeModule.TreeNode<Interfaces.PackageJSON>[],
  ): void {
    _.forEach(treeNodeList, (treeNode) => {
      if (treeNode === curTreeNode) {
        return;
      }

      if (treeNode.hasChild(curTreeNode) === false) {
        return;
      }

      treeNode.removeChild(curTreeNode);
    });

    _.remove(treeNodeList, curTreeNode);
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

        const folderName = FSHelper.getFileNameByPath(packageFolderPath);
        const packageJSONWithLinfraMetadata = {
          ...packageJSON,
          linfra: {
            folderName: folderName,
            pathToFolder: packageFolderPath,
          },
        };
        packageJSONs.push(packageJSONWithLinfraMetadata);
      } catch (error) {
        console.warn(`Arbiter - buildDependencyPipeline:`,
          `Package JSON file (${pathToPackageJSONInPackage}) has an invalid JSON structure`);
        return null;
      }
    });
    return packageJSONs;
  }
}
