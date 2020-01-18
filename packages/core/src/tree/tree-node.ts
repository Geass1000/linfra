import * as _ from 'lodash';

export class TreeNode<T = any> {
  private _parent!: TreeNode<T>;
  public get parent (): TreeNode<T> {
    return this._parent;
  }
  public set parent (parentNode: TreeNode<T>) {
    this._parent = parentNode;
  }

  private _children!: TreeNode<T>[];
  public get children (): TreeNode<T>[] {
    return [ ...this._children ];
  }

  private _value: T;
  public get value (): T {
    return this._value;
  }
  public set value (newValue: T) {
    this._value = newValue;
  }

  constructor (value: T) {
    this._value = value;
    this._children = [];
  }

  /**
   * Sets the list of node of children.
   *
   * @param  {TreeNode[]} children
   * @returns void
   */
  public setChildren (children: TreeNode<T>[]): void {
    this._children = [ ...children ];
  }

  /**
   * Sets the list of node of children.
   *
   * @param  {TreeNode[]} children
   * @returns void
   */
  public removeChild (childForRemoving: TreeNode<T>): void {
    this._children = _.reject(this._children, (child) => {
      return child === childForRemoving;
    });
  }
}
