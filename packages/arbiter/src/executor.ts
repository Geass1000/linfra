import * as NodeCP from 'child_process';
import * as _ from 'lodash';
import * as LogTransformer from 'strong-log-transformer';

import * as Core from '@linfra/core';

import { Interfaces } from './shared';

export class Executor {
  private colorFn: Core.Managers.Interfaces.ConsoleColorManager.ColorFn;

  /**
   * Create instance of Executor class.
   *
   * @return {Executor}
   */
  static create (
  ): Executor {
    const inst = new Executor();
    return inst;
  }

  setColorFn (
    colorFn: Core.Managers.Interfaces.ConsoleColorManager.ColorFn,
  ): void {
    this.colorFn = colorFn;
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
    const stdoutOpts = {
      tag: _.isNil(this.colorFn)
        ? linfraModule.packageJSON.name
        : `${this.colorFn.bold(linfraModule.packageJSON.name)}:`,
    };
    const stderrOpts = {
      tag: _.isNil(this.colorFn)
        ? linfraModule.packageJSON.name
        : `${this.colorFn(linfraModule.packageJSON.name)}:`,
    };

    cp.stdout
      .pipe(LogTransformer(stdoutOpts))
      .pipe(process.stdout);
    cp.stderr
      .pipe(LogTransformer(stderrOpts))
      .pipe(process.stderr);
  }
}
