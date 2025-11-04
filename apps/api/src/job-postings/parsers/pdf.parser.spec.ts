import { BadRequestException } from '@nestjs/common';
import { PdfParser } from './pdf.parser';

// Mock pdf-parse
jest.mock('pdf-parse', () =>
  jest.fn((buffer) => {
    const content = buffer.toString();
    if (content.includes('valid')) {
      return Promise.resolve({
        text: 'Senior Software Engineer at Google\n\nRequirements:\n- 5+ years experience\n- Strong programming skills',
        numpages: 1,
      });
    } else if (content.includes('empty')) {
      return Promise.resolve({
        text: '',
        numpages: 1,
      });
    } else if (content.includes('short')) {
      return Promise.resolve({
        text: 'Short',
        numpages: 1,
      });
    } else if (content.includes('invalid')) {
      return Promise.reject(new Error('Invalid PDF'));
    }
    return Promise.resolve({
      text: 'Default PDF content for testing with enough characters to pass validation',
      numpages: 1,
    });
  }),
);

describe('PdfParser', () => {
  let parser: PdfParser;

  beforeEach(() => {
    parser = new PdfParser();
  });

  it('should be defined', () => {
    expect(parser).toBeDefined();
  });

  it('should parse valid PDF and extract text', async () => {
    const buffer = Buffer.from('valid pdf content');

    const result = await parser.parse(buffer);

    expect(result).toContain('Senior Software Engineer');
    expect(result).toContain('Requirements');
  });

  it('should throw error for empty PDF', async () => {
    const buffer = Buffer.from('empty pdf');

    await expect(parser.parse(buffer)).rejects.toThrow(BadRequestException);
    await expect(parser.parse(buffer)).rejects.toThrow('Could not extract meaningful text');
  });

  it('should throw error for short content', async () => {
    const buffer = Buffer.from('short');

    // Content returned by mock is less than 50 characters
    await expect(parser.parse(buffer)).rejects.toThrow(BadRequestException);
  });
});
