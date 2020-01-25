import * as _ from 'lodash';
import * as Core from '@linfra/core';

import { Interfaces } from './shared';

/**
 * Linfra Pipeline.
 * Stores levels of dependencies of packages. Each package at the same level can be
 * built concurrently. Each level can't be built until the previous levels weren't built.
 */
export class Pipeline {
  private pipelineLevels: Interfaces.LinfraModule[][];
  private lmNodes: Core.GraphModule.GraphNode<Interfaces.LinfraModule>[];

  /**
   * Create instance of Pipeline class.
   *
   * @return {Pipeline}
   */
  static create (): Pipeline {
    const inst = new Pipeline();
    return inst;
  }

  constructor () {
    this.pipelineLevels = [];
    this.lmNodes = [];
  }

  /**
   * Returns iterator of Linfra Pipeline.
   *
   * @return {Core.Itertators.ArrayAsListIterator<Interfaces.LinfraModule[]>}
   */
  getIterator (
  ): Core.Itertators.ArrayAsListIterator<Interfaces.LinfraModule[]> {
    return new Core.Itertators
      .ArrayAsListIterator<Interfaces.LinfraModule[]>(this.pipelineLevels);
  }

  /**
   * Sets the list of Linfra Pipeline Levels
   *
   * @param  {Interfaces.LinfraModule[][]} pipelineLevels
   */
  setPipelineLevels (
    pipelineLevels: Interfaces.LinfraModule[][],
  ): void {
    this.pipelineLevels = pipelineLevels;
  }

  /**
   * Sets the list of Linfra Module Nodes
   *
   * @param  {Core.GraphModule.GraphNode<Interfaces.LinfraModule>[]} lmNodes
   */
  setListOfLMNodes (
    lmNodes: Core.GraphModule.GraphNode<Interfaces.LinfraModule>[],
  ): void {
    this.lmNodes = lmNodes;
  }

  /**
   * Returns list of dependencies for Linfra Module.
   *
   * @param  {Interfaces.LinfraModule} curLinfraModule
   * @return {Interfaces.LinfraModule[]}
   */
  getLMDependencies (
    curLinfraModule: Interfaces.LinfraModule,
  ): Interfaces.LinfraModule[] {
    const curLMNode = _.find(this.lmNodes, (lmNode) => {
      const linfraModule = lmNode.value;
      return linfraModule.packageJSON.name === curLinfraModule.packageJSON.name;
    });

    if (_.isNil(curLMNode)) {
      throw new Error (`Unknown Linfra Module`);
    }

    const curLinfraDeps = _.map(curLMNode.children, (lmNode) => {
      return lmNode.value;
    });

    return curLinfraDeps;
  }
}
