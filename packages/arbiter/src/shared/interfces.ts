
export interface PackageJSON {
  name: string;
  dependencies: PackageJsonDep;
}

export interface PackageJsonDep {
  [depName: string]: string;
}
