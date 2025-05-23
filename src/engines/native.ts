// For Node.js only pdf-js legacy is supported
import {
  getDocument,
  type PDFDocumentProxy,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import fs from "fs-extra";
import {
  type Canvas,
  type CanvasRenderingContext2D,
  createCanvas,
  Image,
} from "canvas";
import type { Coordinates } from "../comparePdf";

const CMAP_URL = "../../node_modules/pdfjs-dist/cmaps/";
const CMAP_PACKED = true;
const STANDARD_FONT_DATA_URL = "../../node_modules/pdfjs-dist/standard_fonts/";

interface PdfDetails {
  buffer: ArrayBuffer;
}

interface Config {
  settings: {
    disableFontFace?: boolean;
    verbosity?: number;
  };
}

interface CropCoordinates {
  width: number;
  height: number;
  x: number;
  y: number;
}

interface CanvasFactory {
  create: (
    width: number,
    height: number,
  ) => { canvas: Canvas; context: CanvasRenderingContext2D };
  reset: (
    canvasAndContext: { canvas: Canvas; context: CanvasRenderingContext2D },
    width: number,
    height: number,
  ) => void;
  destroy: (canvasAndContext: {
    canvas: Canvas;
    context: CanvasRenderingContext2D;
  }) => void;
}

export const pdfPageToPng = async (
  pdfDocument: PDFDocumentProxy,
  pageNumber: number,
  filename: string,
  isSinglePage = false,
): Promise<void> => {
  const page = await pdfDocument.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.38889 });
  const canvasFactory = pdfDocument.canvasFactory as CanvasFactory;
  const canvasAndContext = canvasFactory.create(
    viewport.width,
    viewport.height,
  );
  const renderContext = {
    canvasContext: canvasAndContext.context,
    viewport: viewport,
  };

  await page.render(renderContext).promise;

  const image = canvasAndContext.canvas.toBuffer("image/png");
  const pngFileName = isSinglePage
    ? filename
    : filename.replace(".png", `-${pageNumber - 1}.png`);
  fs.writeFileSync(pngFileName, image);
};

export const pdfToPng = async (
  pdfDetails: PdfDetails,
  pngFilePath: string,
  config: Config,
): Promise<void> => {
  const pdfData = new Uint8Array(pdfDetails.buffer);
  const pdfDocument = await getDocument({
    disableFontFace: config.settings?.disableFontFace ?? true,
    data: pdfData,
    cMapUrl: CMAP_URL,
    cMapPacked: CMAP_PACKED,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
    verbosity: config.settings?.verbosity ?? 0,
  }).promise;

  for (let index = 1; index <= pdfDocument.numPages; index++) {
    await pdfPageToPng(
      pdfDocument,
      index,
      pngFilePath,
      pdfDocument.numPages === 1,
    );
  }
};

export const applyMask = async (
  pngFilePath: string,
  coordinates: Coordinates = { x0: 0, y0: 0, x1: 0, y1: 0 },
  color = "black",
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const data = fs.readFileSync(pngFilePath);
    const img = new Image();
    img.src = data;
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, img.width, img.height);
    ctx.beginPath();
    ctx.fillRect(
      coordinates.x0,
      coordinates.y0,
      coordinates.x1 - coordinates.x0,
      coordinates.y1 - coordinates.y0,
    );
    fs.writeFileSync(pngFilePath, canvas.toBuffer());
    resolve();
  });
};

export const applyCrop = async (
  pngFilePath: string,
  coordinates: CropCoordinates = { width: 0, height: 0, x: 0, y: 0 },
  index = 0,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const data = fs.readFileSync(pngFilePath);
    const img = new Image();
    img.src = data;
    const canvas = createCanvas(coordinates.width, coordinates.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      img,
      coordinates.x,
      coordinates.y,
      coordinates.width,
      coordinates.height,
      0,
      0,
      coordinates.width,
      coordinates.height,
    );

    fs.writeFileSync(
      pngFilePath.replace(".png", `-${index}.png`),
      canvas.toBuffer(),
    );
    resolve();
  });
};
