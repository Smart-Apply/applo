import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../../llm/llm.service';
import { sanitizeRichText } from '../../common/services/html-sanitizer';
import { lintGeneratedStyle } from '../style-lint.util';
import {
  applyTranslatedSegments,
  extractTranslatableSegments,
  isValidSegmentTranslation,
  TranslatableResume,
  TranslationSegment,
} from './translation-segments.util';

export type TranslationLanguage = 'de' | 'en';

/**
 * One cached translation of an application's content, stored per target
 * language in `Application.translations` (Json). `sourceHash` is the xxhash
 * of the source `resumeText` + `coverLetterText` at translation time — a
 * mismatch invalidates the entry (user edits re-translate naturally).
 * Entries without `resume` mark a failed attempt (`failedAt`) so the API can
 * surface a fallback warning; they are retried on the next export.
 */
export interface StoredTranslationEntry {
  resume?: TranslatableResume;
  coverLetter?: string | null;
  sourceHash: string;
  cachedAt?: string;
  failedAt?: string;
}

export type StoredTranslations = Record<string, StoredTranslationEntry>;

const LANGUAGE_NAMES: Record<TranslationLanguage, string> = {
  de: 'German',
  en: 'English',
};

/**
 * Content translation for cross-language exports
 * (fix plan `docs/bug_fixes/LANGUAGE_SWITCH_EXPORT.md`).
 *
 * Follows the established guarded-LLM-pass pattern (editor pass /
 * style-rewrite): every result is validated deterministically and the caller
 * falls back to the untranslated source on ANY violation — a broken or
 * partially-translated document never ships silently. Date labels are NOT
 * translated here; they are re-derived deterministically by
 * `resume-date-localizer.util.ts`.
 */
@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  constructor(private readonly llmService: LLMService) {}

  /**
   * Translate the display strings of a stored resume JSON. Returns the
   * translated resume, or `null` when the guard rejects the LLM output or the
   * call fails (caller falls back to the source resume).
   */
  async translateResume<T extends TranslatableResume>(
    resume: T,
    sourceLanguage: TranslationLanguage,
    targetLanguage: TranslationLanguage,
    context: { userId?: string; applicationId?: string } = {},
  ): Promise<T | null> {
    const segments = extractTranslatableSegments(resume);
    if (segments.length === 0) {
      return resume;
    }

    try {
      const response = await this.llmService.callJson<{ segments: TranslationSegment[] }>(
        'v1/translate-resume.md',
        {
          segments,
          sourceLanguage,
          sourceLanguageName: LANGUAGE_NAMES[sourceLanguage],
          targetLanguage,
          targetLanguageName: LANGUAGE_NAMES[targetLanguage],
          userId: context.userId,
        },
        { temperature: 0.2, maxTokens: 6000 },
      );

      if (!isValidSegmentTranslation(segments, response?.segments)) {
        this.logger.warn(
          `Resume translation guard rejected LLM output for application ${context.applicationId} ` +
            `(${sourceLanguage}→${targetLanguage}, ${segments.length} segments) — keeping source`,
        );
        return null;
      }

      return applyTranslatedSegments(resume, response.segments);
    } catch (error) {
      this.logger.warn(
        `Resume translation failed for application ${context.applicationId} ` +
          `(${sourceLanguage}→${targetLanguage}): ${(error as Error).message} — keeping source`,
      );
      return null;
    }
  }

  /**
   * Translate a cover letter (sanitized HTML in, sanitized HTML out).
   * Returns `null` when the result fails the deterministic acceptance checks
   * or the call fails (caller falls back to the source letter).
   */
  async translateCoverLetter(
    coverLetterHtml: string,
    sourceLanguage: TranslationLanguage,
    targetLanguage: TranslationLanguage,
    context: { userId?: string; applicationId?: string } = {},
  ): Promise<string | null> {
    if (!coverLetterHtml || coverLetterHtml.trim() === '') {
      return coverLetterHtml;
    }

    try {
      const translated = await this.llmService.callText(
        'v1/translate-cover-letter.md',
        {
          coverLetter: coverLetterHtml,
          sourceLanguage,
          sourceLanguageName: LANGUAGE_NAMES[sourceLanguage],
          targetLanguage,
          targetLanguageName: LANGUAGE_NAMES[targetLanguage],
          userId: context.userId,
        },
        { temperature: 0.2, maxTokens: 4000 },
      );

      const sanitized = sanitizeRichText(this.stripCodeFence(translated)).trim();
      if (!this.isAcceptableCoverLetterTranslation(coverLetterHtml, sanitized)) {
        this.logger.warn(
          `Cover letter translation guard rejected LLM output for application ` +
            `${context.applicationId} (${sourceLanguage}→${targetLanguage}) — keeping source`,
        );
        return null;
      }

      // Non-destructive style check on the finished translation (logs only),
      // consistent with the pipeline's deterministic style lint.
      const styleResult = lintGeneratedStyle(sanitized, targetLanguage);
      if (styleResult.total > 0) {
        this.logger.warn(
          `Style check (translated cover letter, application ${context.applicationId}): ` +
            `${styleResult.total} violation(s) — shipping unchanged (non-destructive)`,
        );
      }

      return sanitized;
    } catch (error) {
      this.logger.warn(
        `Cover letter translation failed for application ${context.applicationId} ` +
          `(${sourceLanguage}→${targetLanguage}): ${(error as Error).message} — keeping source`,
      );
      return null;
    }
  }

  /** Models occasionally wrap HTML output in a markdown fence despite the prompt. */
  private stripCodeFence(content: string): string {
    return content
      .trim()
      .replace(/^```[\w-]*[ \t]*\r?\n?/, '')
      .replace(/\r?\n?[ \t]*```[ \t]*$/, '')
      .trim();
  }

  /**
   * Deterministic acceptance check for a translated cover letter: non-empty,
   * not gutted (≥ 0.5× source, the established floor), not exploded (≤ 2.5×),
   * and paragraph structure preserved when the source had paragraphs.
   */
  private isAcceptableCoverLetterTranslation(source: string, translated: string): boolean {
    if (!translated) return false;
    const sourceLength = source.trim().length;
    if (translated.length < sourceLength * 0.5) return false;
    if (translated.length > sourceLength * 2.5) return false;
    if (/<p[^>]*>/i.test(source) && !/<p[^>]*>/i.test(translated)) return false;
    return true;
  }
}
