import fs from "fs-extra";
import type { ComparePdfConfig } from "./config";
import { ComparePdf } from "./comparePdf";

describe("Compare Pdf By Image Tests - Typescript", () => {
  const engines = ["native", "graphicsMagick"] as const;
  for (const engine of engines) {
    describe(`Engine: ${engine}`, () => {
      let config: ComparePdfConfig;

      beforeEach(async () => {
        config = (await import("./config.js")).default;
        config.settings.imageEngine = engine;
      });

      it("Should be able to verify same single page PDFs", async () => {
        const comparisonResults = await new ComparePdf(config)
          .actualPdfFile("singlePage.pdf")
          .baselinePdfFile("singlePage.pdf")
          .compare();
        expect(comparisonResults.status).to.equal("passed");
      });

      it("Should be able to verify same multi-page PDFs", async () => {
        const comparisonResults = await new ComparePdf(config)
          .actualPdfFile("same.pdf")
          .baselinePdfFile("baseline.pdf")
          .compare();
        expect(comparisonResults.status).to.equal("passed");
      });

      it("Should be able to verify same PDFs without extension", async () => {
        const comparisonResults = await new ComparePdf(config)
          .actualPdfFile("same")
          .baselinePdfFile("baseline")
          .compare();
        expect(comparisonResults.status).to.equal("passed");
      });

      it("Should be able to verify same PDFs using relative paths", async () => {
        const comparisonResults = await new ComparePdf(config)
          .actualPdfFile("../data/actualPdfs/same.pdf")
          .baselinePdfFile("../data/baselinePdfs/baseline.pdf")
          .compare();
        expect(comparisonResults.status).to.equal("passed");
      });

      it("Should be able to verify different PDFs", async () => {
        const comparisonResults = await new ComparePdf(config)
          .actualPdfFile("notSame.pdf")
          .baselinePdfFile("baseline.pdf")
          .compare();
        expect(comparisonResults.status).to.equal("failed");
        expect(comparisonResults.message).to.equal(
          "notSame.pdf is not the same as baseline.pdf compared by their images.",
        );
        expect(comparisonResults.details).to.not.be.null;
      });

      it("Should be able to verify same PDFs using direct buffer", async () => {
        const actualPdfFilename = "same.pdf";
        const baselinePdfFilename = "baseline.pdf";
        const actualPdfBuffer = fs.readFileSync(
          `${config.paths.actualPdfRootFolder}/${actualPdfFilename}`,
        );
        const baselinePdfBuffer = fs.readFileSync(
          `${config.paths.baselinePdfRootFolder}/${baselinePdfFilename}`,
        );

        const comparisonResults = await new ComparePdf()
          .actualPdfBuffer(actualPdfBuffer, actualPdfFilename)
          .baselinePdfBuffer(baselinePdfBuffer, baselinePdfFilename)
          .compare();
        expect(comparisonResults.status).to.equal("passed");
      });

      it("Should be able to verify same PDFs using direct buffer passing filename in another way", async () => {
        const actualPdfFilename = "same.pdf";
        const baselinePdfFilename = "baseline.pdf";
        const actualPdfBuffer = fs.readFileSync(
          `${config.paths.actualPdfRootFolder}/${actualPdfFilename}`,
        );
        const baselinePdfBuffer = fs.readFileSync(
          `${config.paths.baselinePdfRootFolder}/${baselinePdfFilename}`,
        );

        const comparisonResults = await new ComparePdf()
          .actualPdfBuffer(actualPdfBuffer)
          .actualPdfFile(actualPdfFilename)
          .baselinePdfBuffer(baselinePdfBuffer)
          .baselinePdfFile(baselinePdfFilename)
          .compare();
        expect(comparisonResults.status).to.equal("passed");
      });

      it("Should be able to verify different PDFs using direct buffer", async () => {
        const actualPdfFilename = "notSame.pdf";
        const baselinePdfFilename = "baseline.pdf";
        const actualPdfBuffer = fs.readFileSync(
          `${config.paths.actualPdfRootFolder}/${actualPdfFilename}`,
        );
        const baselinePdfBuffer = fs.readFileSync(
          `${config.paths.baselinePdfRootFolder}/${baselinePdfFilename}`,
        );

        const comparisonResults = await new ComparePdf()
          .actualPdfBuffer(actualPdfBuffer, actualPdfFilename)
          .baselinePdfBuffer(baselinePdfBuffer, baselinePdfFilename)
          .compare();
        expect(comparisonResults.status).to.equal("failed");
        expect(comparisonResults.message).to.equal(
          "notSame.pdf is not the same as baseline.pdf compared by their images.",
        );
        expect(comparisonResults.details).to.not.be.null;
      });

      it("Should be able to verify same PDFs with Croppings", async () => {
        const comparisonResults = await new ComparePdf(config)
          .actualPdfFile("same.pdf")
          .baselinePdfFile("baseline.pdf")
          .cropPage(1, { width: 530, height: 210, x: 0, y: 415 })
          .compare();
        expect(comparisonResults.status).to.equal("passed");
      });

      it("Should be able to verify same PDFs with Multiple Croppings", async () => {
        const croppings = [
          {
            pageIndex: 0,
            coordinates: { width: 210, height: 180, x: 615, y: 265 },
          },
          {
            pageIndex: 0,
            coordinates: { width: 210, height: 180, x: 615, y: 520 },
          },
          {
            pageIndex: 1,
            coordinates: { width: 530, height: 210, x: 0, y: 415 },
          },
        ];

        const comparisonResults = await new ComparePdf(config)
          .actualPdfFile("same.pdf")
          .baselinePdfFile("baseline.pdf")
          .cropPages(croppings)
          .compare();
        expect(comparisonResults.status).to.equal("passed");
      });

      it("Should be able to verify same PDFs with Masks", async () => {
        const comparisonResults = await new ComparePdf(config)
          .actualPdfFile("maskedSame.pdf")
          .baselinePdfFile("baseline.pdf")
          .addMask(1, { x0: 20, y0: 40, x1: 100, y1: 70 })
          .addMask(1, { x0: 330, y0: 40, x1: 410, y1: 70 })
          .compare();
        expect(comparisonResults.status).to.equal("passed");
      });

      it("Should be able to verify different PDFs with Masks", async () => {
        const masks = [
          { pageIndex: 1, coordinates: { x0: 20, y0: 40, x1: 100, y1: 70 } },
          { pageIndex: 1, coordinates: { x0: 330, y0: 40, x1: 410, y1: 70 } },
        ];
        const comparisonResults = await new ComparePdf(config)
          .actualPdfFile("maskedNotSame.pdf")
          .baselinePdfFile("maskBaseline.pdf")
          .addMasks(masks)
          .compare();
        expect(comparisonResults.status).to.equal("failed");
        expect(comparisonResults.message).to.equal(
          "maskedNotSame.pdf is not the same as maskBaseline.pdf compared by their images.",
        );
        expect(comparisonResults.details).to.not.be.null;
      });

      it("Should be able to verify only specific page indexes", async () => {
        const comparisonResults = await new ComparePdf(config)
          .actualPdfFile("notSame.pdf")
          .baselinePdfFile("baseline.pdf")
          .onlyPageIndexes([1])
          .compare();
        expect(comparisonResults.status).to.equal("passed");
      });

      it("Should be able to verify only specific page indexes with pdfs having different page count", async () => {
        config.settings.matchPageCount = false;
        const comparisonResults = await new ComparePdf(config)
          .actualPdfFile("notSamePageCount.pdf")
          .baselinePdfFile("notSamePageCount.pdf")
          .onlyPageIndexes([0])
          .compare();
        expect(comparisonResults.status).to.equal("passed");
      });

      it("Should be able to skip specific page indexes", async () => {
        const comparisonResults = await new ComparePdf(config)
          .actualPdfFile("notSame.pdf")
          .baselinePdfFile("baseline.pdf")
          .skipPageIndexes([0])
          .compare();
        expect(comparisonResults.status).to.equal("passed");
      });
    });
  }
});
