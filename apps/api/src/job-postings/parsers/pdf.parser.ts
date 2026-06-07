import { Injectable, Logger, BadRequestException } from '@nestjs/common';
// pdf-parse v2 ships a real CJS entry (`dist/pdf-parse/cjs/index.cjs`)
// that exports a `PDFParse` class — totally different shape from v1's
// default-export `pdfParse(buffer)` function. The v1 form was what
// broke prod with "pdfParse is not a function" when Dependabot bumped
// the package from 1.x to 2.x.
import { PDFParse } from 'pdf-parse';

@Injectable()
export class PdfParser {
  private readonly logger = new Logger(PdfParser.name);

  /**
   * Parse PDF file and extract text.
   *
   * pdf-parse v2 wraps `pdfjs-dist`. Construct a parser around the
   * buffer (auto-converted to Uint8Array internally), call `getText()`,
   * then destroy the parser to release the pdfjs worker handles.
   *
   * @param buffer PDF file buffer
   * @returns Extracted text content
   */
  async parse(buffer: Buffer): Promise<string> {
    let parser: PDFParse | null = null;
    try {
      this.logger.log(`Parsing PDF file (${buffer.length} bytes)`);

      parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      const text = result.text.trim();

      if (!text || text.length < 50) {
        throw new BadRequestException('Could not extract meaningful text from PDF');
      }

      this.logger.log(
        `Successfully extracted ${text.length} characters from PDF (${result.total} pages)`,
      );
      return text;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to parse PDF: ${message}`);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(`Failed to parse PDF: ${message}`);
    } finally {
      // Release the pdfjs-dist worker / document handles. Safe to call
      // even on early failures (constructor exits before `doc` is set).
      await parser?.destroy().catch(() => undefined);
    }
  }
}
