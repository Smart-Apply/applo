import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PdfService } from '../../pdf/pdf.service';
import { StorageService } from '../../storage/storage.service';
import { TemplatesService } from '../../templates/templates.service';
import { LLMService } from '../../llm/llm.service';
import {
  StoredTranslationEntry,
  StoredTranslations,
  TranslationLanguage,
  TranslationService,
} from '../../applications/translation/translation.service';
import { localizeStoredResumeDates } from '../../applications/resume-date-localizer.util';
import { calculateContentHash } from '../../applications/utils/translation.util';
import { Job } from '../interfaces/queue.interface';
import type { ResumeTemplateData } from '../../pdf-v2/template-data';

export interface ApplicationJobData {
  applicationId: string;
  userId: string;
  jobPostingId: string;
  language?: TranslationLanguage;
}

function asTranslationLanguage(value?: string | null): TranslationLanguage | null {
  return value === 'de' || value === 'en' ? value : null;
}

@Injectable()
export class ApplicationProcessor {
  private readonly logger = new Logger(ApplicationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly storageService: StorageService,
    private readonly templatesService: TemplatesService,
    private readonly llmService: LLMService,
    private readonly translationService: TranslationService,
  ) {}

  async process(job: Job<ApplicationJobData>): Promise<void> {
    const { applicationId, userId, jobPostingId: _jobPostingId, language } = job.data;

    this.logger.log(
      `Processing application ${applicationId} with language: ${language || 'default'}`,
    );

    try {
      // 1. Load current application state
      const application = await this.prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          jobPosting: true,
          user: true,
        },
      });

      if (!application || !application.jobPosting) {
        throw new Error('Application or job posting not found');
      }

      if (!application.resumeText) {
        throw new Error('Resume not provided');
      }

      // Cover letter is optional - user may have opted out during creation
      const hasCoverLetter = !!application.coverLetterText;
      if (!hasCoverLetter) {
        this.logger.log(
          `Application ${applicationId} has no cover letter - generating resume only`,
        );
      }

      let resumeData: ResumeTemplateData;
      try {
        resumeData = JSON.parse(application.resumeText);
      } catch (error) {
        this.logger.error('Failed to parse resume JSON for application', error as Error);
        throw new Error('Stored resume data is invalid');
      }

      // 2. Resolve target + source language and translate the stored content
      // when they differ (fix: docs/bug_fixes/LANGUAGE_SWITCH_EXPORT.md).
      // On translation failure we render a fully consistent SOURCE-language
      // document (labels included) instead of a mixed-language one.
      const targetLanguage =
        language ?? asTranslationLanguage(application.language) ?? 'de';
      const sourceLanguage =
        asTranslationLanguage(application.sourceLanguage) ??
        this.llmService.detectContentLanguage(
          [resumeData.summary, application.coverLetterText, application.resumeText]
            .filter(Boolean)
            .join('\n'),
        );

      let coverLetterContent = application.coverLetterText;
      let effectiveLanguage: TranslationLanguage = targetLanguage;

      if (targetLanguage !== sourceLanguage) {
        const translated = await this.resolveTranslation(
          application.id,
          userId,
          resumeData,
          application.coverLetterText,
          application.translations as unknown as StoredTranslations | null,
          sourceLanguage,
          targetLanguage,
        );
        if (translated) {
          resumeData = translated.resume;
          coverLetterContent = hasCoverLetter
            ? (translated.coverLetter ?? application.coverLetterText)
            : application.coverLetterText;
        } else {
          effectiveLanguage = sourceLanguage;
          this.logger.warn(
            `Application ${applicationId}: translation ${sourceLanguage}→${targetLanguage} ` +
              `unavailable — exporting consistently in ${sourceLanguage}`,
          );
        }
      }

      // 3. Localize date labels deterministically (re-derived from raw ISO
      // dates when present, token-mapped on legacy rows) — no LLM involved.
      resumeData = localizeStoredResumeDates(resumeData, effectiveLanguage);

      // 4. Convert to PDFs
      this.logger.log('Converting templates to PDFs...');

      let coverLetterKey: string | null = null;

      // Only generate cover letter PDF if content exists
      if (hasCoverLetter) {
        // Resolve template ID to match selected language
        let coverLetterTemplateId = application.coverLetterTemplateId;
        if (coverLetterTemplateId) {
          coverLetterTemplateId = await this.resolveTemplateForLanguage(
            coverLetterTemplateId,
            effectiveLanguage,
            'COVER_LETTER',
          );
        }

        const coverLetterTemplateData = {
          candidateName: resumeData.candidateName,
          targetJobTitle: application.targetJobTitle || application.jobPosting.title,
          email: resumeData.email || application.user.email,
          phone: resumeData.phone,
          linkedin: resumeData.linkedin,
          github: resumeData.github,
          // Address fields
          street: resumeData.street,
          postalCode: resumeData.postalCode,
          city: resumeData.city,
          country: resumeData.country,
          fullAddress: resumeData.fullAddress,
          companyName: application.jobPosting.company,
          content: coverLetterContent!, // Non-null assertion: hasCoverLetter ensures this is defined
          language: effectiveLanguage,
        };

        // Generate cover letter PDF using database template (which are already ATS-optimized)
        const coverLetterPdf = await this.pdfService.generateCoverLetterPDF(
          coverLetterTemplateData,
          coverLetterTemplateId || undefined,
          { atsOptimized: false }, // Use DB template instead of filesystem template
        );

        // Upload cover letter to storage
        coverLetterKey = await this.storageService.upload(
          `applications/${applicationId}/cover-letter.pdf`,
          coverLetterPdf,
          'application/pdf',
        );
      }

      // Resolve template ID to match selected language
      let resumeTemplateId = application.resumeTemplateId;
      if (resumeTemplateId) {
        resumeTemplateId = await this.resolveTemplateForLanguage(
          resumeTemplateId,
          effectiveLanguage,
          'RESUME',
        );
      }

      // Add selected language and target job title to resume data
      const resumeDataWithLanguage = {
        ...resumeData,
        targetJobTitle:
          resumeData.targetJobTitle ||
          application.targetJobTitle ||
          application.jobPosting.title,
        language: effectiveLanguage,
      };

      // Generate resume PDF using database template (which are already ATS-optimized)
      const resumePdf = await this.pdfService.generateResumePDF(
        resumeDataWithLanguage,
        resumeTemplateId || undefined,
        { atsOptimized: false }, // Use DB template instead of filesystem template
      );

      // 5. Upload resume to Storage
      this.logger.log('Uploading to storage...');
      const resumeKey = await this.storageService.upload(
        `applications/${applicationId}/resume.pdf`,
        resumePdf,
        'application/pdf',
      );

      // 6. Update Application with results
      await this.prisma.application.update({
        where: { id: applicationId },
        data: {
          status: 'READY',
          coverLetterFileKey: coverLetterKey,
          resumeFileKey: resumeKey,
        },
      });

      this.logger.log(
        `Application ${applicationId} completed successfully (coverLetter: ${hasCoverLetter}, language: ${effectiveLanguage})`,
      );
    } catch (error) {
      this.logger.error(`Application ${applicationId} failed: ${error.message}`, error.stack);

      // Update application status to FAILED
      await this.prisma.application.update({
        where: { id: applicationId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });

      throw error; // Re-throw for retry logic
    }
  }

  /**
   * Resolve the translated content for a cross-language export: serve the
   * hash-valid cache entry when present, otherwise translate now and persist
   * the result. Returns `null` when translation is unavailable (guard
   * rejection / LLM failure) — a failure marker is persisted so the API can
   * surface the fallback and the next export retries.
   */
  private async resolveTranslation(
    applicationId: string,
    userId: string,
    resumeData: ResumeTemplateData,
    coverLetterText: string | null,
    stored: StoredTranslations | null,
    sourceLanguage: TranslationLanguage,
    targetLanguage: TranslationLanguage,
  ): Promise<{ resume: ResumeTemplateData; coverLetter: string | null } | null> {
    const sourceHash = await calculateContentHash(
      JSON.stringify(resumeData),
      coverLetterText || '',
    );

    const cached = stored?.[targetLanguage];
    if (cached?.resume && cached.sourceHash === sourceHash) {
      this.logger.log(
        `Application ${applicationId}: using cached ${targetLanguage} translation`,
      );
      return {
        resume: cached.resume as unknown as ResumeTemplateData,
        coverLetter: cached.coverLetter ?? null,
      };
    }

    this.logger.log(
      `Application ${applicationId}: translating content ${sourceLanguage}→${targetLanguage}...`,
    );
    const context = { userId, applicationId };
    const [translatedResume, translatedCoverLetter] = await Promise.all([
      this.translationService.translateResume(resumeData, sourceLanguage, targetLanguage, context),
      coverLetterText
        ? this.translationService.translateCoverLetter(
            coverLetterText,
            sourceLanguage,
            targetLanguage,
            context,
          )
        : Promise.resolve(null),
    ]);

    // Both documents must translate (all-or-nothing): shipping a translated
    // résumé next to an untranslated cover letter would be exactly the
    // mixed-language failure this fix removes.
    const success = !!translatedResume && (!coverLetterText || !!translatedCoverLetter);

    const entry: StoredTranslationEntry = success
      ? {
          resume: translatedResume as unknown as StoredTranslationEntry['resume'],
          coverLetter: coverLetterText ? translatedCoverLetter : null,
          sourceHash,
          cachedAt: new Date().toISOString(),
        }
      : { sourceHash, failedAt: new Date().toISOString() };

    await this.persistTranslationEntry(applicationId, stored, targetLanguage, entry);

    if (!success) {
      return null;
    }
    return {
      resume: translatedResume as ResumeTemplateData,
      coverLetter: coverLetterText ? (translatedCoverLetter as string) : null,
    };
  }

  /** Best-effort cache write — a failure here must never fail the export. */
  private async persistTranslationEntry(
    applicationId: string,
    stored: StoredTranslations | null,
    targetLanguage: TranslationLanguage,
    entry: StoredTranslationEntry,
  ): Promise<void> {
    try {
      const translations: StoredTranslations = { ...(stored ?? {}), [targetLanguage]: entry };
      await this.prisma.application.update({
        where: { id: applicationId },
        data: { translations: translations as object },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to persist translation cache for application ${applicationId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Resolve template ID to language-specific variant
   */
  private async resolveTemplateForLanguage(
    templateId: string,
    language: string,
    type: 'COVER_LETTER' | 'RESUME',
  ): Promise<string | null> {
    try {
      // Get the selected template to find its category
      const selectedTemplate = await this.prisma.template.findUnique({
        where: { id: templateId },
        select: { category: true, language: true },
      });

      if (!selectedTemplate) {
        this.logger.warn(`Template ${templateId} not found, keeping original`);
        return templateId;
      }

      // If template already matches the language, use it
      if (selectedTemplate.language === language) {
        this.logger.debug(`Template ${templateId} already matches language ${language}`);
        return templateId;
      }

      // Find the same design in the target language
      const languageVariant = await this.templatesService.findByCategoryAndLanguage(
        selectedTemplate.category,
        language,
        type,
      );

      if (languageVariant) {
        this.logger.log(
          `Resolved template ${templateId} (${selectedTemplate.category}) to ${languageVariant.id} for language ${language}`,
        );
        return languageVariant.id;
      }

      // Fallback: keep original template
      this.logger.warn(
        `No ${language} variant found for ${selectedTemplate.category}, keeping original`,
      );
      return templateId;
    } catch (error) {
      this.logger.error(`Failed to resolve template: ${error.message}`);
      return templateId; // Fallback to original
    }
  }
}
