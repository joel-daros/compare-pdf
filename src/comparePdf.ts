import fs from "fs-extra";
import path from "node:path";
import { copyJsonObject, ensurePathsExist } from "./utils";
import { comparePdfByBase64 } from "./compareData";
import { comparePdfByImage, type CompareDetails } from "./compareImages";
import defaultConfig, { type ComparePdfConfig } from "./config";

export interface Coordinates {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface PageMask {
  pageIndex: number;
  coordinates: Coordinates;
  color?: string;
}

export interface Dimension {
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface PageCrop {
  pageIndex: number;
  coordinates: Dimension;
}

export interface ComparePdfOptions {
  masks: PageMask[];
  crops: PageCrop[];
  onlyPageIndexes: number[];
  skipPageIndexes: number[];
}

export interface Details {
  status: string;
  numDiffPixels: string;
  diffPng: string;
}

export interface Results {
  status: string;
  message: string;
  details?: Details[];
}

export interface CompareResult {
  status: "not executed" | "failed" | "passed";
  message?: string;
  details?: Array<{
    status: string;
    numDiffPixels?: number;
    diffPng?: string;
    actual?: string;
    error?: Error;
  }>;
}

export type ComparisonType = "byBase64" | "byImage";

export class ComparePdf {
  private config: ComparePdfConfig;
  private opts: ComparePdfOptions;
  private result: CompareResult;
  private baselinePdfBufferData?: Buffer;
  private actualPdfBufferData?: Buffer;
  private baselinePdf?: string;
  private actualPdf?: string;

  constructor(config: ComparePdfConfig = copyJsonObject(defaultConfig)) {
    this.config = config;
    ensurePathsExist(this.config);

    this.opts = {
      masks: [],
      crops: [],
      onlyPageIndexes: [],
      skipPageIndexes: [],
    };

    this.result = {
      status: "not executed",
    };
  }

  baselinePdfBuffer(
    baselinePdfBuffer: Buffer,
    baselinePdfFilename?: string,
  ): this {
    if (baselinePdfBuffer) {
      this.baselinePdfBufferData = baselinePdfBuffer;
      if (baselinePdfFilename) {
        this.baselinePdf = baselinePdfFilename;
      }
    } else {
      this.result = {
        status: "failed",
        message:
          "Baseline pdf buffer is invalid or filename is missing. Please define correctly then try again.",
      };
    }
    return this;
  }

  baselinePdfFile(baselinePdf: string): this {
    if (baselinePdf) {
      const baselinePdfBaseName = path.parse(baselinePdf).name;
      if (fs.existsSync(baselinePdf)) {
        this.baselinePdf = baselinePdf;
      } else if (
        fs.existsSync(
          `${this.config.paths.baselinePdfRootFolder}/${baselinePdfBaseName}.pdf`,
        )
      ) {
        this.baselinePdf = `${this.config.paths.baselinePdfRootFolder}/${baselinePdfBaseName}.pdf`;
      } else {
        this.result = {
          status: "failed",
          message:
            "Baseline pdf file path does not exists. Please define correctly then try again.",
        };
      }
    } else {
      this.result = {
        status: "failed",
        message:
          "Baseline pdf file path was not set. Please define correctly then try again.",
      };
    }
    return this;
  }

  actualPdfBuffer(actualPdfBuffer: Buffer, actualPdfFilename?: string): this {
    if (actualPdfBuffer) {
      this.actualPdfBufferData = actualPdfBuffer;
      if (actualPdfFilename) {
        this.actualPdf = actualPdfFilename;
      }
    } else {
      this.result = {
        status: "failed",
        message:
          "Actual pdf buffer is invalid or filename is missing. Please define correctly then try again.",
      };
    }
    return this;
  }

  actualPdfFile(actualPdf: string): this {
    if (actualPdf) {
      const actualPdfBaseName = path.parse(actualPdf).name;
      if (fs.existsSync(actualPdf)) {
        this.actualPdf = actualPdf;
      } else if (
        fs.existsSync(
          `${this.config.paths.actualPdfRootFolder}/${actualPdfBaseName}.pdf`,
        )
      ) {
        this.actualPdf = `${this.config.paths.actualPdfRootFolder}/${actualPdfBaseName}.pdf`;
      } else {
        this.result = {
          status: "failed",
          message:
            "Actual pdf file path does not exists. Please define correctly then try again.",
        };
      }
    } else {
      this.result = {
        status: "failed",
        message:
          "Actual pdf file path was not set. Please define correctly then try again.",
      };
    }
    return this;
  }

  addMask(
    pageIndex: number,
    coordinates = { x0: 0, y0: 0, x1: 0, y1: 0 },
    color = "black",
  ): this {
    this.opts.masks.push({
      pageIndex,
      coordinates,
      color,
    });
    return this;
  }

  addMasks(masks: ComparePdfOptions["masks"]): this {
    this.opts.masks = [...this.opts.masks, ...masks];
    return this;
  }

  onlyPageIndexes(pageIndexes: number[]): this {
    this.opts.onlyPageIndexes = [...this.opts.onlyPageIndexes, ...pageIndexes];
    return this;
  }

  skipPageIndexes(pageIndexes: number[]): this {
    this.opts.skipPageIndexes = [...this.opts.skipPageIndexes, ...pageIndexes];
    return this;
  }

  cropPage(
    pageIndex: number,
    coordinates = { width: 0, height: 0, x: 0, y: 0 },
  ): this {
    this.opts.crops.push({
      pageIndex,
      coordinates,
    });
    return this;
  }

  cropPages(cropPagesList: ComparePdfOptions["crops"]): this {
    this.opts.crops = [...this.opts.crops, ...cropPagesList];
    return this;
  }

  async compare(
    comparisonType: ComparisonType = "byImage",
  ): Promise<CompareResult> {
    if (
      this.result.status === "not executed" ||
      this.result.status !== "failed"
    ) {
      if (!this.actualPdf || !this.baselinePdf) {
        throw new Error("PDF files not properly initialized");
      }

      const compareDetails = {
        actualPdfFilename: this.actualPdf,
        baselinePdfFilename: this.baselinePdf,
        actualPdfBuffer:
          this.actualPdfBufferData ?? fs.readFileSync(this.actualPdf),
        baselinePdfBuffer:
          this.baselinePdfBufferData ?? fs.readFileSync(this.baselinePdf),
        config: this.config,
        opts: this.opts,
      } satisfies CompareDetails;

      switch (comparisonType) {
        case "byBase64":
          this.result = await comparePdfByBase64(compareDetails);
          break;
        default:
          this.result = await comparePdfByImage(compareDetails);
          break;
      }
    }
    return this.result;
  }
}

export default ComparePdf;
