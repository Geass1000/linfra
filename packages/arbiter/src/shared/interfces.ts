export interface PackageJSON {
  name: string;
  dependencies?: PackageJsonDep;
  devDependencies?: PackageJsonDep;
}

export interface PackageJsonDep {
  [depName: string]: string;
}

export interface LinfraModule {
  folderName: string;
  pathToFolder: string;
  packageJSON: PackageJSON;
}

export interface LinfraCommandConfig {
  // default: npm run dev:build
  buildCommand?: string;
  // default: npm run dev:watch
  watchCommand?: string;
}

export interface LinfraDockerConfig {
  // default: app
  imagePrefix?: string;
  // default: /app
  dockerWorkFolderName?: string;
  // default: docker-compose.yml
  dcFileName?: string;
  // default: docker-compose.deps.yml
  dcDepsFileName?: string;
  // default: docker-compose.build.yml
  dcBuildFileName?: string;
  // default: docker-compose.watch.yml
  dcWatchFileName?: string;
}

export interface LinfraConfig {
  // default: 1
  concurrency?: number;
  commandConfig?: LinfraCommandConfig;
  dockerConfig?: LinfraDockerConfig;
}

export interface DockerComposeService {
  image: string;
  networks?: string[];
  volumes?: string[];
  environment?: string[];
  command?: string;
}

export interface DockerComposeNetwork {
  external?: boolean;
}

export interface DockerComposeNetworks {
  [networkName: string]: DockerComposeNetwork;
}

export interface DockerComposeServices {
  [serviceName: string]: DockerComposeService;
}

export interface DockerCompose {
  version: string;
  networks: DockerComposeNetworks;
  services: DockerComposeServices;
}

export type DockerComposeServiceHandler = (service: DockerComposeService) => void;
