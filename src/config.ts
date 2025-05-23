import path from "node:path";

interface ConfigPaths {
  actualPdfRootFolder: string;
  baselinePdfRootFolder: string;
  actualPngRootFolder: string;
  baselinePngRootFolder: string;
  diffPngRootFolder: string;
}

interface ConfigSettings {
  imageEngine: "graphicsMagick" | "native";
  density: number;
  quality: number;
  tolerance: number;
  threshold: number;
  cleanPngPaths: boolean;
  matchPageCount: boolean;
  disableFontFace: boolean;
  verbosity: number;
}

export interface Config {
  paths: ConfigPaths;
  settings: ConfigSettings;
}

const config = {
  paths: {
    actualPdfRootFolder: path.resolve(process.cwd(), "data/actualPdfs"),
    baselinePdfRootFolder: path.join(process.cwd(), "data/baselinePdfs"),
    actualPngRootFolder: path.join(process.cwd(), "data/actualPngs"),
    baselinePngRootFolder: path.join(process.cwd(), "data/baselinePngs"),
    diffPngRootFolder: path.join(process.cwd(), "data/diffPngs"),
  },
  settings: {
    imageEngine: "graphicsMagick" as const,
    density: 100,
    quality: 70,
    tolerance: 0,
    threshold: 0.05,
    cleanPngPaths: false,
    matchPageCount: true,
    disableFontFace: true,
    verbosity: 0,
  },
} as const satisfies Config;

export default config;
