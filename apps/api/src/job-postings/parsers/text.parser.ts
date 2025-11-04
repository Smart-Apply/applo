import { Injectable } from '@nestjs/common';

@Injectable()
export class TextParser {
  /**
   * Parse plain text - simply returns the input text
   * @param text Raw text content
   * @returns Parsed text
   */
  parse(text: string): string {
    return text.trim();
  }
}
