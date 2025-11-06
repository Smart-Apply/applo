import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright';
import { AzureChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Define the structured output schema for job posting extraction
const JobPostingSchema = z.object({
  title: z.string().describe('The job title'),
  company: z.string().describe('The company name'),
  location: z.string().optional().describe('The job location'),
  description: z.string().optional().describe('The job description'),
  language: z
    .string()
    .describe('Detected language code (e.g., "de" for German, "en" for English, "fr" for French)'),
  requirements: z.array(z.string()).describe('List of job requirements'),
  responsibilities: z.array(z.string()).describe('List of job responsibilities'),
  niceToHave: z.array(z.string()).describe('Nice to have qualifications'),
  salary: z.string().optional().describe('Salary information if available'),
  applicationDeadline: z.string().optional().describe('Application deadline if available'),
});

export type JobPostingExtraction = z.infer<typeof JobPostingSchema>;

// Constants
const MAX_CONTENT_LENGTH = 12000; // Character limit for LLM processing (GPT-4o-mini context window optimization)

@Injectable()
export class AgentUrlParser {
  private readonly logger = new Logger(AgentUrlParser.name);
  private browser: Browser | null = null;
  private readonly maxSteps: number;
  private readonly timeout: number;
  private readonly llm: AzureChatOpenAI;

  constructor() {
    // Configuration from environment variables
    this.maxSteps = parseInt(process.env.AGENT_MAX_STEPS || '10', 10);
    this.timeout = parseInt(process.env.AGENT_TIMEOUT || '30000', 10);

    // Initialize LLM for agent reasoning using Azure OpenAI
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';

    if (!azureEndpoint || !azureApiKey || !azureDeployment) {
      throw new Error(
        'Azure OpenAI configuration missing. Please set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT_NAME',
      );
    }

    this.llm = new AzureChatOpenAI({
      azureOpenAIApiKey: azureApiKey,
      azureOpenAIApiDeploymentName: azureDeployment,
      azureOpenAIApiVersion: azureApiVersion,
      azureOpenAIEndpoint: azureEndpoint,
      temperature: 0.2, // Lower temperature for more consistent extraction
      maxTokens: 4000,
    });

    this.logger.log('AgentUrlParser initialized with Azure OpenAI');
  }

  /**
   * Parse job posting from URL using AI agent with browser automation
   * @param url The job posting URL
   * @returns Structured job posting data
   */
  async parse(url: string): Promise<JobPostingExtraction> {
    this.logger.log(`Starting agent-based parsing for URL: ${url}`);
    const startTime = Date.now();

    try {
      // Step 1: Initialize browser
      await this.initBrowser();

      // Step 2: Navigate to URL and wait for content
      const page = await this.navigateToUrl(url);

      // Step 3: Extract page content
      const pageContent = await this.extractPageContent(page);

      // Step 4: Use LLM to extract structured data
      const extracted = await this.extractStructuredData(pageContent, url);

      // Step 5: Validate extraction completeness
      this.validateExtraction(extracted);

      const duration = Date.now() - startTime;
      this.logger.log(`Successfully parsed URL in ${duration}ms`);

      return extracted;
    } catch (error) {
      this.logger.error(`Agent parsing failed for ${url}: ${error.message}`);
      throw error;
    } finally {
      // Cleanup
      await this.closeBrowser();
    }
  }

  /**
   * Initialize Playwright browser
   */
  private async initBrowser(): Promise<void> {
    if (this.browser) {
      return;
    }

    this.logger.debug('Launching browser...');
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
  }

  /**
   * Navigate to URL and wait for dynamic content
   */
  private async navigateToUrl(url: string): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();

    // Set realistic viewport and user agent
    await page.setViewportSize({ width: 1920, height: 1080 });

    try {
      this.logger.debug(`Navigating to ${url}`);

      // Navigate with timeout
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: this.timeout,
      });

      // Wait for network to be idle (dynamic content loaded)
      await page
        .waitForLoadState('networkidle', {
          timeout: 5000,
        })
        .catch(() => {
          // Ignore timeout, some sites continuously load content
          this.logger.debug('Network idle timeout, proceeding anyway');
        });

      // Handle common popups and cookie banners
      await this.handlePopups(page);

      // Additional wait for JavaScript rendering
      await page.waitForTimeout(3000);

      return page;
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  /**
   * Handle cookie banners and popups
   */
  private async handlePopups(page: Page): Promise<void> {
    // Common selectors for accept buttons on cookie banners
    const acceptSelectors = [
      'button:has-text("Accept")',
      'button:has-text("Accept all")',
      'button:has-text("I Accept")',
      'button:has-text("Agree")',
      'button:has-text("OK")',
      '[id*="accept"]',
      '[class*="accept"]',
    ];

    for (const selector of acceptSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 1000 })) {
          await button.click({ timeout: 1000 });
          this.logger.debug(`Clicked accept button: ${selector}`);
          await page.waitForTimeout(500);
          break;
        }
      } catch {
        // Ignore if button not found or not clickable
      }
    }
  }

  /**
   * Extract text content from page
   * Uses a generic approach: tries multiple common selectors and picks the one with most content
   */
  private async extractPageContent(page: Page): Promise<string> {
    this.logger.debug('Extracting page content...');

    // Generic selectors for job postings across different sites
    // Ordered by specificity (more specific first)
    const mainContentSelectors = [
      // ID-based selectors (most specific)
      '#jobDescriptionText',
      '#job-description',
      '#jobDescription',
      '[id*="job-description"]',
      '[id*="jobDescription"]',

      // Class-based selectors (common patterns)
      '.job-description',
      '.job-detail',
      '.job-details',
      '.jobsearch-jobDescriptionText',
      '.posting',
      '[class*="job-description"]',
      '[class*="jobDescription"]',

      // Data attribute selectors
      '[data-testid="job-description"]',
      '[data-testid*="description"]',

      // Semantic HTML (generic fallbacks)
      'main',
      '[role="main"]',
      'article',
      '.content',
    ];

    let bestContent = '';
    let bestSelector = '';
    let bestLength = 0;

    // Try all selectors and keep the one with most content
    for (const selector of mainContentSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 500 })) {
          const content = await element.innerText();
          if (content.length > bestLength) {
            bestContent = content;
            bestSelector = selector;
            bestLength = content.length;
          }
        }
      } catch {
        // Continue trying other selectors
      }
    }

    // Fallback to body if no good content found
    if (bestLength < 200) {
      this.logger.debug('No sufficient content from specific selectors, using body as fallback');
      bestContent = await page.locator('body').innerText();
      bestSelector = 'body';
      bestLength = bestContent.length;
    }

    this.logger.debug(`Best selector: ${bestSelector} with ${bestLength} characters`);

    // Clean up the content before sending to LLM
    bestContent = this.cleanContent(bestContent);

    // Log content preview for debugging
    if (bestContent.length < 500) {
      this.logger.warn(`Content seems short after cleaning: ${bestContent}`);
    } else {
      this.logger.debug(`Content preview after cleaning: ${bestContent.substring(0, 300)}...`);
    }

    // Get page title for additional context
    const title = await page.title();
    const fullContent = `Page Title: ${title}\n\n${bestContent}`;

    await page.close();

    return fullContent;
  }

  /**
   * Clean extracted content by removing common noise patterns
   * Removes UI elements, navigation, login prompts, similar jobs, etc.
   */
  private cleanContent(content: string): string {
    // Remove common noise patterns (case-insensitive)
    const noisePatterns = [
      // Login/Sign-in prompts (multiple lines)
      /sign in.*?password.*?(?:show|forgot password).*?(?:new to|join now).{0,500}/gis,
      /welcome back.*?email or phone.*?password.{0,300}/gis,
      /by clicking continue.*?user agreement.*?privacy policy.{0,300}/gis,

      // Similar jobs sections
      /similar jobs.{0,50}\n.*/gis,
      /people also viewed.{0,50}\n.*/gis,
      /show more jobs like this.*/gis,
      /show fewer jobs like this.*/gis,

      // LinkedIn-specific UI
      /get ai-powered advice.*/gis,
      /referrals increase your chances.*/gis,
      /see who you know.*/gis,
      /get notified when a new job.*/gis,
      /set alert.*/gis,
      /use ai to assess.*/gis,
      /tailor my resume.*/gis,
      /am i a good fit.*/gis,

      // Generic job search UI
      /explore collaborative articles.*/gis,
      /\d+\s+open jobs.*/gis,
      /similar searches.*/gis,

      // Repeated "Show more/less"
      /show more\s+show less/gi,

      // Multiple consecutive newlines
      /\n{3,}/g,
    ];

    let cleaned = content;
    for (const pattern of noisePatterns) {
      cleaned = cleaned.replace(pattern, '\n');
    }

    // Remove lines that are likely navigation/UI (very short lines with common UI keywords)
    const uiKeywords = /^(apply|save|share|report|sign in|join now|back|home|search|filter)$/i;
    cleaned = cleaned
      .split('\n')
      .filter((line) => {
        const trimmed = line.trim();
        // Keep empty lines and longer lines
        if (trimmed.length === 0 || trimmed.length > 50) return true;
        // Remove short lines that match UI keywords
        return !uiKeywords.test(trimmed);
      })
      .join('\n');

    // Final cleanup: normalize whitespace
    cleaned = cleaned
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .replace(/\n\s+\n/g, '\n\n') // Clean up empty lines
      .trim();

    return cleaned;
  }

  /**
   * Use LLM to extract structured job posting data from page content
   */
  private async extractStructuredData(content: string, url: string): Promise<JobPostingExtraction> {
    this.logger.debug('Using LLM to extract structured data...');

    const schema = zodToJsonSchema(JobPostingSchema);

    const prompt = `You are an expert at extracting structured job posting information from web page content.

URL: ${url}

TASK: Extract the following information from the job posting content below:
- Job title (the actual position name, e.g., "Senior Software Engineer", "Marketing Manager", "Consultant Cloud Infrastructure")
- Company name (the organization offering the job, e.g., "Google", "Microsoft", "adesso SE")
- Location (city and country, e.g., "Berlin, Germany", "Remote", "Essen, North Rhine-Westphalia, Germany")
- Language (detect the primary language of the job posting and return ISO 639-1 code: "de" for German, "en" for English, "fr" for French, "es" for Spanish, etc.)
- Job description (a summary of what the role is about)
- Requirements (list of required qualifications, skills, experience)
- Responsibilities (list of job duties and tasks)
- Nice to have qualifications (optional/preferred qualifications)
- Salary information (if mentioned)
- Application deadline (if mentioned)

IMPORTANT INSTRUCTIONS:
- Extract ONLY factual information from the job posting
- DO NOT extract UI elements, navigation text, or login prompts
- DO NOT extract information from "similar jobs" sections
- For the job title: extract ONLY the position name, not the company name or location
- For the company: extract ONLY the company/organization name
- For location: extract ONLY the geographical location (city, region, country)
- For language: detect from the job posting content itself (not from URL or metadata)
- If information is clearly not available, use empty arrays [] or omit optional fields
- Be precise and accurate

Job Posting Content:
${content.substring(0, MAX_CONTENT_LENGTH)}

Respond with a valid JSON object matching this schema:
${JSON.stringify(schema, null, 2)}`;

    try {
      // Invoke LLM with prompt string directly
      const response = await this.llm.invoke(prompt);

      // Parse the response - handle both JSON and text responses
      let jsonText = response.content.toString();

      // Extract JSON from markdown code blocks if present
      const jsonMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonText);

      // Validate against schema
      const validated = JobPostingSchema.parse(parsed);

      this.logger.debug('Successfully extracted structured data');
      return validated;
    } catch (error) {
      this.logger.error(`Failed to extract structured data: ${error.message}`);
      throw new Error(`LLM extraction failed: ${error.message}`);
    }
  }

  /**
   * Validate that extraction has sufficient data
   */
  private validateExtraction(data: JobPostingExtraction): void {
    if (!data.title || data.title.length < 3) {
      throw new Error('Job title not found or too short');
    }

    if (!data.company || data.company.length < 2) {
      throw new Error('Company name not found or too short');
    }

    const totalItems =
      data.requirements.length + data.responsibilities.length + data.niceToHave.length;

    if (totalItems === 0 && (!data.description || data.description.length < 50)) {
      throw new Error('Insufficient job posting content extracted');
    }

    this.logger.debug('Extraction validation passed');
  }

  /**
   * Close browser and cleanup resources
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      this.logger.debug('Closing browser...');
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Health check for agent functionality
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.initBrowser();
      await this.closeBrowser();
      return true;
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return false;
    }
  }
}
