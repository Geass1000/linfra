export interface PackageJSON {
  name: string;
  dependencies: PackageJsonDep;
}

export interface PackageJsonDep {
  [depName: string]: string;
}

export interface LinfraModule {
  folderName: string;
  pathToFolder: string;
  packageJSON: PackageJSON;
}
