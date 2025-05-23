import { filter } from "lodash";
import fs from "fs-extra";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { ensureAndCleanupPath } from "./utils";
import type { Config } from "./config";
import type { CompareOptions } from "./comparePdf";

export interface PdfDetails {
  filename: string;
  buffer: Buffer;
}

export interface CompareDetails {
  actualPdfFilename: string;
  baselinePdfFilename: string;
  actualPdfBuffer: Buffer;
  baselinePdfBuffer: Buffer;
  config: Config;
  opts: CompareOptions;
}

export interface ComparisonResult {
  status: "passed" | "failed";
  numDiffPixels?: number;
  diffPng?: string;
  actual?: string;
  error?: Error;
  message?: string;
  details?: ComparisonResult[];
}

export const comparePngs = async (
  actual: string,
  baseline: string,
  diff: string,
  config: CompareDetails["config"],
): Promise<ComparisonResult> => {
  return new Promise((resolve) => {
    try {
      const actualPng = PNG.sync.read(fs.readFileSync(actual));
      const baselinePng = PNG.sync.read(fs.readFileSync(baseline));
      const { width, height } = actualPng;
      const diffPng = new PNG({ width, height });

      const threshold = config.settings?.threshold ?? 0.05;
      const tolerance = config.settings?.tolerance ?? 0;

      const numDiffPixels = pixelmatch(
        actualPng.data,
        baselinePng.data,
        diffPng.data,
        width,
        height,
        {
          threshold,
        },
      );

      if (numDiffPixels > tolerance) {
        fs.writeFileSync(diff, PNG.sync.write(diffPng));
        resolve({ status: "failed", numDiffPixels, diffPng: diff });
      } else {
        resolve({ status: "passed" });
      }
    } catch (error) {
      resolve({ status: "failed", actual, error: error as Error });
    }
  });
};

export const comparePdfByImage = async ({
  actualPdfFilename,
  baselinePdfFilename,
  actualPdfBuffer,
  baselinePdfBuffer,
  config,
  opts,
}: CompareDetails): Promise<ComparisonResult> => {
  // biome-ignore lint/suspicious/noAsyncPromiseExecutor: <explanation>
  return new Promise(async (resolve) => {
    try {
      const imageEngine = await import(
        config.settings.imageEngine === "graphicsMagick"
          ? "./engines/graphicsMagick"
          : "./engines/native"
      );

      const actualPdfBaseName = path.parse(actualPdfFilename).name;
      const baselinePdfBaseName = path.parse(baselinePdfFilename).name;

      if (
        config.paths.actualPngRootFolder &&
        config.paths.baselinePngRootFolder &&
        config.paths.diffPngRootFolder
      ) {
        const actualPngDirPath = `${config.paths.actualPngRootFolder}/${actualPdfBaseName}`;
        const baselinePngDirPath = `${config.paths.baselinePngRootFolder}/${baselinePdfBaseName}`;
        const diffPngDirPath = `${config.paths.diffPngRootFolder}/${actualPdfBaseName}`;

        ensureAndCleanupPath(actualPngDirPath);
        ensureAndCleanupPath(baselinePngDirPath);
        ensureAndCleanupPath(diffPngDirPath);

        const actualPngFilePath = `${actualPngDirPath}/${actualPdfBaseName}.png`;
        const baselinePngFilePath = `${baselinePngDirPath}/${baselinePdfBaseName}.png`;

        const actualPdfDetails: PdfDetails = {
          filename: actualPdfFilename,
          buffer: actualPdfBuffer,
        };
        await imageEngine.pdfToPng(actualPdfDetails, actualPngFilePath, config);

        const baselinePdfDetails: PdfDetails = {
          filename: baselinePdfFilename,
          buffer: baselinePdfBuffer,
        };
        await imageEngine.pdfToPng(
          baselinePdfDetails,
          baselinePngFilePath,
          config,
        );

        const actualPngs = fs
          .readdirSync(actualPngDirPath)
          .filter((pngFile) =>
            path.parse(pngFile).name.startsWith(actualPdfBaseName),
          );
        const baselinePngs = fs
          .readdirSync(baselinePngDirPath)
          .filter((pngFile) =>
            path.parse(pngFile).name.startsWith(baselinePdfBaseName),
          );

        if (config.settings.matchPageCount === true) {
          if (actualPngs.length !== baselinePngs.length) {
            resolve({
              status: "failed",
              message: `Actual pdf page count (${actualPngs.length}) is not the same as Baseline pdf (${baselinePngs.length}).`,
            });
            return;
          }
        }

        const comparisonResults: ComparisonResult[] = [];
        for (let index = 0; index < baselinePngs.length; index++) {
          let suffix = "";
          if (baselinePngs.length > 1) {
            suffix = `-${index}`;
          }

          const actualPng =
            actualPngs.length > 1
              ? `${actualPngDirPath}/${actualPdfBaseName}${suffix}.png`
              : `${actualPngDirPath}/${actualPdfBaseName}.png`;
          const baselinePng = `${baselinePngDirPath}/${baselinePdfBaseName}${suffix}.png`;
          const diffPng = `${diffPngDirPath}/${actualPdfBaseName}_diff${suffix}.png`;

          if (
            opts.skipPageIndexes?.length &&
            opts.skipPageIndexes.includes(index)
          ) {
            continue;
          }

          if (
            opts.onlyPageIndexes?.length &&
            !opts.onlyPageIndexes.includes(index)
          ) {
            continue;
          }

          if (opts.masks) {
            const pageMasks = filter(opts.masks, { pageIndex: index });
            if (pageMasks?.length) {
              for (const pageMask of pageMasks) {
                await imageEngine.applyMask(
                  actualPng,
                  pageMask.coordinates,
                  pageMask.color,
                );
                await imageEngine.applyMask(
                  baselinePng,
                  pageMask.coordinates,
                  pageMask.color,
                );
              }
            }
          }

          if (opts.crops?.length) {
            const pageCroppings = filter(opts.crops, { pageIndex: index });
            if (pageCroppings?.length) {
              for (
                let cropIndex = 0;
                cropIndex < pageCroppings.length;
                cropIndex++
              ) {
                await imageEngine.applyCrop(
                  actualPng,
                  pageCroppings[cropIndex]?.coordinates,
                  cropIndex,
                );
                await imageEngine.applyCrop(
                  baselinePng,
                  pageCroppings[cropIndex]?.coordinates,
                  cropIndex,
                );
                comparisonResults.push(
                  await comparePngs(
                    actualPng.replace(".png", `-${cropIndex}.png`),
                    baselinePng.replace(".png", `-${cropIndex}.png`),
                    diffPng,
                    config,
                  ),
                );
              }
            }
          } else {
            comparisonResults.push(
              await comparePngs(actualPng, baselinePng, diffPng, config),
            );
          }
        }

        if (config.settings.cleanPngPaths) {
          ensureAndCleanupPath(config.paths.actualPngRootFolder);
          ensureAndCleanupPath(config.paths.baselinePngRootFolder);
        }

        const failedResults = filter(
          comparisonResults,
          (res) => res.status === "failed",
        );
        if (failedResults.length > 0) {
          resolve({
            status: "failed",
            message: `${actualPdfBaseName}.pdf is not the same as ${baselinePdfBaseName}.pdf compared by their images.`,
            details: failedResults,
          });
        } else {
          resolve({ status: "passed" });
        }
      } else {
        resolve({
          status: "failed",
          message:
            "PNG directory is not set. Please define correctly then try again.",
        });
      }
    } catch (error) {
      resolve({
        status: "failed",
        message: `An error occurred.\n${error}`,
      });
    }
  });
};
