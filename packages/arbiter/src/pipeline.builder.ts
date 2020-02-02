import * as NodeFS from 'fs';
import * as NodeOS from 'os';
import * as _ from 'lodash';
import * as Core from '@linfra/core';

import { Interfaces } from './shared';

import { Pipeline } from './pipeline';

const FSHelper = Core.Helpers.FSHelper;
const GraphModule = Core.GraphModule;

export class PipelineBuilder {
  private linfraModules: Interfaces.LinfraModule[];

  /**
   * Create instance of PipelineBuilder class.
   *
   * @return {PipelineBuilder}
   */
  static create (): PipelineBuilder {
    const inst = new PipelineBuilder();
    return inst;
  }

  constructor () {
    this.linfraModules = [];
  }

  /**
   * Create Linfra Pipeline for folder with packages.
   *
   * @param  {string} folderPath
   * @return {Pipeline}
   */
  buildPipeline (
  ): Pipeline {
    const linfraModules = this.linfraModules;

    const cdPath = this.findCircularDependency(linfraModules);
    if (!_.isNil(cdPath)) {
      throw new Error(`Folder has circular dependency (${cdPath})`);
    }

    const pipelineLevels = this.buildPipelineLevels(linfraModules);
    const lmNodes = this.buildListOfLMNodes(linfraModules);

    const pipeline = Pipeline.create();
    pipeline.setPipelineLevels(pipelineLevels);
    pipeline.setListOfLMNodes(lmNodes);
    return pipeline;
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
   * Finds circular dependency and returns path for it. If circular dependency not
   * found, method will return null.
   *
   * @param  {Interfaces.LinfraModule[]} packageJSONs
   * @return {sting|null}
   */
  private findCircularDependency (
    linfraModules: Interfaces.LinfraModule[],
  ): string|null {
    const lmNodes = this.buildListOfLMNodes(linfraModules);

    while (!_.isEmpty(lmNodes)) {
      const nodeWithoutDeps = _.find(lmNodes, (lmNode) => {
        const nodeHasChildren = lmNode.hasChildren();
        return nodeHasChildren === false;
      });

      if (_.isNil(nodeWithoutDeps)) {
        const cdPath = this.buildCircularDependencyPath(lmNodes);
        return cdPath;
      }

      this.removeLMNodeFromListOfLMNodes(
        nodeWithoutDeps,
        lmNodes,
      );
    }

    return null;
  }

  /**
   * Creates a path for circular dependency.
   *
   * @param  {Core.GraphModule.GraphNode<Interfaces.LinfraModule>[]} lmNodes
   * @return {string}
   */
  buildCircularDependencyPath (
    lmNodes: Core.GraphModule.GraphNode<Interfaces.LinfraModule>[],
  ): string {
    let curNode = lmNodes[0];
    const cdNodes = [ curNode ];

    do {
      curNode = curNode.children[0];
      cdNodes.push(curNode);
    } while (cdNodes[0] !== curNode);

    const cdPartsOfPath = _.map(cdNodes, (cdNode) => {
      const cdLinfraModule = cdNode.value;
      return cdLinfraModule.folderName;
    });

    return _.join(cdPartsOfPath, ' -> ');
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

    if (_.isNil(curLinfraModule.packageJSON.dependencies)) {
      return;
    }

    const depPackagesNames = Object.keys(curLinfraModule.packageJSON.dependencies);

    _.forEach(lmNodes, (lmNode) => {
      const linfraModule = lmNode.value;
      if (linfraModule.packageJSON.name === curLinfraModule.packageJSON.name) {
        return;
      }

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
    const isFolder = FSHelper.isDirectory(folderPath);
    if (!isFolder) {
      throw new Error(`Folder by path doesn't exist`);
    }

    const packages = FSHelper.getPathsOfFoldersByPath(folderPath);

    const linfraModules: Interfaces.LinfraModule[] = [];
    _.forEach(packages, (packageFolderPath) => {
      const pathToLinfraModuleInPackage = `${packageFolderPath}/package.json`;

      let packageJSONFile: string;
      try {
        packageJSONFile = NodeFS.readFileSync(pathToLinfraModuleInPackage, {
          encoding: `utf8`,
        });
      } catch (error) {
        const errorErrno = Math.abs(error.errno);
        if (errorErrno === NodeOS.constants.errno.ENOENT) {
          return;
        }

        console.error(`PipelineBuilder - getLinfraModules:`,
          `Unsupported error when method reads a file`, error);
      }

      try {
        const packageJSON: Interfaces.PackageJSON = JSON.parse(packageJSONFile);

        const absPathToFolder = FSHelper.convertToAbsolutePath(packageFolderPath);
        const folderName = FSHelper.getFileNameByPath(packageFolderPath);
        const linfraModule: Interfaces.LinfraModule = {
          folderName: folderName,
          pathToFolder: absPathToFolder,
          packageJSON: packageJSON,
        };
        linfraModules.push(linfraModule);
      } catch (error) {
        console.warn(`PipelineBuilder - getLinfraModules:`,
          `Package JSON file (${pathToLinfraModuleInPackage}) has an invalid JSON structure`);
        return null;
      }
    });
    return linfraModules;
  }

  /**
   * Adds all packages in folder to list of pipeline's modules.
   *
   * @param  {string} folderPath
   * @return {void}
   */
  addPackagesToPipeline (
    folderPath: string,
  ): void {
    const newLinfraModules = this.getLinfraModules(folderPath);
    this.linfraModules = _.unionWith(this.linfraModules, newLinfraModules, (m1, m2) => {
      return m1.packageJSON.name === m2.packageJSON.name;
    });
  }
}
