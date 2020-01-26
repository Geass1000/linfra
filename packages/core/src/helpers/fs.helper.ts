import { readdirSync, statSync } from 'fs';
import * as NodePath from 'path';

export class FSHelper {
  static convertToAbsolutePath (path: string): string {
    return NodePath.resolve(path);
  }

  static isDirectory (path: string): boolean {
    try {
      return statSync(path).isDirectory();
    } catch (error) {
      console.warn(`FSHelper - isDirectory:`, `Unknown type of file (${path})`, error);
      return false;
    }
  }

  static isFile (path: string): boolean {
    try {
      return statSync(path).isFile();
    } catch (error) {
      console.warn(`FSHelper - isFile:`, `Unknown type of file (${path})`, error);
      return false;
    }
  }

  static getFileNameByPath (path: string): string {
    const matchFileName = path.match(/([^\/]*)\/*$/);
    const fileName = Array.isArray(matchFileName)
      ? matchFileName[1]
      : '';
    return fileName;
  }

  static getNamesOfFoldersByPath (dir: string): string[] {
    return readdirSync(dir).filter((file) => {
      const filePath = NodePath.join(dir, file);
      return FSHelper.isDirectory(filePath);
    });
  }

  static getPathsOfFoldersByPath (base: string): string[] {
    return FSHelper.getNamesOfFoldersByPath(base).map((path) => {
      const folderPath = `${base}/${path}`;
      return folderPath;
    });
  }

  static getNamesOfFilesByPath (dir: string): string[] {
    return readdirSync(dir).filter((file) => {
      const filePath = NodePath.join(dir, file);
      return FSHelper.isFile(filePath);
    });
  }

  static getPathsOfFilesByPath (base: string): string[] {
    return FSHelper.getNamesOfFilesByPath(base).map((path) => {
      const filePath = `${base}/${path}`;
      return filePath;
    });
  }

  static getNamesOfAllByPath (dir: string): string[] {
    return readdirSync(dir).filter((file) => {
      const filePath = NodePath.join(dir, file);
      return FSHelper.isFile(filePath) || FSHelper.isDirectory(filePath);
    });
  }

  static getPathsOfAllByPath (base: string): string[] {
    return FSHelper.getNamesOfAllByPath(base).map((path) => {
      const filePath = `${base}/${path}`;
      return filePath;
    });
  }
}
