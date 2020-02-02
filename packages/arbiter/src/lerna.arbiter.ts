import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as FsExtra from 'fs-extra';

import * as Core from '@linfra/core';

import { Pipeline } from './pipeline';
import { Executor } from './executor';
import { DCConfigBuilder } from './dc-config.builder';
import { Interfaces, Constants } from './shared';

export class LernaArbiter {
  private pipeline: Pipeline;

  /**
   * Create instance of LernaArbiter class.
   *
   * @return {LernaArbiter}
   */
  static create (): LernaArbiter {
    const inst = new LernaArbiter();
    return inst;
  }

  /**
   * Creates instance of color manager.
   *
   * @constructor
   */
  constructor () {
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
   * Builds a `Deps`, a `Build` and a `Watch` Docker Compose Yaml files for
   * Linfra Module.
   *
   * @param   {Interfaces.LinfraConfig} config
   * @param   {Interfaces.LinfraModule} linfraModule
   * @returns {Promise<void>}
   */
  async buildDockerComposeFiles (
    config: Interfaces.LinfraConfig,
    linfraModule: Interfaces.LinfraModule,
  ): Promise<boolean> {
    const dcFilePath = `${linfraModule.pathToFolder}/${config.dockerConfig.dcFileName}`;
    const hasDCFile = await Core.Helpers.FSHelper.hasFile(dcFilePath);
    if (!hasDCFile) {
      console.debug(`LernaArbiter - buildDockerComposeFiles`,
        `Module '${linfraModule.folderName}' was skipped...`);
      return false;
    }

    const lmDeps = this.pipeline.getLMDependencies(linfraModule);

    const dcConfigBuilder = DCConfigBuilder.create();
    const dcBaseYaml = await dcConfigBuilder.openBaseConfigFile(dcFilePath);

    const dcDepsYaml = dcConfigBuilder.createDepsYaml(
      dcBaseYaml,
      lmDeps,
    );
    const dcDepsFilePath = `${linfraModule.pathToFolder}/${config.dockerConfig.dcDepsFileName}`;
    await dcConfigBuilder.saveYamlFile(dcDepsFilePath, dcDepsYaml);

    const dcBuildYaml = dcConfigBuilder.createCommandYaml(
      dcDepsYaml,
      config.commandConfig.buildCommand,
    );
    const dcBuildFilePath = `${linfraModule.pathToFolder}/${config.dockerConfig.dcBuildFileName}`;
    await dcConfigBuilder.saveYamlFile(dcBuildFilePath, dcBuildYaml);

    const dcWatchYaml = dcConfigBuilder.createCommandYaml(
      dcDepsYaml,
      config.commandConfig.watchCommand,
    );
    const dcWatchFilePath = `${linfraModule.pathToFolder}/${config.dockerConfig.dcWatchFileName}`;
    await dcConfigBuilder.saveYamlFile(dcWatchFilePath, dcWatchYaml);

    console.debug(`LernaArbiter - buildDockerComposeFiles`,
      `Docker Compose fiels for module '${linfraModule.folderName}' were created...`);
    return true;
  }
}
