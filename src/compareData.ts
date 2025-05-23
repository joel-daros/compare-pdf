import path from "node:path";

export interface CompareDetails {
  actualPdfFilename: string;
  baselinePdfFilename: string;
  actualPdfBuffer: Buffer;
  baselinePdfBuffer: Buffer;
}

export interface CompareResult {
  status: "passed" | "failed";
  message?: string;
}

export const comparePdfByBase64 = async ({
  actualPdfFilename,
  baselinePdfFilename,
  actualPdfBuffer,
  baselinePdfBuffer,
}: CompareDetails): Promise<CompareResult> => {
  return new Promise((resolve) => {
    const actualPdfBaseName = path.parse(actualPdfFilename).name;
    const baselinePdfBaseName = path.parse(baselinePdfFilename).name;
    const actualPdfBase64 = Buffer.from(actualPdfBuffer).toString("base64");
    const baselinePdfBase64 = Buffer.from(baselinePdfBuffer).toString("base64");

    if (actualPdfBase64 !== baselinePdfBase64) {
      resolve({
        status: "failed",
        message: `${actualPdfBaseName}.pdf is not the same as ${baselinePdfBaseName}.pdf compared by their base64 values.`,
      });
    } else {
      resolve({ status: "passed" });
    }
  });
};
