import * as NodeCP from 'child_process';
import * as LogTransformer from 'strong-log-transformer';

import * as Core from '@linfra/core';

import { Interfaces } from './shared';

export class Executor {

  /**
   * Create instance of Executor class.
   *
   * @return {Executor}
   */
  static create (
    colorManager: Core.Managers.ConsoleColorManager,
  ): Executor {
    const inst = new Executor(colorManager);
    return inst;
  }

  /**
   * Creates instance of color manager.
   *
   * @constructor
   */
  constructor (
    private colorManager: Core.Managers.ConsoleColorManager,
  ) {
  }

  /**
   * Executes command for Linfra Module.
   *
   * @param  {Interfaces.LinfraModule} linfraModule
   * @param  {string} command
   * @return {Promise<void>}
   */
  async executeCommand (
    linfraModule: Interfaces.LinfraModule,
    command: string,
  ): Promise<void> {
    console.debug(`Executor - executeCommandForPackage:`,
      `cd ${linfraModule.pathToFolder} && ${command}`);
    const cp = NodeCP.exec(`cd ${linfraModule.pathToFolder} && ${command}`);

    this.configLoggingForChildProcess(linfraModule, cp);

    await new Promise((resolve, reject) => {
      cp.on(`exit`, () => {
        resolve();
      });
    });
  }

  /**
   * Configs logging for child process.
   *
   * @param  {Interfaces.LinfraModule} linfraModule
   * @param  {NodeCP.ChildProcess} cp
   * @return {void}
   */
  private configLoggingForChildProcess (
    linfraModule: Interfaces.LinfraModule,
    cp: NodeCP.ChildProcess,
  ): void {
    const colorFn = this.colorManager.getColorFn();
    this.colorManager.nextColor();

    const stdoutOpts = {
      tag: `${colorFn.bold(linfraModule.packageJSON.name)}:`,
    };
    const stderrOpts = {
      tag: `${colorFn(linfraModule.packageJSON.name)}:`,
    };

    cp.stdout
      .pipe(LogTransformer(stdoutOpts))
      .pipe(process.stdout);
    cp.stderr
      .pipe(LogTransformer(stderrOpts))
      .pipe(process.stderr);
  }
}
