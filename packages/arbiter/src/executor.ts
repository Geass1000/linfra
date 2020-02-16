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
   * @param  {string} pathToFolder
   * @param  {string} command
   * @param  {string} command
   * @return {Promise<void>}
   */
  async executeCommand (
    pathToFolder: string,
    command: string,
    userExecutorName?: string,
  ): Promise<void> {
    console.debug(`Executor - executeCommandForPackage:`,
      `cd ${pathToFolder} && ${command}`);
    const cp = NodeCP.exec(`cd ${pathToFolder} && ${command}`);

    const executorName = _.isString(userExecutorName) && userExecutorName !== ``
      ? userExecutorName : `Executor`;
    this.configLoggingForChildProcess(executorName, cp);

    await new Promise((resolve, reject) => {
      cp.on(`exit`, () => {
        resolve();
      });
    });
  }

  /**
   * Configs logging for child process.
   *
   * @param  {string} executorName
   * @param  {NodeCP.ChildProcess} cp
   * @return {void}
   */
  private configLoggingForChildProcess (
    executorName: string,
    cp: NodeCP.ChildProcess,
  ): void {
    const stdoutOpts = {
      tag: _.isNil(this.colorFn)
        ? executorName
        : `${this.colorFn.bold(executorName)}:`,
    };
    const stderrOpts = {
      tag: _.isNil(this.colorFn)
        ? executorName
        : `${this.colorFn(executorName)}:`,
    };

    cp.stdout
      .pipe(LogTransformer(stdoutOpts))
      .pipe(process.stdout);
    cp.stderr
      .pipe(LogTransformer(stderrOpts))
      .pipe(process.stderr);
  }
}
