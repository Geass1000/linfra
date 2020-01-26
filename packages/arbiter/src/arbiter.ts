import * as NodeCP from 'child_process';
import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as LogTransformer from 'strong-log-transformer';

import * as Core from '@linfra/core';

import { Pipeline } from './pipeline';
import { Interfaces } from './shared';

export class Arbiter {
  private pipeline: Pipeline;
  private colorManager: Core.Managers.ConsoleColorManager;

  /**
   * Create instance of Arbiter class.
   *
   * @return {Arbiter}
   */
  static create (): Arbiter {
    const inst = new Arbiter();
    return inst;
  }

  /**
   * Creates instance of color manager.
   *
   * @constructor
   */
  constructor () {
    this.colorManager = Core.Managers.ConsoleColorManager.create();
  }

  /**
   * Sets pipeline.
   *
   * @param  {Pipeline} pipeline
   * @return {void}
   */
  setPipeline (pipeline: Pipeline): void {
    this.pipeline = pipeline;
  }

  /**
   * Executes command.
   *
   * @param  {string} command
   * @return {void}
   */
  async executeCommand (
    command: string,
  ): Promise<void> {
    if (_.isNil(this.pipeline)) {
      throw new Error (`Pipeline is not installed to the arbiter`);
    }

    const pipelineIterator = this.pipeline.getIterator();
    for (pipelineIterator.start(); !pipelineIterator.isStopped(); pipelineIterator.next()) {
      const pipelineLevel = pipelineIterator.value;

      console.debug(`Arbiter - executeCommand: Handle level ${pipelineIterator.index}`);
      await Bluebird.map(pipelineLevel, async (linfraModule) => {
        await this.executeCommandForLinfraModule(
          linfraModule,
          command,
        );
      });
    }
  }

  /**
   * Executes command for Linfra Module.
   *
   * @param  {Interfaces.LinfraModule} linfraModule
   * @param  {string} command
   * @return {Promise<void>}
   */
  private async executeCommandForLinfraModule (
    linfraModule: Interfaces.LinfraModule,
    command: string,
  ): Promise<void> {
    console.debug(`Arbiter - executeCommandForPackage:`, `cd ${linfraModule.pathToFolder} && ${command}`);
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
