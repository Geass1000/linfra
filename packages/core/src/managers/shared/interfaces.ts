import * as Chalk from 'chalk';

export namespace ConsoleColorManager {
  export type Colors = 'cyan' | 'magenta' | 'blue' | 'yellow' | 'green' | 'red';

  export type ColorFn = Chalk.Chalk;
}
