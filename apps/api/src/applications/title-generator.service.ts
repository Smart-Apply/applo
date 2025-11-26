import { Injectable, Logger, Inject } from '@nestjs/common';
import { LLMService } from '../llm/llm.service';
import { LLMProvider } from '../llm/llm.interface';
import { APPLICATION_TITLE_MAX_LENGTH, ELLIPSIS_LENGTH } from './constants';

export interface JobPostingForTitle {
  title: string;
  company: string;
  location?: string | null;
}

@Injectable()
export class TitleGeneratorService {
  private readonly logger = new Logger(TitleGeneratorService.name);

  constructor(
    @Inject('AZURE_OPENAI_PROVIDER')
    private readonly azureOpenAIProvider: LLMProvider,
  ) {}

  /**
   * Generate a concise application title using LLM
   * Format: "[Job Title] @ [Company]" or similar
   */
  async generateTitle(jobPosting: JobPostingForTitle): Promise<string> {
    // For MVP, use simple fallback to avoid Azure OpenAI rate limits
    // TODO: Re-enable LLM title generation when quota is available
    const fallbackTitle = this.generateFallbackTitle(jobPosting);
    this.logger.debug(`Using fallback title: ${fallbackTitle}`);
    return fallbackTitle;

    /* Disabled due to Azure OpenAI rate limits
    const prompt = `Generate a concise application title (max ${APPLICATION_TITLE_MAX_LENGTH} chars) for this job posting.

Job Title: ${jobPosting.title}
Company: ${jobPosting.company}
Location: ${jobPosting.location || 'Remote'}

Format: "[Job Title] @ [Company]" or "[Job Title] - [Company]"
Example: "Senior Frontend Developer @ Google"
Example: "Full Stack Engineer - Stripe"

Only return the title, nothing else. Keep it under ${APPLICATION_TITLE_MAX_LENGTH} characters.`;

    try {
      // Use direct Azure OpenAI provider (not agents) for simple title generation
      const title = await this.azureOpenAIProvider.generateText(prompt, {
        maxTokens: 50,
        temperature: 0.3,
      });

      const cleanedTitle = title.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
      
      // Validate and truncate if needed
      if (cleanedTitle && cleanedTitle.length <= APPLICATION_TITLE_MAX_LENGTH) {
        this.logger.log(`Generated title with Azure OpenAI: ${cleanedTitle}`);
        return cleanedTitle;
      }

      // Fallback if LLM produces invalid output
      return this.generateFallbackTitle(jobPosting);
    } catch (error) {
      this.logger.warn(`Title generation failed, using fallback: ${error.message}`);
      return this.generateFallbackTitle(jobPosting);
    }
    */
  }

  /**
   * Generate a simple fallback title without LLM
   */
  private generateFallbackTitle(jobPosting: JobPostingForTitle): string {
    const title = jobPosting.title || 'Position';
    const company = jobPosting.company || 'Unknown Company';
    const result = `${title} @ ${company}`;
    
    // Truncate if too long (reserve space for ellipsis)
    const truncateAt = APPLICATION_TITLE_MAX_LENGTH - ELLIPSIS_LENGTH;
    return result.length > APPLICATION_TITLE_MAX_LENGTH
      ? result.substring(0, truncateAt) + '...'
      : result;
  }
}
