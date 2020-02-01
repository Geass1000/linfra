import * as Interfaces from './interfces';

export namespace Default {
  export const LinfraLernaBuildDCFilesConfig = {
    dockerWorkFolderName: '/app',
    dcFileName: 'docker-compose.yml',
    dcDepsFileName: 'docker-compose.deps.yml',
    dcBuildFileName: 'docker-compose.build.yml',
    dcBuildCommand: 'npm run dev:build',
    dcWatchFileName: 'docker-compose.watch.yml',
    dcWatchCommand: 'npm run dev:watch',
    concurrency: 1,
  } as Interfaces.LinfraLernaBuildDCFilesConfig;
}
