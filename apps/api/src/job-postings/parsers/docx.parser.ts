import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import mammoth from 'mammoth';

@Injectable()
export class DocxParser {
  private readonly logger = new Logger(DocxParser.name);

  /**
   * Parse DOCX file and extract text
   * @param buffer DOCX file buffer
   * @returns Extracted text content
   */
  async parse(buffer: Buffer): Promise<string> {
    try {
      this.logger.log(`Parsing DOCX file (${buffer.length} bytes)`);

      const result = await mammoth.extractRawText({ buffer });
      const text = result.value.trim();

      if (!text || text.length < 50) {
        throw new BadRequestException('Could not extract meaningful text from DOCX');
      }

      this.logger.log(`Successfully extracted ${text.length} characters from DOCX`);
      return text;
    } catch (error) {
      this.logger.error(`Failed to parse DOCX: ${error.message}`);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(`Failed to parse DOCX: ${error.message}`);
    }
  }
}
