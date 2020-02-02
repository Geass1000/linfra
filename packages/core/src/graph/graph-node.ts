import * as _ from 'lodash';

export class GraphNode<GNData = any> {
  private _children!: GraphNode<GNData>[];
  public get children (): GraphNode<GNData>[] {
    return [ ...this._children ];
  }

  private _value: GNData;
  public get value (): GNData {
    return this._value;
  }
  public set value (newValue: GNData) {
    this._value = newValue;
  }

  constructor (value: GNData) {
    this._value = value;
    this._children = [];
  }

  /**
   * Returns true if list of node's children isn't empty and false otherwise.
   *
   * @return {boolean}
   */
  hasChildren (): boolean {
    return !_.isEmpty(this._children);
  }

  /**
   * Returns true if list of node's children has child and false otherwise.
   *
   * @return {boolean}
   */
  hasChild (
    childForSearch: GraphNode<GNData>,
    idFieldName?: string | symbol,
  ): boolean {
    this.checkSearchParams(childForSearch, idFieldName);

    const childForFindingValue: any = childForSearch.value;
    const oldChild = _.isNil(idFieldName)
      ? _.find(this._children, (child) => {
        return child === childForSearch;
      })
      : _.find(this._children, (child) => {
        const childData: any = child.value;
        const childDataField = _.get(childData, idFieldName);
        const childForFindingValueField = _.get(childForFindingValue, idFieldName);
        return childDataField === childForFindingValueField;
      });

    return !_.isNil(oldChild);
  }

  /**
   * Add node to the list of node's children.
   *
   * @param  {GraphNode<GNData>} newChild
   * @param  {string|Symbol} [idFieldName] - name of field with id
   * @returns void
   */
  public addChild (
    newChild: GraphNode<GNData>,
    idFieldName?: string | symbol,
  ): void {
    if (this.hasChild(newChild, idFieldName)) {
      return;
    }

    this._children.push(newChild);
  }

  /**
   * Remove node from the list of node's children.
   *
   * @param  {GraphNode<GNData>} childForRemoving
   * @param  {string|Symbol} [idFieldName] - name of field with id
   * @returns void
   */
  public removeChild (
    childForRemoving: GraphNode<GNData>,
    idFieldName?: string | symbol,
  ): void {
    this.checkSearchParams(childForRemoving, idFieldName);

    if (_.isNil(idFieldName)) {
      _.remove(this._children, (child) => {
        return child === childForRemoving;
      });
      return;
    }

    const childForRemovingValue: any = childForRemoving.value;
    _.remove(this._children, (child) => {
      const childData: any = child.value;
      return childData[idFieldName] === childForRemovingValue[idFieldName];
    });
  }

  /**
   * Sets the list of node of children.
   *
   * @param  {GraphNode[]} children
   * @returns void
   */
  public setChildren (children: GraphNode<GNData>[]): void {
    this._children = [ ...children ];
  }

  /**
   * Throws an error if search params are invalid.
   *
   * @param  {GraphNode<GNData>} child
   * @param  {string|Symbol} [idFieldName] - name of field with id
   * @return {void}
   */
  private checkSearchParams (
    child: GraphNode<GNData>,
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

    const childValue: any = child.value;
    if (!_.isNil(idFieldName) && !_.isObject(childValue)) {
      throw new Error(`Tree Node Data must be an object type`);
    }
  }
}
