import * as NodeFs from 'fs';
import * as JsYaml from 'js-yaml';
import * as _ from 'lodash';

import { Interfaces } from './shared';

/**
 * Provides some methods to work with Docker Compose Yaml files.
 *
 * @class
 */
export class DCConfigBuilder {

  /**
   * Create instance of DCConfigBuilder class.
   *
   * @return {PipelineBuilder}
   */
  static create (): DCConfigBuilder {
    const inst = new DCConfigBuilder();
    return inst;
  }

  /**
   * Opens a Docker Compose Yaml and returns it.
   *
   * @param   {string} path
   * @returns {Promise<Interfaces.DockerCompose>}
   */
  async openBaseConfigFile (
    path: string,
  ): Promise<Interfaces.DockerCompose> {
    const dcFile = await NodeFs.promises.readFile(path);
    const dcYaml = JsYaml.safeLoad(dcFile.toString());
    return dcYaml;
  }

  /**
   * Create a new Docker Compose Yaml and adds to it a new voluems with dependencies.
   *
   * @param   {Interfaces.DockerCompose} dcYaml
   * @param   {Interfaces.LinfraModule[]} lmDeps
   * @param   {string} dockerWorkFolderName
   * @returns {Interfaces.DockerCompose}
   */
  createDepsYaml (
    dcYaml: Interfaces.DockerCompose,
    lmDeps: Interfaces.LinfraModule[],
  ): Interfaces.DockerCompose {
    const depsVolumes = _.map(lmDeps, (lmDep) => {
      const pathToFile = `${lmDep.pathToFolder}:/${lmDep.folderName}`;
      return pathToFile;
    });

    const depsYaml = this.updateService(dcYaml, (service) => {
      service.volumes = _.isArray(service.volumes)
        ? _.concat(service.volumes, depsVolumes)
        : depsVolumes;
      delete service.command;
    });

    return depsYaml;
  }

  /**
   * Create a new Docker Compose Yaml with a new command.
   *
   * @param   {Interfaces.DockerCompose} dcYaml
   * @param   {string} dcCommand
   * @returns {Interfaces.DockerCompose}
   */
  createCommandYaml (
    dcYaml: Interfaces.DockerCompose,
    dcCommand: string,
  ): Interfaces.DockerCompose {
    const commandYaml = this.updateService(dcYaml, (service) => {
      service.command = dcCommand;
    });

    return commandYaml;
  }

  /**
   * Saves a Docker Compose Yaml object to file.
   *
   * @param   {string} path
   * @param   {Interfaces.DockerCompose} dcYaml
   * @returns {Promise<void>}
   */
  async saveYamlFile (
    path: string,
    dcYaml: Interfaces.DockerCompose,
  ): Promise<void> {
    const dcYamlFile = JsYaml.safeDump(dcYaml);
    await NodeFs.promises.writeFile(path, dcYamlFile);
  }

  /**
   * Calls the callback function for each sevice in Docker Compose config.
   *
   * @param   {Interfaces.DockerCompose} baseDCYaml
   * @param   {Interfaces.DockerComposeServiceHandler} callback
   * @returns {Interfaces.DockerCompose}
   */
  updateService (
    baseDCYaml: Interfaces.DockerCompose,
    callback: Interfaces.DockerComposeServiceHandler,
  ): Interfaces.DockerCompose {
    const dcYaml = _.cloneDeep(baseDCYaml);

    for (const key in dcYaml.services) {
      if (!Object.prototype.hasOwnProperty.call(dcYaml.services, key)) {
        return;
      }

      callback(dcYaml.services[key]);
    }

    return dcYaml;
  }
}
