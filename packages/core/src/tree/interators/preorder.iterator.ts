import * as _ from 'lodash';

import { BaseIterator } from './base.iterator';

export class PreorderIterator<TND> extends BaseIterator<TND> {

  next (): void {
    if (_.isEmpty(this.nodeStack)) {
      this.isStopedFlag = true;
      return;
    }

    const node = this.nodeStack.pop();
    this._value = node;

    for (let i = node.children.length - 1; i >= 0; i--) {
      this.nodeStack.push(node.children[i]);
    }
  }
}
