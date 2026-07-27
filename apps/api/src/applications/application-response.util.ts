import type { ApplicationResponseDto, ApplicationStatus } from './dto/application-response.dto';
import { normalizeTemplateSettings } from '../pdf-v2/design-tokens';

/**
 * Application → response-DTO mapping — pure helpers shared by
 * GenerationService and ApplicationsService. Extracted from
 * `ApplicationsService` during the GenerationService split so both services
 * produce byte-identical responses without one delegating to the other.
 */

/**
 * Derive the user-facing export warning from the translation cache: when
 * the last export's target language has a failed translation attempt (and
 * no successful one), the PDFs were rendered in the source language as a
 * consistent fallback — the client should tell the user.
 */
function deriveExportWarning(application: {
  translations?: unknown;
  language?: string | null;
}): string | undefined {
  const { translations, language } = application;
  if (!translations || typeof translations !== 'object' || !language) return undefined;
  const entry = (translations as Record<string, { resume?: unknown; failedAt?: string }>)[
    language
  ];
  if (entry && entry.failedAt && !entry.resume) {
    return 'TRANSLATION_FALLBACK';
  }
  return undefined;
}

/**
 * Map Prisma model to DTO
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- pre-existing shape: accepts full rows AND lean list selects (moved as-is from ApplicationsService)
export function mapApplicationToResponseDto(application: any): ApplicationResponseDto {
  return {
    id: application.id,
    userId: application.userId,
    jobPostingId: application.jobPostingId,
    title: application.title,
    targetJobTitle: application.targetJobTitle,
    applicationStatus: application.applicationStatus,
    statusUpdatedAt: application.statusUpdatedAt,
    statusSource: application.statusSource,
    status: application.status as ApplicationStatus,
    notes: application.notes,
    coverLetterText: application.coverLetterText,
    resumeText: application.resumeText,
    coverLetterFileKey: application.coverLetterFileKey,
    resumeFileKey: application.resumeFileKey,
    coverLetterTemplateId: application.coverLetterTemplateId,
    resumeTemplateId: application.resumeTemplateId,
    language: application.language,
    sourceLanguage: application.sourceLanguage,
    coverLetterLength: application.coverLetterLength,
    templateSettings: normalizeTemplateSettings(application.templateSettings) ?? null,
    exportWarning: deriveExportWarning(application),
    errorMessage: application.errorMessage,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    atsKeywords: application.atsKeywords,
    tailoredProfile: application.tailoredProfile,
    jobPosting: application.jobPosting
      ? {
          id: application.jobPosting.id,
          title: application.jobPosting.title,
          company: application.jobPosting.company,
          location: application.jobPosting.location,
          description: application.jobPosting.description,
        }
      : undefined,
  };
}
