import gm from "gm";
import path from "node:path";
import type { Coordinates } from "../comparePdf";

interface PdfDetails {
  buffer: Buffer;
  filename: string;
}

interface Config {
  settings: {
    density: number;
    quality: number;
  };
}

interface CropCoordinates {
  width: number;
  height: number;
  x: number;
  y: number;
}

// const imageMagick = gm.subClass({ imageMagick: true });
const imageMagick = gm.subClass({ imageMagick: "7+" });

export const pdfToPng = (
  pdfDetails: PdfDetails,
  pngFilePath: string,
  config: Config,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const pdfBuffer = pdfDetails.buffer;
    const pdfFilename = path.parse(pdfDetails.filename).name;

    imageMagick(pdfBuffer, pdfFilename)
      .command("convert")
      .density(config.settings.density, config.settings.density)
      .quality(config.settings.quality)
      .write(pngFilePath, (err) => {
        err ? reject(err) : resolve();
      });
  });
};

export const applyMask = (
  pngFilePath: string,
  coordinates: Coordinates = { x0: 0, y0: 0, x1: 0, y1: 0 },
  color = "black",
): Promise<void> => {
  return new Promise((resolve, reject) => {
    imageMagick(pngFilePath)
      .command("convert")
      .drawRectangle(
        coordinates.x0,
        coordinates.y0,
        coordinates.x1,
        coordinates.y1,
      )
      .fill(color)
      .write(pngFilePath, (err) => {
        err ? reject(err) : resolve();
      });
  });
};

export const applyCrop = (
  pngFilePath: string,
  coordinates: CropCoordinates = { width: 0, height: 0, x: 0, y: 0 },
  index = 0,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    imageMagick(pngFilePath)
      .command("convert")
      .crop(coordinates.width, coordinates.height, coordinates.x, coordinates.y)
      .write(pngFilePath.replace(".png", `-${index}.png`), (err) => {
        err ? reject(err) : resolve();
      });
  });
};
