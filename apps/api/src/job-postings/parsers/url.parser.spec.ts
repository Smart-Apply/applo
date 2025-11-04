import { BadRequestException } from '@nestjs/common';
import { UrlParser } from './url.parser';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('UrlParser', () => {
  let parser: UrlParser;

  beforeEach(() => {
    parser = new UrlParser();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(parser).toBeDefined();
  });

  it('should parse HTML content from URL', async () => {
    const mockHtml = `
      <html>
        <head><title>Job Posting</title></head>
        <body>
          <main>
            <h1>Senior Engineer at TechCorp</h1>
            <p>We are looking for an experienced engineer...</p>
          </main>
        </body>
      </html>
    `;

    mockedAxios.get.mockResolvedValue({ data: mockHtml });

    const result = await parser.parse('https://example.com/job');

    expect(result).toContain('Senior Engineer at TechCorp');
    expect(result).toContain('We are looking for an experienced engineer');
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://example.com/job',
      expect.objectContaining({
        timeout: expect.any(Number),
        headers: expect.objectContaining({
          'User-Agent': expect.any(String),
        }),
      }),
    );
  });

  it('should remove scripts and styles', async () => {
    const mockHtml = `
      <html>
        <body>
          <script>console.log('test');</script>
          <style>body { margin: 0; }</style>
          <main>Job posting content here with enough text to pass the minimum length requirement for extraction</main>
        </body>
      </html>
    `;

    mockedAxios.get.mockResolvedValue({ data: mockHtml });

    const result = await parser.parse('https://example.com/job');

    expect(result).not.toContain('console.log');
    expect(result).not.toContain('margin: 0');
    expect(result).toContain('Job posting content');
  });

  it('should throw error for timeout', async () => {
    mockedAxios.get.mockRejectedValue({ code: 'ECONNABORTED', isAxiosError: true });
    mockedAxios.isAxiosError.mockReturnValue(true);

    await expect(parser.parse('https://example.com/job')).rejects.toThrow(BadRequestException);
    await expect(parser.parse('https://example.com/job')).rejects.toThrow('timeout');
  });

  it('should throw error for 404', async () => {
    mockedAxios.get.mockRejectedValue({
      response: { status: 404 },
      isAxiosError: true,
    });
    mockedAxios.isAxiosError.mockReturnValue(true);

    await expect(parser.parse('https://example.com/job')).rejects.toThrow(BadRequestException);
    await expect(parser.parse('https://example.com/job')).rejects.toThrow('not found');
  });

  it('should throw error for server error', async () => {
    const axiosError: any = new Error('Server error');
    axiosError.response = { status: 500 };
    axiosError.isAxiosError = true;

    mockedAxios.get.mockRejectedValue(axiosError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    await expect(parser.parse('https://example.com/job')).rejects.toThrow(BadRequestException);
  });

  it('should throw error if content is too short', async () => {
    const mockHtml = '<html><body><main>Hi</main></body></html>';

    mockedAxios.get.mockResolvedValue({ data: mockHtml });

    await expect(parser.parse('https://example.com/job')).rejects.toThrow(BadRequestException);
    await expect(parser.parse('https://example.com/job')).rejects.toThrow(
      'Could not extract meaningful content',
    );
  });
});
