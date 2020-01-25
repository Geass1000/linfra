import * as NodeFS from 'fs';
import * as _ from 'lodash';
import * as Core from '@linfra/core';

import { Interfaces } from './shared';

const FSHelper = Core.Helpers.FSHelper;
const GraphModule = Core.GraphModule;

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
   * Creates a list of pipeline levels. Each level depends on the previous level and
   * can be processed only if the previous level has been processed. Items from one level can
   * be processed concurrently.
   *
   * @param  {Interfaces.LinfraModule[]} packageJSONs
   * @return {Interfaces.LinfraModule[][]}
   */
  private buildPipelineLevels (
    linfraModules: Interfaces.LinfraModule[],
  ): Interfaces.LinfraModule[][] {
    const lmNodes = this.buildListOfLMNodes(linfraModules);

    const pipelineLevels: Interfaces.LinfraModule[][] = [];
    while (!_.isEmpty(lmNodes)) {
      const pipelineLevelNodes = _.filter(lmNodes, (lmNode) => {
        return lmNode.hasChildren() === false;
      });

      const pipelineLevel = _.map(pipelineLevelNodes, (pipelineLevelNode) => {
        this.removeLMNodeFromListOfLMNodes(
          pipelineLevelNode,
          lmNodes,
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
    const lmNodes = this.buildListOfLMNodes(linfraModules);

    while (!_.isEmpty(lmNodes)) {
      const nodeWithoutDeps = _.find(lmNodes, (lmNode) => {
        const nodeHasChildren = lmNode.hasChildren();
        return nodeHasChildren === false;
      });

      if (_.isNil(nodeWithoutDeps)) {
        return true;
      }

      this.removeLMNodeFromListOfLMNodes(
        nodeWithoutDeps,
        lmNodes,
      );
    }

    return false;
  }

  /**
   * Builds tree nodes for each package from args.
   *
   * @param  {Interfaces.LinfraModule[]} packageJSONs
   * @return {Core.GraphModule.GraphNode<Interfaces.LinfraModule>[]}
   */
  private buildListOfLMNodes (
    linfraModules: Interfaces.LinfraModule[],
  ): Core.GraphModule.GraphNode<Interfaces.LinfraModule>[] {
    const lmNodes = _.map(linfraModules, (linfraModule) => {
      const lmNode = new GraphModule.GraphNode(linfraModule);
      return lmNode;
    });

    _.forEach(lmNodes, (lmNode) => {
      this.bindDepsToLMNode(lmNode, lmNodes);
    });

    return lmNodes;
  }

  /**
   * Binds tree nodes of packages to the tree node of selected package.
   *
   * @mutable - change the list of node's children of selected package
   * @param  {Core.GraphModule.GraphNode<Interfaces.LinfraModule>} treeNodeForCurPackage
   * @param  {Core.GraphModule.GraphNode<Interfaces.LinfraModule>} treeNodeForOwnPackages
   * @return {void}
   */
  private bindDepsToLMNode (
    curLMNode: Core.GraphModule.GraphNode<Interfaces.LinfraModule>,
    lmNodes: Core.GraphModule.GraphNode<Interfaces.LinfraModule>[],
  ): void {
    const curLinfraModule = curLMNode.value;

    _.forEach(lmNodes, (lmNode) => {
      const linfraModule = lmNode.value;
      if (linfraModule.packageJSON.name === curLinfraModule.packageJSON.name) {
        return;
      }

      const depPackagesNames = Object.keys(curLinfraModule.packageJSON.dependencies);
      const indexOfPackage = _.findIndex(depPackagesNames, (depPackagesName) => {
        return depPackagesName === linfraModule.packageJSON.name;
      });

      if (indexOfPackage === -1) {
        return;
      }

      curLMNode.addChild(lmNode, `name`);
    });
  }

  /**
   * Removes tree node of current package from the list of tree nodes of packages.
   *
   * @mutable - change the list of node's children of selected package
   * @param  {Core.GraphModule.GraphNode<Interfaces.LinfraModule>} curGraphNode
   * @param  {Core.GraphModule.GraphNode<Interfaces.LinfraModule>} treeNodeList
   * @return {void}
   */
  private removeLMNodeFromListOfLMNodes (
    curLMNode: Core.GraphModule.GraphNode<Interfaces.LinfraModule>,
    lmNodes: Core.GraphModule.GraphNode<Interfaces.LinfraModule>[],
  ): void {
    _.forEach(lmNodes, (lmNode) => {
      if (lmNode === curLMNode) {
        return;
      }

      if (lmNode.hasChild(curLMNode) === false) {
        return;
      }

      lmNode.removeChild(curLMNode);
    });

    _.remove(lmNodes, curLMNode);
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
