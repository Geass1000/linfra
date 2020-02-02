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
   * Combines user and default configurations.
   *
   * @param   {Interfaces.LinfraConfig} userConfig
   * @returns {Interfaces.LinfraConfig}
   */
  buildConfig (
    userConfig: Interfaces.LinfraConfig,
  ): Interfaces.LinfraConfig {
    const userDockerConfig = _.get(userConfig, 'dockerConfig');
    const dockerConfig: Interfaces.LinfraDockerConfig = _.assign(
      {}, Constants.Default.LinfraDockerConfig, userDockerConfig,
    );

    const userCommandConfig = _.get(userConfig, 'commandConfig');
    const commandConfig: Interfaces.LinfraCommandConfig = _.assign(
      {}, Constants.Default.LinfraCommandConfig, userCommandConfig,
    );

    const config: Interfaces.LinfraConfig = _.assign({
      concurrency: 1,
      commandConfig: commandConfig,
      dockerConfig: dockerConfig,
    });

    return config;
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

  /**
   * Copies all dependencies to `node_module` folder for Linfra Module.
   *
   * @param   {Interfaces.LinfraModule} linfraModule
   * @returns {Promise<void>}
   */
  async copyDependencies (
    linfraModule: Interfaces.LinfraModule,
  ): Promise<void> {
    const lmDeps = this.pipeline.getLMDependencies(linfraModule);
    await Bluebird.map(lmDeps, async (lmDep) => {
      const lmDepPath = lmDep.pathToFolder;
      const destLMDepPath = `${linfraModule.pathToFolder}/node_modules/${lmDep.packageJSON.name}`;
      console.debug(`LernaArbiter - copyDependencies`,
        `Copy dependency from '${lmDepPath}' to '${destLMDepPath}'`);
      await FsExtra.remove(destLMDepPath);
      await FsExtra.copy(lmDepPath, destLMDepPath);
      return;
    });
  }

  /**
   * Builds the docker image for Linfra Module.
   *
   * @param   {Interfaces.LinfraConfig} config
   * @param   {Interfaces.LinfraModule} linfraModule
   * @param   {Executor} executor
   * @returns {Promise<void>}
   */
  async buildDockerImage (
    config: Interfaces.LinfraConfig,
    linfraModule: Interfaces.LinfraModule,
    executor: Executor,
  ): Promise<void> {
    const dockerFilePath = `${linfraModule.pathToFolder}/Dockerfile`;
    const hasDockerFile = await Core.Helpers.FSHelper.hasFile(dockerFilePath);
    if (!hasDockerFile) {
      console.debug(`LernaArbiter - buildDockerImage`,
        `Module '${linfraModule.folderName}' was skipped...`);
      return;
    }

    const tagOfDockerImage = `${config.dockerConfig.imagePrefix}.${linfraModule.folderName}:latest`;
    const getDockerImageNameCommand = `docker images --format '{{.Repository}}:{{.Tag}}'`
      + `| grep '${tagOfDockerImage}'`;
    const buildDockerImageCommand = `(docker rmi $(${getDockerImageNameCommand}) --force || true) `
      + `&& docker build . --tag=${tagOfDockerImage} || true`;

    await executor.executeCommand(
      linfraModule,
      buildDockerImageCommand,
    );
  }

  /**
   * Builds the package using Docker Compose Build config for Linfra Module.
   *
   * @param   {Interfaces.LinfraConfig} config
   * @param   {Interfaces.LinfraModule} linfraModule
   * @param   {Executor} executor
   * @returns {Promise<void>}
   */
  async buildPackageUsingDockerCompose (
    config: Interfaces.LinfraConfig,
    linfraModule: Interfaces.LinfraModule,
    executor: Executor,
  ): Promise<void> {
    const dcFilePath = `${linfraModule.pathToFolder}/${config.dockerConfig.dcBuildFileName}`;
    const hasDCFile = await Core.Helpers.FSHelper.hasFile(dcFilePath);
    if (!hasDCFile) {
      console.debug(`LernaArbiter - buildPackage`,
        `Module '${linfraModule.folderName}' was skipped...`);
      return;
    }

    const downBuildPackageCommand = `docker-compose -f ./docker-compose.build.yml down`;
    await executor.executeCommand(
      linfraModule,
      downBuildPackageCommand,
    );

    const upBuildPackageCommand = `docker-compose -f ./docker-compose.build.yml up`;
    await executor.executeCommand(
      linfraModule,
      upBuildPackageCommand,
    );

    await executor.executeCommand(
      linfraModule,
      downBuildPackageCommand,
    );
  }

  /**
   * Builds the package using Command config for Linfra Module.
   *
   * @param   {Interfaces.LinfraConfig} config
   * @param   {Interfaces.LinfraModule} linfraModule
   * @param   {Executor} executor
   * @returns {Promise<void>}
   */
  async buildPackageUsingCommand (
    config: Interfaces.LinfraConfig,
    linfraModule: Interfaces.LinfraModule,
    executor: Executor,
  ): Promise<void> {
    const buildPackageCommand = config.commandConfig.buildCommand;
    await executor.executeCommand(
      linfraModule,
      buildPackageCommand,
    );
  }
}
