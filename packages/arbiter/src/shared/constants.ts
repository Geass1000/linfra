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
}
