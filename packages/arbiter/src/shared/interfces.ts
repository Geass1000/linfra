
export interface PackageJSON {
  name: string;
  dependencies: PackageJsonDep;
  linfra?: LinfraMetadata;
  linfraDeps?: LinfraDependency[];
}

export interface PackageJsonDep {
  [depName: string]: string;
}

export interface LinfraMetadata {
  folderName: string;
  pathToFolder: string;
}

export interface LinfraDependency {
  name: string;
  linfra: LinfraMetadata;
}
