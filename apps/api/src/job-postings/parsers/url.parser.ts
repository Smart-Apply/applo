import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as cheerio from 'cheerio';
import axios from 'axios';

@Injectable()
export class UrlParser {
  private readonly logger = new Logger(UrlParser.name);
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds

  /**
   * Parse job posting from URL
   * Fetches HTML content and extracts text
   * @param url URL to job posting page
   * @returns Extracted text content
   */
  async parse(url: string): Promise<string> {
    try {
      this.logger.log(`Fetching job posting from URL: ${url}`);

      const response = await axios.get(url, {
        timeout: this.REQUEST_TIMEOUT,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);

      // Remove scripts, styles, navigation, footer, etc.
      $('script, style, nav, footer, header, aside, iframe, noscript').remove();

      // Try to find main content area (common patterns)
      let text = '';
      const mainSelectors = [
        'main',
        '[role="main"]',
        '.job-description',
        '.job-detail',
        '#job-description',
        'article',
        '.content',
      ];

      for (const selector of mainSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          text = element.text();
          break;
        }
      }

      // Fallback to body if no main content found
      if (!text) {
        text = $('body').text();
      }

      // Clean up whitespace
      text = text
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n\s*\n/g, '\n') // Remove empty lines
        .trim();

      if (!text || text.length < 50) {
        throw new BadRequestException('Could not extract meaningful content from URL');
      }

      this.logger.log(`Successfully extracted ${text.length} characters from URL`);
      return text;
    } catch (error) {
      this.logger.error(`Failed to parse URL: ${error.message}`);

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new BadRequestException('Request timeout: URL took too long to respond');
        }
        if (error.response?.status === 404) {
          throw new BadRequestException('URL not found (404)');
        }
        if (error.response?.status && error.response.status >= 500) {
          throw new BadRequestException('Server error when accessing URL');
        }
      }

      throw new BadRequestException(`Failed to parse URL: ${error.message}`);
    }
  }
}
