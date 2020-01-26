import * as _ from 'lodash';
import * as Chalk from 'chalk';

type Colors = 'cyan' | 'magenta' | 'blue' | 'yellow' | 'green' | 'red';

export class ConsoleColorManager {
  static colorList: Colors[] = [ 'cyan', 'magenta', 'blue', 'yellow', 'green', 'red' ];
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

  getColorFn (userColor?: Colors): Chalk.Chalk {
    if (!_.isNil(userColor)) {
      const userColorFn = (Chalk)[userColor];
      return userColorFn;
    }
    const managerColorName = ConsoleColorManager.colorList[this.curColorIndex];
    const managerColorFn = (Chalk)[managerColorName];
    return managerColorFn;
  }
}
