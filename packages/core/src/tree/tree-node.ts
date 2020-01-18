import * as _ from 'lodash';

export class TreeNode<TNData = any> {
  private _parent!: TreeNode<TNData>;
  public get parent (): TreeNode<TNData> {
    return this._parent;
  }
  public set parent (parentNode: TreeNode<TNData>) {
    this._parent = parentNode;
  }

  private _children!: TreeNode<TNData>[];
  public get children (): TreeNode<TNData>[] {
    return [ ...this._children ];
  }

  private _value: TNData;
  public get value (): TNData {
    return this._value;
  }
  public set value (newValue: TNData) {
    this._value = newValue;
  }

  constructor (value: TNData) {
    this._value = value;
    this._children = [];
  }

  /**
   * Returns true if list of node's children isn't empty and else otherwise.
   *
   * @return {boolean}
   */
  hasChildren (): boolean {
    return !_.isEmpty(this._children);
  }

  /**
   * Add node to the list of node's children.
   *
   * @param  {TreeNode<TNData>} newChild
   * @param  {string|Symbol} [idFieldName] - name of field with id
   * @returns void
   */
  public addChild (
    newChild: TreeNode<TNData>,
    idFieldName?: string | symbol,
  ): void {

    if (!_.isNil(idFieldName)) {
      if (!_.isString(idFieldName) && !_.isSymbol(idFieldName)) {
        throw new Error(`Id feild name must be a string or a symbol`);
      }

      if (_.isString(idFieldName) && idFieldName === ``) {
        throw new Error(`String id feild name must be a non-empty string`);
      }
    }

    const newChildValue: any = newChild.value;
    if (!_.isNil(idFieldName) && !_.isObject(newChildValue)) {
      throw new Error(`Tree Node Data must be an object type`);
    }

    const oldChild = _.isNil(idFieldName)
      ? _.find(this._children, (child) => {
        return child === newChild;
      })
      : _.find(this._children, (child) => {
        const childData: any = child.value;
        return childData[idFieldName] === newChildValue[idFieldName];
      });

    if (!_.isNil(oldChild)) {
      return;
    }

    this._children.push(newChild);
  }

  /**
   * Remove node from the list of node's children.
   *
   * @param  {TreeNode<TNData>} childForRemoving
   * @param  {string|Symbol} [idFieldName] - name of field with id
   * @returns void
   */
  public removeChild (
    childForRemoving: TreeNode<TNData>,
    idFieldName?: string | symbol,
  ): void {

    if (!_.isNil(idFieldName)) {
      if (!_.isString(idFieldName) && !_.isSymbol(idFieldName)) {
        throw new Error(`Id feild name must be a string or a symbol`);
      }

      if (_.isString(idFieldName) && idFieldName === ``) {
        throw new Error(`String id feild name must be a non-empty string`);
      }
    }

    const newChildValue: any = childForRemoving.value;
    if (!_.isNil(idFieldName) && !_.isObject(newChildValue)) {
      throw new Error(`Tree Node Data must be an object type`);
    }

    if (_.isNil(idFieldName)) {
      _.remove(this._children, (child) => {
        return child === childForRemoving;
      });
      return;
    }

    _.remove(this._children, (child) => {
      const childData: any = child.value;
      return childData[idFieldName] === newChildValue[idFieldName];
    });
  }

  /**
   * Sets the list of node of children.
   *
   * @param  {TreeNode[]} children
   * @returns void
   */
  public setChildren (children: TreeNode<TNData>[]): void {
    this._children = [ ...children ];
  }
}
