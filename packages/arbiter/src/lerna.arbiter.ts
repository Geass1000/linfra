import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as NodeFs from 'fs';
import * as FsExtra from 'fs-extra';
import * as GlobParent from 'glob-parent';

import * as Core from '@linfra/core';

import { PipelineBuilder } from './pipeline.builder';
import { Pipeline } from './pipeline';
import { Executor } from './executor';
import { DCConfigBuilder } from './dc-config.builder';
import { Interfaces, Constants } from './shared';

export class LernaArbiter {
  private pipeline: Pipeline;
  private colorManager: Core.Managers.ConsoleColorManager;
  private executor: Executor;
  private pathsToLernaRepositories: string[];

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
   * Creates a common Pipeline from all packages of Lerna repositories.
   *
   * @param   {string[]} pathsToLernaRepositories
   * @returns {Promise<void>}
   */
  async setLernaRepositories (
    pathsToLernaRepositories: string[],
  ): Promise<void> {
    const absPathsToLernaRepositories = _.map(pathsToLernaRepositories, (repPath) => {
      const absRepPath = Core.Helpers.FSHelper.convertToAbsolutePath(repPath);
      return absRepPath;
    });

    this.pathsToLernaRepositories = absPathsToLernaRepositories;

    const pathsToFoldersWithPackagesByRepository = await Bluebird.map(absPathsToLernaRepositories, async (repPath) => {
      const absPathToLernaConfig = `${repPath}/lerna.json`;

      const hasLernaConfigFile = await Core.Helpers.FSHelper.hasFile(absPathToLernaConfig);
      if (!hasLernaConfigFile) {
        throw new Error(`Lerna config '${absPathToLernaConfig}' doesn't exist`);
      }

      const lernaConfigFile = await NodeFs.promises.readFile(absPathToLernaConfig);

      const lernaConfig = JSON.parse(lernaConfigFile.toString());

      const absPathsToFoldersWithPackages = _.map(lernaConfig.packages, (packagePath) => {
        const relPathToFolderWithPackages = GlobParent(packagePath);
        const absPathToFoldersWithPackages = `${repPath}/${relPathToFolderWithPackages}`;
        return absPathToFoldersWithPackages;
      });

      return absPathsToFoldersWithPackages;
    });

    const pathsToFoldersWithPackages = _.flatten(pathsToFoldersWithPackagesByRepository);

    const pipelineBuilder = PipelineBuilder.create();
    _.forEach(pathsToFoldersWithPackages, (pathToFoldersWithPackages) => {
      pipelineBuilder.addPackagesToPipeline(pathToFoldersWithPackages);
    });

    const pipeline = pipelineBuilder.buildPipeline();
    this.pipeline = pipeline;
  }

  /**
   * Creates instance of color manager.
   *
   * @constructor
   */
  constructor () {
    this.colorManager = Core.Managers.ConsoleColorManager.create();
    this.executor = Executor.create();
  }

  /**
   * Builds the all Linfra Modules.
   *
   * @param   {Interfaces.LinfraConfig} [userConfig]
   * @returns {Promise<void>}
   */
  async buildLinfraModules (
    userConfig?: Interfaces.LinfraConfig,
  ): Promise<void> {
    if (_.isNil(this.pipeline)) {
      throw new Error (`Pipeline is not installed to the arbiter`);
    }
    const logHeader = `LernaArbiter - buildModules:`;

    const config = this.buildConfig(userConfig);

    // Inits each Lerna repository using Lerna Bootstrap logic
    console.debug(logHeader, `Run Lerna Bootstrap commands in each lerna repository...`);
    await this.initAllLernaRepositories(config);

    // Run build sequence of Pipeline levels
    const pipelineIterator = this.pipeline.getIterator();
    for (pipelineIterator.start(); !pipelineIterator.isStopped(); pipelineIterator.next()) {
      const pipelineLevel = pipelineIterator.value;

      // Run build sequence of each Linfra Module in Pipeline level
      console.debug(logHeader, `Handle level ${pipelineIterator.index}`);
      await Bluebird.map(pipelineLevel, async (linfraModule) => {
        // Get colorizer function for each module
        const colorFn = this.colorManager.getColorFn();
        this.executor.setColorFn(colorFn);

        // Copy all Linfra Module dependencies to node_modules
        console.debug(logHeader, `Handle module ${colorFn.bold(linfraModule.folderName)}`);
        await this.copyDependencies(config, linfraModule);

        // Try to build docker image for Linfra Module
        await this.buildDockerImage(config, linfraModule);

        // Try to build docker-compose files for Linfra Module
        const dcFilesWasBuilt = await this.buildDockerComposeFiles(config, linfraModule);

        if (dcFilesWasBuilt) {
          // Run docker-compose build logic for Linfra Module
          await this.buildPackageUsingDockerCompose(config, linfraModule);
        } else {
          // Run npm build logic for Linfra Module
          await this.buildPackageUsingCommand(config, linfraModule);
        }

        this.colorManager.nextColor();
      }, { concurrency: config.concurrencyConfig.buildLevel });
    }

    // Remove copies of dependencies from node_modules in each Linfra Module
    for (pipelineIterator.restart(); !pipelineIterator.isStopped(); pipelineIterator.next()) {
      const pipelineLevel = pipelineIterator.value;

      console.debug(logHeader, `Handle level ${pipelineIterator.index}`);
      await Bluebird.map(pipelineLevel, async (linfraModule) => {
        const colorFn = this.colorManager.getColorFn();
        this.executor.setColorFn(colorFn);

        console.debug(logHeader, `Handle module ${colorFn.bold(linfraModule.folderName)}`);
        await this.removeDependencies(config, linfraModule);
        this.colorManager.nextColor();
      }, { concurrency: config.concurrencyConfig.restoreLevel });
    }

    // Resotre links to Linfra Modules using Lerna Bootstrap logic
    await this.initAllLernaRepositories(config);
  }

  async executeDockerStart (): Promise<void> {
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
    const userConcurrencyConfig = _.get(userConfig, 'concurrencyConfig');
    const concurrencyConfig: Interfaces.LinfraConcurrencyConfig = _.assign(
      {}, Constants.Default.LinfraConcurrencyConfig, userConcurrencyConfig,
    );

    const userDockerConfig = _.get(userConfig, 'dockerConfig');
    const dockerConfig: Interfaces.LinfraDockerConfig = _.assign(
      {}, Constants.Default.LinfraDockerConfig, userDockerConfig,
    );

    const userCommandConfig = _.get(userConfig, 'commandConfig');
    const commandConfig: Interfaces.LinfraCommandConfig = _.assign(
      {}, Constants.Default.LinfraCommandConfig, userCommandConfig,
    );

    const config: Interfaces.LinfraConfig = _.assign({
      concurrencyConfig: concurrencyConfig,
      commandConfig: commandConfig,
      dockerConfig: dockerConfig,
    });

    return config;
  }

  /**
   * Runs the `install` and the `lerna:bootstrap` npm commands in each Lerna repository.
   *
   * @param   {Interfaces.LinfraConfig} config
   * @returns {Promise<void>}
   */
  async initAllLernaRepositories (
    config: Interfaces.LinfraConfig,
  ): Promise<void> {
    const lernaBootstrapCommand = `npm install && npm run lerna:bootstrap`;

    await Bluebird.map(this.pathsToLernaRepositories, async (pathToLernaRepository) => {
      await this.executor.executeCommand(
        pathToLernaRepository,
        lernaBootstrapCommand,
      );
    }, { concurrency: config.concurrencyConfig.initPackages });
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
   * Removes all dependencies from `node_module` folder for Linfra Module.
   *
   * @param   {Interfaces.LinfraModule} linfraModule
   * @returns {Promise<void>}
   */
  async removeDependencies (
    config: Interfaces.LinfraConfig,
    linfraModule: Interfaces.LinfraModule,
  ): Promise<void> {
    const lmDeps = this.pipeline.getLMDependencies(linfraModule);
    await Bluebird.map(lmDeps, async (lmDep) => {
      const destLMDepPath = `${linfraModule.pathToFolder}/node_modules/${lmDep.packageJSON.name}`;
      console.debug(`LernaArbiter - removeDependencies`,
        `Remove '${lmDep.packageJSON.name}' dependency from '${linfraModule.packageJSON.name}'`);
      await FsExtra.remove(destLMDepPath);
      return;
    }, { concurrency: config.concurrencyConfig.removeDependencies });
  }

  /**
   * Copies all dependencies to `node_module` folder for Linfra Module.
   *
   * @param   {Interfaces.LinfraModule} linfraModule
   * @returns {Promise<void>}
   */
  async copyDependencies (
    config: Interfaces.LinfraConfig,
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
    }, { concurrency: config.concurrencyConfig.copyDependencies });
  }

  /**
   * Builds the docker image for Linfra Module.
   *
   * @param   {Interfaces.LinfraConfig} config
   * @param   {Interfaces.LinfraModule} linfraModule
   * @returns {Promise<void>}
   */
  async buildDockerImage (
    config: Interfaces.LinfraConfig,
    linfraModule: Interfaces.LinfraModule,
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

    await this.executor.executeCommand(
      linfraModule.pathToFolder,
      buildDockerImageCommand,
      linfraModule.packageJSON.name,
    );
  }

  /**
   * Builds the package using Docker Compose Build config for Linfra Module.
   *
   * @param   {Interfaces.LinfraConfig} config
   * @param   {Interfaces.LinfraModule} linfraModule
   * @returns {Promise<void>}
   */
  async buildPackageUsingDockerCompose (
    config: Interfaces.LinfraConfig,
    linfraModule: Interfaces.LinfraModule,
  ): Promise<void> {
    const dcFilePath = `${linfraModule.pathToFolder}/${config.dockerConfig.dcBuildFileName}`;
    const hasDCFile = await Core.Helpers.FSHelper.hasFile(dcFilePath);
    if (!hasDCFile) {
      console.debug(`LernaArbiter - buildPackageUsingDockerCompose`,
        `Module '${linfraModule.folderName}' was skipped...`);
      return;
    }

    const downBuildPackageCommand = `docker-compose -f ./docker-compose.build.yml down`;
    await this.executor.executeCommand(
      linfraModule.pathToFolder,
      downBuildPackageCommand,
      linfraModule.packageJSON.name,
    );

    const upBuildPackageCommand = `docker-compose -f ./docker-compose.build.yml up`;
    await this.executor.executeCommand(
      linfraModule.pathToFolder,
      upBuildPackageCommand,
      linfraModule.packageJSON.name,
    );

    await this.executor.executeCommand(
      linfraModule.pathToFolder,
      downBuildPackageCommand,
      linfraModule.packageJSON.name,
    );
  }

  /**
   * Starts watch logic for package using Docker Compose Watch config of Linfra Module.
   *
   * @param   {Interfaces.LinfraConfig} config
   * @param   {Interfaces.LinfraModule} linfraModule
   * @returns {Promise<void>}
   */
  async startWatchPackageUsingDockerCompose (
    config: Interfaces.LinfraConfig,
    linfraModule: Interfaces.LinfraModule,
  ): Promise<void> {
    const dcFilePath = `${linfraModule.pathToFolder}/${config.dockerConfig.dcWatchFileName}`;
    const hasDCFile = await Core.Helpers.FSHelper.hasFile(dcFilePath);
    if (!hasDCFile) {
      console.debug(`LernaArbiter - startWatchPackageUsingDockerCompose`,
        `Module '${linfraModule.folderName}' was skipped...`);
      return;
    }

    await this.stopWatchPackageUsingDockerCompose(config, linfraModule);

    const upBuildPackageCommand = `docker-compose -f ./docker-compose.watch.yml up -d`;
    await this.executor.executeCommand(
      linfraModule.pathToFolder,
      upBuildPackageCommand,
      linfraModule.packageJSON.name,
    );
  }

  /**
   * Stops watch logic for package using Docker Compose Watch config of Linfra Module.
   *
   * @param   {Interfaces.LinfraConfig} config
   * @param   {Interfaces.LinfraModule} linfraModule
   * @returns {Promise<void>}
   */
  async stopWatchPackageUsingDockerCompose (
    config: Interfaces.LinfraConfig,
    linfraModule: Interfaces.LinfraModule,
  ): Promise<void> {
    const dcFilePath = `${linfraModule.pathToFolder}/${config.dockerConfig.dcWatchFileName}`;
    const hasDCFile = await Core.Helpers.FSHelper.hasFile(dcFilePath);
    if (!hasDCFile) {
      console.debug(`LernaArbiter - stopWatchPackageUsingDockerCompose`,
        `Module '${linfraModule.folderName}' was skipped...`);
      return;
    }

    const downBuildPackageCommand = `docker-compose -f ./docker-compose.watch.yml down`;
    await this.executor.executeCommand(
      linfraModule.pathToFolder,
      downBuildPackageCommand,
      linfraModule.packageJSON.name,
    );
  }

  /**
   * Builds the package using Command config for Linfra Module.
   *
   * @param   {Interfaces.LinfraConfig} config
   * @param   {Interfaces.LinfraModule} linfraModule
   * @returns {Promise<void>}
   */
  async buildPackageUsingCommand (
    config: Interfaces.LinfraConfig,
    linfraModule: Interfaces.LinfraModule,
  ): Promise<void> {
    const buildPackageCommand = config.commandConfig.buildCommand;
    await this.executor.executeCommand(
      linfraModule.pathToFolder,
      buildPackageCommand,
      linfraModule.packageJSON.name,
    );
  }
}
