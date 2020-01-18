import * as _ from 'lodash';

import { TreeNode } from '../tree-node';

export class BaseIterator<TND> {
  protected nodeStack: TreeNode<TND>[];

  protected isStopedFlag: boolean;

  protected _value: TreeNode<TND>;
  public get value (): TreeNode<TND> {
    return this._value;
  }

  constructor (
    protected root: TreeNode<TND>,
  ) {}

  start (): void {
    this.nodeStack = [ this.root ];
    this.isStopedFlag = false;
    this.next();
  }

  stop (): void {
    this.isStopedFlag = true;
  }

  isStoped (): boolean {
    return this.isStopedFlag;
  }

  next (): void {
  }

  reset (): void {
    this.start();
  }

  skipBranch (): void {
    if (_.isNil(this._value) || _.isEmpty(this._value.children)) {
      return;
    }
    this.nodeStack = _.difference(this.nodeStack, this._value.children);
  }
}
