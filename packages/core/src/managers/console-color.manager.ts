import * as _ from 'lodash';
import * as Chalk from 'chalk';

import { Interfaces } from './shared';

export class ConsoleColorManager {
  static colorList: Interfaces.ConsoleColorManager.Colors[] = [
    'cyan', 'magenta', 'blue', 'yellow', 'green', 'red',
  ];
  private curColorIndex: number;

  /**
   * Create instance of ConsoleColorManager class.
   *
   * @return {ConsoleColorManager}
   */
  static create (): ConsoleColorManager {
    const inst = new ConsoleColorManager();
    return inst;
  }

  constructor () {
    this.curColorIndex = 0;
  }

  nextColor (): void {
    const nextColorIndex = this.curColorIndex + 1;
    this.curColorIndex = nextColorIndex === ConsoleColorManager.colorList.length
      ? 0 : nextColorIndex;
  }

  prevColor (): void {
    this.curColorIndex = this.curColorIndex === 0
      ? ConsoleColorManager.colorList.length - 1
      : this.curColorIndex - 1;
  }

  getColorFn (
    userColor?: Interfaces.ConsoleColorManager.Colors,
  ): Interfaces.ConsoleColorManager.ColorFn {
    if (!_.isNil(userColor)) {
      const userColorFn = (Chalk)[userColor];
      return userColorFn;
    }
    const managerColorName = ConsoleColorManager.colorList[this.curColorIndex];
    const managerColorFn = (Chalk)[managerColorName];
    return managerColorFn;
  }
}
