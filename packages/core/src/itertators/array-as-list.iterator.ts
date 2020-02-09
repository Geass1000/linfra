import * as _ from 'lodash';

export class ArrayAsListIterator <IData> {
  private prevIndex: number;
  private isStopedFlag: boolean;
  private els: IData[];

  private _index: number;
  public get index (): number {
    return this._index;
  }

  private _length: number;
  public get length (): number {
    return this._length;
  }

  public get value (): IData {
    return this.els[this.index];
  }

  constructor (
    els: IData[],
  ) {
    this.els = els;
    this._length = els.length;
  }

  /**
   * Starts the itertator.
   * If index is defined, it will be used.
   * If index isn't defined, iterator will use 0.
   *
   * @param  {number} [index=0]
   * @return {void}
   */
  start (index: number = 0): void {
    if (!_.isFinite(index)) {
      throw new Error (`Index must be a finite number`);
    }

    if (index < 0) {
      throw new Error (`Index must be more than 0`);
    }

    this._index = index;
    this.prevIndex = index;
    this.isStopedFlag = false;
  }

  /**
   * Stops the iterator.
   *
   * @return {void}
   */
  stop (): void {
    this.isStopedFlag = true;
  }

  /**
   * Returns `true` if iterator is stopped.
   *
   * @return {boolean}
   */
  isStopped (): boolean {
    return this.isStopedFlag || this._index >= this._length;
  }

  /**
   * Moves interator to the next element.
   *
   * @return {void}
   */
  next (): void {
    if (this.isStopped()) {
      return;
    }

    this._index++;
  }

  /**
   * Restarts the iterator.
   * If index is defined, it will be used.
   * If index isn't defined, itertator will use previous index.
   * If previous index isn't defined, iterator will use 0.
   *
   * @param  {number} [index]
   * @return {void}
   */
  restart (index?: number): void {
    if (_.isNil(index)) {
      this.start(this.prevIndex);
      return;
    }

    this.start(index);
  }
}
