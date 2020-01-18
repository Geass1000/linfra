import * as _ from 'lodash';

import { TreeNode } from '../tree-node';
import { BaseIterator } from './base.iterator';

export class PostorderIterator <TND> extends BaseIterator<TND> {
  private output: TreeNode<TND>[];

  start (): void {
    this.output = [];
    super.start();
  }

  next (): void {
    if (_.isEmpty(this.nodeStack) && _.isEmpty(this.output)) {
      this.isStopedFlag = true;
      return;
    }

    while (!_.isEmpty(this.nodeStack)) {
      const node = this.nodeStack.pop();

      if (_.isEmpty(node.children)) {
        this._value = node;
        return;
      }

      this.output.push(node);

      for (let i = node.children.length - 1; i >= 0; i--) {
        this.nodeStack.push(node.children[i]);
      }
    }

    this._value = this.output.pop();
  }
}
