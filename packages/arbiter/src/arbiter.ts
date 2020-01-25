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
   * Create copy of package.json config with linfra dependencies for each package.
   *
   * @param  {Interfaces.LinfraModule[]} packageJSONs
   * @return {Interfaces.LinfraModule[]}
   */
  private buildLinfraLinfraModules (
    packageJSONs: Interfaces.LinfraModule[],
  ): Interfaces.LinfraModule[] {
    const treeNodeForOwnPackages = this.buildTreeNodesOfPackages(packageJSONs);

    const linfraLinfraModules = _.map(treeNodeForOwnPackages, (treeNodeForOwnPackage) => {
      const ownLinfraModule = treeNodeForOwnPackage.value;

      const linfraDependencies = _.map(treeNodeForOwnPackage.children, (childNode) => {
        const childPackageJson = childNode.value;
        return childPackageJson;
      });

      return {
        ...ownLinfraModule,
        linfraDeps: linfraDependencies,
      };
    });

    return linfraLinfraModules;
  }

  /**
   * Creates a list of pipeline levels. Each level depends on the previous level and
   * can be processed only if the previous level has been processed. Items from one level can
   * be processed concurrently.
   *
   * @param  {Interfaces.LinfraModule[]} packageJSONs
   * @return {Interfaces.LinfraModule[][]}
   */
  private buildPipelineLevels (
    packageJSONs: Interfaces.LinfraModule[],
  ): Interfaces.LinfraModule[][] {
    const treeNodeForOwnPackages = this.buildTreeNodesOfPackages(packageJSONs);

    const pipelineLevels: Interfaces.LinfraModule[][] = [];
    while (!_.isEmpty(treeNodeForOwnPackages)) {
      const pipelineLevelNodes = _.filter(treeNodeForOwnPackages, (treeNodeForOwnPackage) => {
        return treeNodeForOwnPackage.hasChildren() === false;
      });

      const pipelineLevel = _.map(pipelineLevelNodes, (pipelineLevelNode) => {
        this.removeTreeNodeFromTreeNodeList(
          pipelineLevelNode,
          treeNodeForOwnPackages,
        );

        return pipelineLevelNode.value;
      });

      pipelineLevels.push(pipelineLevel);
    }
    return pipelineLevels;
  }

  /**
   * Returns true if packages have circular dependencies and false otherwise.
   *
   * @param  {Interfaces.LinfraModule[]} packageJSONs
   * @return {boolean}
   */
  private packagesHasCircularDependencies (
    linfraModules: Interfaces.LinfraModule[],
  ): boolean {
    const treeNodeForOwnPackages = this.buildTreeNodesOfPackages(linfraModules);

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
   * @param  {Core.TreeModule.TreeNode<Interfaces.LinfraModule>} curTreeNode
   * @param  {Core.TreeModule.TreeNode<Interfaces.LinfraModule>} treeNodeList
   * @return {void}
   */
  private removeTreeNodeFromTreeNodeList (
    curTreeNode: Core.TreeModule.TreeNode<Interfaces.LinfraModule>,
    treeNodeList: Core.TreeModule.TreeNode<Interfaces.LinfraModule>[],
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
   * @param  {Interfaces.LinfraModule[]} packageJSONs
   * @return {Core.TreeModule.TreeNode<Interfaces.LinfraModule>[]}
   */
  private buildTreeNodesOfPackages (
    linfraModules: Interfaces.LinfraModule[],
  ): Core.TreeModule.TreeNode<Interfaces.LinfraModule>[] {
    const treeNodeForOwnPackages = _.map(linfraModules, (linfraModule) => {
      const treeNodeForOwnPackage = new TreeModule.TreeNode(linfraModule);
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
   * @param  {Core.TreeModule.TreeNode<Interfaces.LinfraModule>} treeNodeForCurPackage
   * @param  {Core.TreeModule.TreeNode<Interfaces.LinfraModule>} treeNodeForOwnPackages
   * @return {void}
   */
  private bindTreeNodesOfPackages (
    treeNodeForCurPackage: Core.TreeModule.TreeNode<Interfaces.LinfraModule>,
    treeNodeForOwnPackages: Core.TreeModule.TreeNode<Interfaces.LinfraModule>[],
  ): void {
    const curPackage = treeNodeForCurPackage.value;

    _.forEach(treeNodeForOwnPackages, (treeNodeForOwnPackage) => {
      const onwPackage = treeNodeForOwnPackage.value;
      if (onwPackage.packageJSON.name === curPackage.packageJSON.name) {
        return;
      }

      const depPackagesNames = Object.keys(curPackage.packageJSON.dependencies);
      const indexOfPackage = _.findIndex(depPackagesNames, (key) => {
        return key === onwPackage.packageJSON.name;
      });

      if (indexOfPackage === -1) {
        return;
      }

      treeNodeForCurPackage.addChild(treeNodeForOwnPackage, `name`);
    });
  }

  /**
   * Extracts all package.json files from packages in a specific folder and
   * creates Linfra module for each package.
   *
   * @param  {string} folderPath - path to folder which contains packages
   * @return {Interfaces.LinfraModule[]}
   */
  private getLinfraModules (
    folderPath: string,
  ): Interfaces.LinfraModule[] {
    const packages = FSHelper.getPathsOfFoldersByPath(folderPath);

    const linfraModules: Interfaces.LinfraModule[] = [];
    _.forEach(packages, (packageFolderPath) => {
      const pathToLinfraModuleInPackage = `${packageFolderPath}/package.json`;

      const packageJSONFile: string = NodeFS.readFileSync(pathToLinfraModuleInPackage, {
        encoding: `utf8`,
      });

      try {
        const packageJSON: Interfaces.PackageJSON = JSON.parse(packageJSONFile);

        const folderName = FSHelper.getFileNameByPath(packageFolderPath);
        const linfraModule: Interfaces.LinfraModule = {
          folderName: folderName,
          pathToFolder: packageFolderPath,
          packageJSON: packageJSON,
        };
        linfraModules.push(linfraModule);
      } catch (error) {
        console.warn(`Arbiter - getLinfraModules:`,
          `Package JSON file (${pathToLinfraModuleInPackage}) has an invalid JSON structure`);
        return null;
      }
    });
    return linfraModules;
  }
}
