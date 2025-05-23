import fs from "fs-extra";

interface ConfigPaths {
  actualPdfRootFolder: string;
  baselinePdfRootFolder: string;
}

export interface Config {
  paths: ConfigPaths;
}

export const copyJsonObject = <T>(jsonObject: T): T => {
  return JSON.parse(JSON.stringify(jsonObject));
};

export const ensureAndCleanupPath = (filepath: string): void => {
  fs.ensureDirSync(filepath);
  fs.emptyDirSync(filepath);
};

export const ensurePathsExist = (config: Config): void => {
  fs.ensureDirSync(config.paths.actualPdfRootFolder);
  fs.ensureDirSync(config.paths.baselinePdfRootFolder);
};
