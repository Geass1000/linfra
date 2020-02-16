import * as Interfaces from './interfces';

export namespace Default {
  export const LinfraDockerConfig: Interfaces.LinfraDockerConfig = {
    imagePrefix: 'app',
    dockerWorkFolderName: '/app',
    dcFileName: 'docker-compose.yml',
    dcDepsFileName: 'docker-compose.deps.yml',
    dcBuildFileName: 'docker-compose.build.yml',
    dcWatchFileName: 'docker-compose.watch.yml',
  };

  export const LinfraCommandConfig: Interfaces.LinfraCommandConfig = {
    buildCommand: 'npm run dev:build',
    watchCommand: 'npm run dev:watch',
  };

  export const LinfraConcurrencyConfig: Interfaces.LinfraConcurrencyConfig = {
    initPackages: 1,
    startLevel: 1,
    stopLevel: 1,
    buildLevel: 1,
    restoreLevel: 1,
    copyDependencies: 1,
    removeDependencies: 1,
  };

  export const LinfraBuildConfig: Interfaces.LinfraBuildConfig = {
    skipRestoreStep: false,
  };
}
