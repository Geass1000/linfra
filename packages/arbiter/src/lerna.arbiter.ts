import * as _ from 'lodash';
import * as Bluebird from 'bluebird';

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
   * Builds a `Deps`, a `Build` and a `Watch` Docker Compose Yaml files where
   * packages were built by Docker Compose.
   *
   * @param   {Interfaces.LinfraLernaBuildDCFilesConfig} [userConfig]
   * @returns Promise<void>
   */
  async buildDockerComposeFiles (
    userConfig?: Interfaces.LinfraLernaBuildDCFilesConfig,
  ): Promise<void> {
    if (_.isNil(this.pipeline)) {
      throw new Error (`Pipeline is not installed to the arbiter`);
    }

    const logHeader = `LernaArbiter - buildDockerComposeFiles:`;

    const config: Interfaces.LinfraLernaBuildDCFilesConfig = _.assign(
      {}, Constants.Default.LinfraLernaBuildDCFilesConfig, userConfig,
    );

    const pipelineIterator = this.pipeline.getIterator();
    for (pipelineIterator.start(); !pipelineIterator.isStopped(); pipelineIterator.next()) {
      const pipelineLevel = pipelineIterator.value;

      console.debug(logHeader, `Handle level ${pipelineIterator.index}...`);
      await Bluebird.map(pipelineLevel, async (linfraModule) => {
        console.debug(logHeader, `Handle module '${linfraModule.folderName}'...`);
        const dcFilePath = `${linfraModule.pathToFolder}/${config.dcFileName}`;
        const hasDCFile = await Core.Helpers.FSHelper.hasFile(dcFilePath);
        if (!hasDCFile) {
          console.debug(logHeader, `Module '${linfraModule.folderName}' was skipped...`);
          return;
        }

        const lmDeps = this.pipeline.getLMDependencies(linfraModule);

        const dcConfigBuilder = DCConfigBuilder.create();
        const dcBaseYaml = await dcConfigBuilder.openBaseConfigFile(dcFilePath);

        const dcDepsYaml = dcConfigBuilder.createDepsYaml(
          dcBaseYaml,
          lmDeps,
          config.dockerWorkFolderName,
        );
        const dcDepsFilePath = `${linfraModule.pathToFolder}/${config.dcDepsFileName}`;
        await dcConfigBuilder.saveYamlFile(dcDepsFilePath, dcDepsYaml);

        const dcBuildYaml = dcConfigBuilder.createCommandYaml(
          dcDepsYaml,
          config.dcBuildCommand,
        );
        const dcBuildFilePath = `${linfraModule.pathToFolder}/${config.dcBuildFileName}`;
        await dcConfigBuilder.saveYamlFile(dcBuildFilePath, dcBuildYaml);

        const dcWatchYaml = dcConfigBuilder.createCommandYaml(
          dcDepsYaml,
          config.dcWatchCommand,
        );
        const dcWatchFilePath = `${linfraModule.pathToFolder}/${config.dcWatchFileName}`;
        await dcConfigBuilder.saveYamlFile(dcWatchFilePath, dcWatchYaml);
        console.debug(logHeader, `Docker Compose fiels for module '${linfraModule.folderName}' were created...`);
      }, { concurrency: config.concurrency });
    }
  }
}
