import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
  MessageEvent,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { Application } from '../generated/prisma/client';
import { ApplicationTrackingStatus } from '../generated/prisma/client';
import { Observable, timer } from 'rxjs';
import { map, switchMap, takeWhile } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { StorageService } from '../storage/storage.service';
import { JobType } from '../jobs/interfaces/queue.interface';
import { LLMService } from '../llm/llm.service';
import { KeywordsService } from '../keywords/keywords.service';
import { GenerationService } from './generation.service';
import { ATSAgentOutput } from '../keywords/keywords.types';
import { ApplicationResponseDto, ApplicationStatus } from './dto/application-response.dto';
import { ApplicationFilesResponseDto } from './dto/application-files-response.dto';
import { ApplicationStatusResponseDto } from './dto/application-status-response.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { UpdateTemplateSettingsDto } from './dto/update-template-settings.dto';
import { CoverLetterDto } from './dto/cover-letter.dto';
import { ApplicationKeywordsResponseDto } from './dto/application-keywords.dto';
import { ErrorCode } from '../common/constants/error-codes';
import {
  BadRequestWithCode,
  NotFoundWithCode,
} from '../common/exceptions/coded-http.exception';
import { assertPromptWithinLimits } from '../common/guardrails/prompt-guardrail';
import { type TemplateSettings } from '@applo/shared';
import { normalizeTemplateSettings } from '../pdf-v2/design-tokens';
import {
  ProfileWithRelations,
  sanitizeUrl,
  normalizeProficiencyLevel,
} from './resume-template.util';
import { serializeJobPostingForLlm } from './serialize.util';
import { buildMatchInsights } from './match-insights.util';
import { mapStoredResumeToTailoredProfile } from './stored-resume.util';
import { buildSalutation, normalizeJobFacts } from './job-facts.util';
import { resolveCoverLetterBudget, resolveCoverLetterTargetMin } from './constants';
import type { TranslationLanguage } from './translation/translation.service';
import { sanitizeRichText, stripLLMPlaceholders } from '../common/services/html-sanitizer';
import { convertCoverLetterToHtml } from './cover-letter-html.util';
import { mapApplicationToResponseDto } from './application-response.util';
import { SubscriptionService } from '../subscription/subscription.service';
import { SubscriptionTier } from '../generated/prisma/client';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
    private readonly storageService: StorageService,
    private readonly llmService: LLMService,
    private readonly keywordsService: KeywordsService,
    private readonly generationService: GenerationService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  private sanitizeCoverLetter(content: string): string {
    // First strip any LLM placeholder patterns (e.g., "[Your Name]")
    const stripped = stripLLMPlaceholders(content);
    // Then sanitize HTML
    return sanitizeRichText(stripped);
  }

  private parseResume(resumeText?: string | null) {
    if (!resumeText) {
      return null;
    }

    try {
      return JSON.parse(resumeText);
    } catch (error) {
      this.logger.error('Failed to parse stored resume JSON', error as Error);
      throw new BadRequestWithCode(ErrorCode.APPLICATION_RESUME_CORRUPTED);
    }
  }

  private async ensureApplicationOwnership(
    userId: string,
    applicationId: string,
    includeJobPosting = false,
  ) {
    const application = await this.prisma.application.findFirst({
      where: {
        id: applicationId,
        userId,
      },
      include: {
        jobPosting: includeJobPosting,
      },
    });

    if (!application) {
      throw new NotFoundWithCode(ErrorCode.APPLICATION_NOT_FOUND);
    }

    return application;
  }

  private async cleanupGeneratedFiles(application: Application): Promise<void> {
    const deletions: Promise<void>[] = [];

    if (application.coverLetterFileKey) {
      deletions.push(
        this.storageService.delete(application.coverLetterFileKey).catch((error) => {
          this.logger.warn(
            `Failed to delete cover letter file ${application.coverLetterFileKey}: ${error.message}`,
          );
        }),
      );
    }

    if (application.resumeFileKey) {
      deletions.push(
        this.storageService.delete(application.resumeFileKey).catch((error) => {
          this.logger.warn(
            `Failed to delete resume file ${application.resumeFileKey}: ${error.message}`,
          );
        }),
      );
    }

    await Promise.all(deletions);
  }

  private normalizeResumeData(resume: UpdateResumeDto['resume']) {
    const trim = (value?: string | null) => value?.trim() || undefined;

    // Recompute fullAddress from the structured components so the stored value
    // is always authoritative (the editor edits street/postalCode/city/country
    // in the Kontaktdaten popover). Falls back to any client-sent fullAddress.
    const street = trim(resume.street);
    const postalCode = trim(resume.postalCode);
    const city = trim(resume.city);
    const country = trim(resume.country);
    const addressParts: string[] = [];
    if (street) addressParts.push(street);
    if (postalCode || city) addressParts.push([postalCode, city].filter(Boolean).join(' '));
    if (country) addressParts.push(country);
    const fullAddress = addressParts.join(', ') || trim(resume.fullAddress);

    return {
      candidateName: resume.candidateName.trim(),
      targetJobTitle: trim(resume.targetJobTitle),
      email: resume.email.trim(),
      phone: trim(resume.phone),
      location: trim(resume.location),
      street,
      postalCode,
      city,
      country,
      fullAddress,
      linkedin: sanitizeUrl(resume.linkedin),
      github: sanitizeUrl(resume.github),
      summary: trim(resume.summary),
      skillCategories: (resume.skillCategories || [])
        .map((category) => ({
          type: category.type.trim(),
          skills: (category.skills || []).map((skill) => skill.trim()).filter(Boolean),
        }))
        .filter((category) => category.skills.length),
      experiences: (resume.experiences || []).map(({ id: _id, ...experience }) => ({
        title: experience.title.trim(),
        company: experience.company.trim(),
        location: trim(experience.location),
        dateRange: experience.dateRange.trim(),
        // Preserve the raw ISO dates so exports can re-derive `dateRange`
        // in the target language (see resume-date-localizer.util.ts).
        startDate: trim(experience.startDate),
        endDate: trim(experience.endDate),
        isCurrent: experience.isCurrent === true ? true : undefined,
        description: trim(experience.description),
        achievements: (experience.achievements || []).map((item) => item.trim()).filter(Boolean),
      })),
      projects: (resume.projects || []).map(({ id: _id, ...project }) => ({
        name: project.name.trim(),
        description: trim(project.description),
        date: trim(project.date),
        startDate: trim(project.startDate),
        highlights: (project.highlights || []).map((item) => item.trim()).filter(Boolean),
      })),
      education: (resume.education || []).map(({ id: _id, ...edu }) => ({
        degree: edu.degree.trim(),
        institution: edu.institution.trim(),
        year: edu.year.trim(),
        startDate: trim(edu.startDate),
        endDate: trim(edu.endDate),
        fieldOfStudy: trim(edu.fieldOfStudy),
        gpa: trim(edu.gpa),
        description: trim(edu.description),
      })),
      certifications: (resume.certifications || []).map(({ id: _id, ...cert }) => ({
        name: cert.name.trim(),
        issuer: cert.issuer.trim(),
        date: trim(cert.date),
      })),
      languages: (resume.languages || [])
        .map((lang) => ({
          name: lang.name.trim(),
          level: normalizeProficiencyLevel(lang.level?.trim()),
        }))
        .filter((lang) => lang.name),
      // User-chosen section order — keep only known keys; undefined (not [])
      // when absent so pre-existing records keep the template default order.
      sectionOrder: resume.sectionOrder?.filter((key) =>
        ['profile', 'experience', 'education', 'projects', 'skills', 'languages', 'certs'].includes(
          key,
        ),
      ),
    };
  }

  private ensureNotGenerating(application: Application) {
    if (application.status === ApplicationStatus.GENERATING) {
      throw new BadRequestWithCode(ErrorCode.APPLICATION_GENERATING);
    }
  }

  /**
   * Convert new atsKeywords format (from single-LLM pipeline) to old ATSAgentOutput format
   * New format (SIMPLIFIED): { hard_skills: [{keyword, source, priority}] }
   * Old format: { coreCompetencies: [], softSkills: [], methodologies: [], ... }
   * IMPORTANT: Preserve metadata (keyword, source, priority) for proper matching
   * Note: Only hard_skills are extracted now, soft_skills removed
   */
  private convertAtsKeywordsToOldFormat(atsKeywords: any): ATSAgentOutput {
    this.logger.debug(
      `Converting ATS keywords to old format. Input keys: ${Object.keys(atsKeywords).join(', ')}`,
    );

    // Preserve full keyword objects with metadata (source, priority)
    const hardSkills = (atsKeywords.hard_skills || []).map((kw: any) => {
      if (typeof kw === 'string') {
        return { keyword: kw, source: 'job', priority: 2 };
      }
      return kw; // Already has { keyword, source, priority }
    });

    this.logger.debug(`Converted: ${hardSkills.length} hard skills`);
    this.logger.debug(
      `Hard skills: ${hardSkills
        .slice(0, 5)
        .map((k) => k.keyword)
        .join(', ')}${hardSkills.length > 5 ? '...' : ''}`,
    );

    return {
      coreCompetencies: hardSkills, // All hard skills go here with metadata
      softSkills: [], // No longer extracting soft skills
      responsibilityKeywords: [], // Empty to avoid duplicates
      requirementKeywords: [], // Empty to avoid duplicates
      methodologies: [], // Empty to avoid duplicates
      industryKeywords: [], // Empty to avoid duplicates
      senioritySignals: [], // Empty to avoid duplicates
      miscKeywords: [], // Empty to avoid duplicates
    };
  }

  async updateResume(
    userId: string,
    applicationId: string,
    dto: UpdateResumeDto,
  ): Promise<ApplicationResponseDto> {
    this.logger.log(`Updating resume for application ${applicationId}`);

    const application = await this.ensureApplicationOwnership(userId, applicationId, true);
    this.ensureNotGenerating(application);

    const normalized = this.normalizeResumeData(dto.resume);

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        resumeText: JSON.stringify(normalized),
        // Keep the dedicated targetJobTitle column (read by the PDF export and
        // list views) in sync with the role edited in the résumé header so the
        // exported document matches what the user sees in the editor.
        ...(normalized.targetJobTitle ? { targetJobTitle: normalized.targetJobTitle } : {}),
      },
      include: {
        jobPosting: true,
      },
    });

    // IMPORTANT: After saving resume, automatically re-match keywords against updated resume
    // This ensures ATS score reflects the latest changes without requiring manual refresh
    if (application.atsKeywords) {
      this.logger.log(
        `Resume updated for application ${applicationId}, re-matching keywords against new resume`,
      );
      try {
        // Convert cached keywords to old format
        const keywords = this.convertAtsKeywordsToOldFormat(application.atsKeywords as any);

        // Extract keywords from the newly saved resume
        const resumeKeywords = this.extractResumeKeywords(JSON.stringify(normalized));

        // Match keywords
        const { matchedKeywords, missingKeywords } = this.matchKeywords(keywords, resumeKeywords);
        const matchAnalysis = this.calculateMatchAnalysis(
          matchedKeywords,
          missingKeywords,
          keywords,
          { targetRole: application.jobPosting?.title },
        );

        // Update the cached analysis data
        const analysisData = {
          keywords,
          matchAnalysis,
          matchedKeywords,
          missingKeywords,
          analyzedAt: new Date(),
        };

        await this.prisma.application.update({
          where: { id: applicationId },
          data: { keywordsData: JSON.stringify(analysisData) },
        });

        this.logger.log(
          `ATS score updated for application ${applicationId}: ${matchAnalysis.overallScore}% match (${matchedKeywords.length}/${matchedKeywords.length + missingKeywords.length} keywords)`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to auto-update ATS score after resume save for application ${applicationId}`,
          error,
        );
      }
    }

    return mapApplicationToResponseDto(updated);
  }

  async upsertCoverLetter(
    userId: string,
    applicationId: string,
    dto: CoverLetterDto,
  ): Promise<ApplicationResponseDto> {
    this.logger.log(`Updating cover letter for application ${applicationId}`);

    const application = await this.ensureApplicationOwnership(userId, applicationId, true);
    this.ensureNotGenerating(application);

    if (dto.regenerate && !(await this.subscriptionService.hasTier(userId, SubscriptionTier.PRO))) {
      throw new ForbiddenException('KI-Anschreiben-Generierung ist ab Pro verfügbar.');
    }

    // Guardrail: enforce char/token limits on the AI instructions (issue #520)
    assertPromptWithinLimits(dto.instructions, 'editModeAssistant');

    const resume = this.parseResume(application.resumeText);
    if (!resume) {
      throw new BadRequestWithCode(ErrorCode.APPLICATION_NO_RESUME);
    }

    const jobPosting = application.jobPosting;
    if (!jobPosting) {
      throw new BadRequestWithCode(ErrorCode.APPLICATION_NO_JOB);
    }

    let content = dto.content;

    // If regenerate is true and instructions are provided, modify existing content
    if (dto.regenerate && dto.instructions && dto.content) {
      this.logger.log('Modifying cover letter with AI based on instructions');
      const modified = await this.llmService.modifyCoverLetterContent(
        dto.content,
        dto.instructions,
        {
          jobTitle: jobPosting.title,
          companyName: jobPosting.company || 'Unknown Company',
        },
      );
      // modifyCoverLetterContent returns Markdown — convert it to HTML like the
      // fresh-regenerate branch below, otherwise the editor receives raw Markdown
      // and renders it as a monospaced code block with double-escaped entities.
      content = convertCoverLetterToHtml(modified) ?? modified;
    }
    // If no content or regenerate without existing content, generate fresh using
    // the v1 pipeline prompt — the same prompt the initial-generation path uses —
    // so edit-mode regenerate gets the #1/#5/#6 quality improvements (editor pass,
    // job-facts personalization, keyword coverage) instead of the retired
    // cover-letter-ats.md path. The stored resume is already tailored, so we map
    // it straight into the TailoredProfileDto shape (no extra skill-selector call).
    else if (dto.regenerate) {
      this.logger.log('Regenerating cover letter via v1 pipeline prompt');
      const language =
        jobPosting.language || this.generationService.detectLanguage(jobPosting.fullText) || 'en';
      const lengthBudget = resolveCoverLetterBudget(application.coverLetterLength);
      const tailoredProfile = mapStoredResumeToTailoredProfile(resume, jobPosting);
      const jobFacts = await this.generationService.extractJobFacts(jobPosting, language, userId);
      const markdown = await this.llmService.callText('v1/cover-letter.md', {
        job: serializeJobPostingForLlm(jobPosting),
        tailoredProfile,
        jobFacts: normalizeJobFacts(jobFacts),
        salutation: buildSalutation(jobFacts, language),
        language,
        lengthBudget,
        lengthTargetMin: resolveCoverLetterTargetMin(lengthBudget),
        userId,
        jobPostingId: jobPosting.id,
      });
      // Length governor: same guarded shorten pass as the generation pipelines,
      // so edit-mode regeneration honors the stored length preference too.
      const governed = await this.generationService.runLengthGovernorPass(
        markdown,
        application.atsKeywords,
        tailoredProfile,
        language,
        lengthBudget,
        userId,
        jobPosting,
      );
      content = convertCoverLetterToHtml(governed) ?? governed ?? markdown;
    }

    if (content === undefined) {
      throw new BadRequestException('content ist erforderlich, wenn regenerate nicht gesetzt ist.');
    }

    const sanitizedContent = this.sanitizeCoverLetter(content);

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        coverLetterText: sanitizedContent,
      },
      include: {
        jobPosting: true,
      },
    });

    return mapApplicationToResponseDto(updated);
  }

  /**
   * Generate or modify professional summary using AI
   * Uses job posting and profile context to tailor the summary
   * Returns generated summary (not persisted - user applies manually in editor)
   */
  async generateSummary(
    userId: string,
    applicationId: string,
    dto: { instructions: string; currentSummary?: string; regenerate?: boolean },
  ): Promise<{ summary: string }> {
    this.logger.log(`Generating summary for application ${applicationId}`);

    const application = await this.ensureApplicationOwnership(userId, applicationId, true);

    // Guardrail: enforce char/token limits on the AI instructions (issue #520)
    assertPromptWithinLimits(dto.instructions, 'editModeAssistant');

    const jobPosting = application.jobPosting;
    if (!jobPosting) {
      throw new BadRequestWithCode(ErrorCode.APPLICATION_NO_JOB);
    }

    // Load profile with relations for context
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        skills: true,
        experiences: true,
      },
    });

    // Build context from profile
    const skills = profile?.skills?.map((s) => s.name) || [];
    const experiences =
      profile?.experiences?.map((exp) => ({
        title: exp.title,
        company: exp.company,
        description: exp.description || undefined,
      })) || [];

    // Generate/modify summary with LLM
    const summary = await this.llmService.modifySummaryContent(
      dto.currentSummary,
      dto.instructions,
      {
        jobTitle: jobPosting.title,
        companyName: jobPosting.company || 'Unknown Company',
        jobDescription: jobPosting.fullText || undefined,
        skills,
        experiences,
      },
    );

    return { summary };
  }

  /**
   * Generate or modify experience description using AI
   * Uses job posting context to tailor bullet points with action verbs and metrics
   * Returns generated HTML description (not persisted - user applies manually in editor)
   */
  async generateExperienceDescription(
    userId: string,
    applicationId: string,
    dto: {
      instructions: string;
      experienceIndex: number;
      currentDescription?: string;
      experienceTitle: string;
      experienceCompany: string;
      experienceDateRange?: string;
      regenerate?: boolean;
    },
  ): Promise<{ description: string }> {
    this.logger.log(
      `Generating experience description for application ${applicationId}, experience index ${dto.experienceIndex}`,
    );

    const application = await this.ensureApplicationOwnership(userId, applicationId, true);

    // Guardrail: enforce char/token limits on the AI instructions (issue #520)
    assertPromptWithinLimits(dto.instructions, 'editModeAssistant');

    const jobPosting = application.jobPosting;
    if (!jobPosting) {
      throw new BadRequestWithCode(ErrorCode.APPLICATION_NO_JOB);
    }

    // Load profile for skills context
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        skills: true,
      },
    });

    const skills = profile?.skills?.map((s) => s.name) || [];

    // Generate/modify experience description with LLM
    const description = await this.llmService.modifyExperienceDescription(
      dto.currentDescription,
      dto.instructions,
      {
        experienceTitle: dto.experienceTitle,
        experienceCompany: dto.experienceCompany,
        experienceDateRange: dto.experienceDateRange,
        jobTitle: jobPosting.title,
        companyName: jobPosting.company || 'Unknown Company',
        jobDescription: jobPosting.fullText || undefined,
        skills,
      },
    );

    return { description };
  }

  /**
   * Generate or modify project description using AI
   * Uses job posting context to tailor bullet points with technologies and impact
   * Returns generated HTML description (not persisted - user applies manually in editor)
   */
  async generateProjectDescription(
    userId: string,
    applicationId: string,
    dto: {
      instructions: string;
      projectIndex: number;
      currentDescription?: string;
      projectName: string;
      projectDate?: string;
      regenerate?: boolean;
    },
  ): Promise<{ description: string }> {
    this.logger.log(
      `Generating project description for application ${applicationId}, project index ${dto.projectIndex}`,
    );

    const application = await this.ensureApplicationOwnership(userId, applicationId, true);

    // Guardrail: enforce char/token limits on the AI instructions (issue #520)
    assertPromptWithinLimits(dto.instructions, 'editModeAssistant');

    const jobPosting = application.jobPosting;
    if (!jobPosting) {
      throw new BadRequestWithCode(ErrorCode.APPLICATION_NO_JOB);
    }

    // Load profile for skills context
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        skills: true,
      },
    });

    const skills = profile?.skills?.map((s) => s.name) || [];

    // Generate/modify project description with LLM
    const description = await this.llmService.modifyProjectDescription(
      dto.currentDescription,
      dto.instructions,
      {
        projectName: dto.projectName,
        projectDate: dto.projectDate,
        jobTitle: jobPosting.title,
        companyName: jobPosting.company || 'Unknown Company',
        jobDescription: jobPosting.fullText || undefined,
        skills,
      },
    );

    return { description };
  }

  async requestExport(
    userId: string,
    applicationId: string,
    language?: TranslationLanguage,
  ): Promise<ApplicationResponseDto> {
    this.logger.log(
      `Export requested for application ${applicationId} with language: ${language || 'default'}`,
    );

    const application = await this.ensureApplicationOwnership(userId, applicationId, true);
    this.ensureNotGenerating(application);

    const resume = this.parseResume(application.resumeText);
    if (!resume) {
      throw new BadRequestWithCode(ErrorCode.APPLICATION_NO_RESUME);
    }

    // Cover letter is optional - user may have opted out during creation
    // Log whether we're exporting with or without cover letter
    if (!application.coverLetterText) {
      this.logger.log(
        `Exporting application ${applicationId} without cover letter (user opted out)`,
      );
    }

    await this.cleanupGeneratedFiles(application);

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.GENERATING,
        generationProgress: 0,
        generationMessage: null,
        coverLetterFileKey: null,
        resumeFileKey: null,
        errorMessage: null,
        // Persist the requested language so the editor badge and subsequent
        // exports/retries stay consistent with the last exported PDFs.
        ...(language ? { language } : {}),
      },
      include: {
        jobPosting: true,
      },
    });

    await this.jobsService.publishJob(JobType.APPLICATION_GENERATE, {
      applicationId,
      userId,
      jobPostingId: application.jobPostingId,
      language, // Pass selected language to job worker
    });

    return mapApplicationToResponseDto(updated);
  }

  /**
   * Retry PDF generation for failed applications
   *
   * Only allows retry if application status is FAILED.
   * Resets application state and re-enqueues the generation job.
   */
  async regenerate(applicationId: string, userId: string): Promise<ApplicationResponseDto> {
    this.logger.log(`Regenerating failed application ${applicationId} for user ${userId}`);

    // 1. Verify ownership and get application
    const application = await this.ensureApplicationOwnership(userId, applicationId, true);

    // 2. Only allow retry if status is FAILED
    if (application.status !== ApplicationStatus.FAILED) {
      throw new BadRequestWithCode(ErrorCode.APPLICATION_NOT_FAILED);
    }

    // 3. Verify we have resume data (required for export)
    const resume = this.parseResume(application.resumeText);
    if (!resume) {
      throw new BadRequestWithCode(ErrorCode.APPLICATION_NO_RESUME);
    }

    // 4. Clean up any old files from failed attempt
    await this.cleanupGeneratedFiles(application);

    // 5. Reset status to GENERATING and clear error message
    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.GENERATING,
        generationProgress: 0,
        generationMessage: null,
        coverLetterFileKey: null,
        resumeFileKey: null,
        errorMessage: null,
      },
      include: {
        jobPosting: true,
      },
    });

    // 6. Re-enqueue the generation job
    await this.jobsService.publishJob(JobType.APPLICATION_GENERATE, {
      applicationId,
      userId,
      jobPostingId: application.jobPostingId,
    });

    this.logger.log(`Application ${applicationId} re-enqueued for generation`);

    return mapApplicationToResponseDto(updated);
  }

  /**
   * Get a single application by ID
   *
   * Uses Prisma's `include` to prevent N+1 queries when job posting is requested
   */
  async findOne(
    userId: string,
    applicationId: string,
    includeJobPosting = false,
  ): Promise<ApplicationResponseDto> {
    const application = await this.prisma.application.findFirst({
      where: {
        id: applicationId,
        userId, // Security: Only return user's own applications
      },
      include: {
        // Eagerly load job posting to prevent N+1 queries
        jobPosting: includeJobPosting,
      },
    });

    if (!application) {
      throw new NotFoundWithCode(ErrorCode.APPLICATION_NOT_FOUND);
    }

    return mapApplicationToResponseDto(application);
  }

  /**
   * Get all applications for a user with pagination
   *
   * Uses Prisma's `include` to prevent N+1 query problems:
   * - Eager loads job posting when requested (single JOIN query)
   * - Uses Promise.all for parallel count query
   * - Results in 2 queries total (1 for data + 1 for count), not 1+N
   *
   * Supports soft delete filtering via includeDeleted parameter
   */
  async findAll(
    userId: string,
    includeJobPosting = false,
    page = 1,
    limit = 20,
    includeDeleted = false,
  ): Promise<{ items: ApplicationResponseDto[]; pagination: any }> {
    const whereClause = {
      userId,
      // Filter out soft-deleted items unless explicitly requested
      deletedAt: includeDeleted ? undefined : null,
    };

    const [applications, total] = await Promise.all([
      this.prisma.application.findMany({
        where: whereClause,
        // Lean select for list view: skip the large generated text + JSON
        // blobs (coverLetterText, resumeText, keywordsData, matchDetails,
        // atsKeywords, tailoredProfile). Detail/edit pages re-fetch via
        // GET /applications/:id which still returns the full row.
        // Saves ~70–90% Neon egress per dashboard load.
        select: {
          id: true,
          userId: true,
          jobPostingId: true,
          title: true,
          targetJobTitle: true,
          applicationStatus: true,
          statusUpdatedAt: true,
          statusSource: true,
          status: true,
          notes: true,
          coverLetterFileKey: true,
          resumeFileKey: true,
          coverLetterTemplateId: true,
          resumeTemplateId: true,
          language: true,
          errorMessage: true,
          matchScore: true,
          createdAt: true,
          updatedAt: true,
          jobPosting: includeJobPosting
            ? {
                select: {
                  id: true,
                  title: true,
                  company: true,
                  location: true,
                },
              }
            : false,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.application.count({
        where: whereClause,
      }),
    ]);

    return {
      items: applications.map((app) => mapApplicationToResponseDto(app)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get download URLs for application files
   */
  async getFiles(userId: string, applicationId: string): Promise<ApplicationFilesResponseDto> {
    const application = await this.prisma.application.findFirst({
      where: {
        id: applicationId,
        userId,
      },
    });

    if (!application) {
      throw new NotFoundWithCode(ErrorCode.APPLICATION_NOT_FOUND);
    }

    if (application.status !== 'READY') {
      throw new BadRequestException(
        `Application is not ready. Current status: ${application.status}`,
      );
    }

    const response: ApplicationFilesResponseDto = {
      applicationId: application.id,
    };

    // Generate SAS URLs for files (1 hour expiry)
    const expiresIn = 15 * 60; // 15 minutes in seconds (was 1h — reduced
    // to limit the window of risk if a download URL leaks via chat,
    // browser history, or email forwarding. 15 min covers the
    // "click-download" use case comfortably.

    if (application.coverLetterFileKey) {
      const url = await this.storageService.getSignedUrl(application.coverLetterFileKey, expiresIn);

      response.coverLetter = {
        key: application.coverLetterFileKey,
        filename: `${application.id}-cover-letter.pdf`,
        mimeType: 'application/pdf',
        url,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      };
    }

    if (application.resumeFileKey) {
      const url = await this.storageService.getSignedUrl(application.resumeFileKey, expiresIn);

      response.resume = {
        key: application.resumeFileKey,
        filename: `${application.id}-resume.pdf`,
        mimeType: 'application/pdf',
        url,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      };
    }

    return response;
  }

  /**
   * Get file stream for download
   */
  async getFileStream(
    userId: string,
    applicationId: string,
    fileType: 'cover-letter' | 'resume',
    beforeRead?: () => Promise<void>,
  ): Promise<Buffer> {
    const application = await this.prisma.application.findFirst({
      where: {
        id: applicationId,
        userId,
      },
    });

    if (!application) {
      throw new NotFoundWithCode(ErrorCode.APPLICATION_NOT_FOUND);
    }

    if (application.status !== 'READY') {
      throw new BadRequestException(
        `Application is not ready. Current status: ${application.status}`,
      );
    }

    const fileKey =
      fileType === 'cover-letter' ? application.coverLetterFileKey : application.resumeFileKey;

    if (!fileKey) {
      throw new NotFoundWithCode(ErrorCode.APPLICATION_NOT_FOUND);
    }

    await beforeRead?.();

    // Get file from storage
    return this.storageService.getFile(fileKey);
  }

  /**
   * Soft delete an application (sets deletedAt timestamp)
   * The application can be restored within 30 days before permanent deletion
   */
  async delete(userId: string, applicationId: string): Promise<void> {
    this.logger.log(`Soft deleting application ${applicationId} for user ${userId}`);

    // Find application (verify ownership)
    const application = await this.prisma.application.findFirst({
      where: {
        id: applicationId,
        userId,
        deletedAt: null, // Can only soft delete non-deleted applications
      },
    });

    if (!application) {
      throw new NotFoundWithCode(ErrorCode.APPLICATION_NOT_FOUND);
    }

    // Soft delete by setting deletedAt timestamp
    await this.prisma.application.update({
      where: { id: applicationId },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Application ${applicationId} soft deleted successfully`);
  }

  /**
   * Restore a soft-deleted application (clears deletedAt timestamp)
   */
  async restore(userId: string, applicationId: string): Promise<ApplicationResponseDto> {
    this.logger.log(`Restoring application ${applicationId} for user ${userId}`);

    // Find soft-deleted application (verify ownership)
    const application = await this.prisma.application.findFirst({
      where: {
        id: applicationId,
        userId,
        deletedAt: { not: null }, // Can only restore deleted applications
      },
    });

    if (!application) {
      throw new NotFoundWithCode(ErrorCode.APPLICATION_NOT_FOUND);
    }

    // Restore by clearing deletedAt
    const restored = await this.prisma.application.update({
      where: { id: applicationId },
      data: { deletedAt: null },
      include: {
        jobPosting: true,
      },
    });

    this.logger.log(`Application ${applicationId} restored successfully`);
    return mapApplicationToResponseDto(restored);
  }

  /**
   * Permanently delete an application and its associated files
   * This is irreversible - only used by cleanup cron or admin actions
   */
  async hardDelete(userId: string, applicationId: string): Promise<void> {
    this.logger.log(`Permanently deleting application ${applicationId} for user ${userId}`);

    // Find application (verify ownership)
    const application = await this.prisma.application.findFirst({
      where: {
        id: applicationId,
        userId,
      },
    });

    if (!application) {
      throw new NotFoundWithCode(ErrorCode.APPLICATION_NOT_FOUND);
    }

    // Clean up generated files from storage. The prefix sweep is the
    // authoritative step (Art. 17 DSGVO): every artefact for an application
    // lives under `applications/<id>/`, so nothing survives just because the
    // row forgot a key. The key-based cleanup stays for legacy rows whose
    // keys predate that layout.
    await this.cleanupGeneratedFiles(application);
    await this.storageService.tryDeleteByPrefix(`applications/${applicationId}/`);

    // Permanently delete application from database
    await this.prisma.application.delete({
      where: { id: applicationId },
    });

    this.logger.log(`Application ${applicationId} permanently deleted`);
  }

  /**
   * Update the tracking status of an application (user-facing)
   */
  async updateStatus(
    userId: string,
    applicationId: string,
    status: ApplicationTrackingStatus,
  ): Promise<ApplicationResponseDto> {
    this.logger.log(`Updating application ${applicationId} status to ${status} for user ${userId}`);

    await this.ensureApplicationOwnership(userId, applicationId);

    // Update status and timestamp. We mark `statusSource = USER` so the
    // mailbox-sync notification logic knows NOT to send a "status changed"
    // email — the user already knows, they just clicked the dropdown.
    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        applicationStatus: status,
        statusUpdatedAt: new Date(),
        statusSource: 'USER',
      },
      include: {
        jobPosting: true,
      },
    });

    this.logger.log(`Application ${applicationId} status updated to ${status}`);
    return mapApplicationToResponseDto(updated);
  }

  /**
   * Update the per-application design settings (font scale, density, accent
   * override, curated font family). Partial merge: absent DTO fields keep
   * their stored value; `accentColor: null` removes the color override. The
   * settings take effect on the next PDF export (the processor passes them
   * into the react-pdf renderer's meta).
   */
  async updateTemplateSettings(
    userId: string,
    applicationId: string,
    dto: UpdateTemplateSettingsDto,
  ): Promise<ApplicationResponseDto> {
    this.logger.log(`Updating template settings for application ${applicationId}`);

    const application = await this.ensureApplicationOwnership(userId, applicationId);

    // Merge onto the (defensively normalized) stored settings.
    const merged: TemplateSettings = {
      ...(normalizeTemplateSettings(application.templateSettings) ?? {}),
    };
    if (dto.fontFamily !== undefined) merged.fontFamily = dto.fontFamily;
    if (dto.fontScale !== undefined) merged.fontScale = dto.fontScale;
    if (dto.density !== undefined) merged.density = dto.density;
    if (dto.showPhoto !== undefined) merged.showPhoto = dto.showPhoto;
    if (dto.accentColor !== undefined) {
      if (dto.accentColor === null) {
        delete merged.accentColor;
      } else {
        merged.accentColor = dto.accentColor;
      }
    }

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        templateSettings: Object.keys(merged).length > 0 ? (merged as Prisma.InputJsonValue) : Prisma.DbNull,
      },
      include: {
        jobPosting: true,
      },
    });

    return mapApplicationToResponseDto(updated);
  }

  /**
   * Update the custom title of an application
   */
  async updateTitle(
    userId: string,
    applicationId: string,
    title: string,
  ): Promise<ApplicationResponseDto> {
    this.logger.log(`Updating application ${applicationId} title for user ${userId}`);

    await this.ensureApplicationOwnership(userId, applicationId);

    // Update title (validation already handled by DTO)
    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        title,
      },
      include: {
        jobPosting: true,
      },
    });

    this.logger.log(`Application ${applicationId} title updated`);
    return mapApplicationToResponseDto(updated);
  }

  /**
   * Update the target job title of an application (displayed on CV/CL)
   */
  async updateTargetJobTitle(
    userId: string,
    applicationId: string,
    targetJobTitle: string,
  ): Promise<ApplicationResponseDto> {
    this.logger.log(`Updating application ${applicationId} target job title for user ${userId}`);

    await this.ensureApplicationOwnership(userId, applicationId);

    // Update targetJobTitle (validation already handled by DTO)
    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        targetJobTitle,
      },
      include: {
        jobPosting: true,
      },
    });

    this.logger.log(`Application ${applicationId} target job title updated to: ${targetJobTitle}`);
    return mapApplicationToResponseDto(updated);
  }

  /**
   * Get only the status of an application (lightweight, for polling)
   */
  async getStatus(userId: string, applicationId: string): Promise<ApplicationStatusResponseDto> {
    const application = await this.prisma.application.findFirst({
      where: {
        id: applicationId,
        userId,
      },
      select: {
        id: true,
        status: true,
        errorMessage: true,
        updatedAt: true,
      },
    });

    if (!application) {
      throw new NotFoundWithCode(ErrorCode.APPLICATION_NOT_FOUND);
    }

    return {
      id: application.id,
      status: application.status,
      errorMessage: application.errorMessage,
      updatedAt: application.updatedAt,
    };
  }

  /**
   * Stream real-time status updates for an application via Server-Sent Events (SSE)
   * Polls the database every 5 seconds and streams updates until the application
   * reaches a final state. Progress comes from the persisted
   * generationProgress/generationMessage columns on the same row read, so it is
   * correct regardless of which machine runs the pipeline (prod runs 2).
   * @param userId - User ID (for authorization)
   * @param applicationId - Application ID to stream status for
   * @returns Observable that emits SSE MessageEvents with status updates
   */
  async streamStatus(userId: string, applicationId: string): Promise<Observable<MessageEvent>> {
    // Verify application exists and belongs to user
    await this.ensureApplicationOwnership(userId, applicationId);

    this.logger.log(`SSE stream started for application ${applicationId} by user ${userId}`);

    // Create SSE stream that polls status every 5 seconds.
    // Was 1s but that produced ~60 DB round-trips per generation; combined
    // with hundreds of generations/day this dominated Neon egress (5GB/mo cap).
    // 5s is still snappy enough for the wizard UI — progress rides on the
    // same row read, and the final READY/FAILED transition is bounded by one
    // extra poll.
    return timer(0, 5000).pipe(
      // Fetch latest application status
      switchMap(async () => {
        const application = await this.prisma.application.findFirst({
          where: {
            id: applicationId,
            userId,
          },
          select: {
            id: true,
            status: true,
            updatedAt: true,
            errorMessage: true,
            generationProgress: true,
            generationMessage: true,
          },
        });

        if (!application) {
          this.logger.error(`SSE stream error: Application ${applicationId} not found`);
          throw new NotFoundWithCode(ErrorCode.APPLICATION_NOT_FOUND);
        }

        this.logger.debug(
          `SSE emit: application ${applicationId} status=${application.status} progress=${application.generationProgress}%`,
        );
        return application;
      }),
      // Transform to SSE MessageEvent format (field names are the frontend
      // contract — keep `progress` + `message`).
      map((application) => {
        const status = application.status;
        return {
          data: {
            id: application.id,
            status: status,
            updatedAt: application.updatedAt,
            errorMessage: application.errorMessage,
            // The final 'Fertig!' write races the READY status update — floor
            // the bar at 100 once the terminal success state is visible.
            progress: status === 'READY' ? 100 : application.generationProgress,
            message: application.generationMessage ?? '',
          },
        } as MessageEvent;
      }),
      // Stop streaming when status reaches a final state (READY or FAILED)
      // The `true` parameter ensures the final status is emitted before closing
      takeWhile((event: MessageEvent) => {
        const eventData = event.data as { status: ApplicationStatus; progress: number };
        const status = eventData.status;
        const shouldContinue = status === 'PENDING' || status === 'GENERATING';

        if (!shouldContinue) {
          this.logger.log(
            `SSE stream closing for application ${applicationId} (final status: ${status}, progress: ${eventData.progress}%)`,
          );
        }

        return shouldContinue;
      }, true),
    );
  }

  /**
   * Get keywords analysis for an application
   * Returns cached analysis if available, or triggers new analysis
   */
  async getKeywordsAnalysis(
    userId: string,
    applicationId: string,
  ): Promise<ApplicationKeywordsResponseDto> {
    const application = await this.ensureApplicationOwnership(userId, applicationId, true);

    if (!application.jobPosting) {
      throw new BadRequestException('Application has no associated job posting');
    }

    // PRIORITY 1: Check cached keywords from resume updates (keywordsData field)
    // This ensures we use the most recent analysis after manual resume edits
    if (application.keywordsData) {
      try {
        const cached = JSON.parse(application.keywordsData as string);
        // Only use cache if it has the expected structure
        if (cached.keywords && cached.matchAnalysis) {
          this.logger.log(
            `Using cached keywords analysis for application ${applicationId} (score: ${cached.matchAnalysis.overallScore}%)`,
          );
          return {
            applicationId,
            keywords: cached.keywords,
            matchAnalysis: cached.matchAnalysis,
            matchedKeywords: cached.matchedKeywords || [],
            missingKeywords: cached.missingKeywords || [],
            analyzedAt: cached.analyzedAt ? new Date(cached.analyzedAt) : new Date(),
          };
        }
      } catch (error) {
        this.logger.warn(`Failed to parse cached keywords for application ${applicationId}`, error);
      }
    }

    // PRIORITY 2: Use new single-LLM pipeline keywords (atsKeywords field)
    // Only used if no cached keywordsData exists (e.g., fresh application)
    if (application.atsKeywords) {
      try {
        const atsKeywords = application.atsKeywords as any;

        // Convert new format to old format for UI compatibility
        const keywords = this.convertAtsKeywordsToOldFormat(atsKeywords);

        // Extract keywords from resume for matching
        const resumeKeywords = this.extractResumeKeywords(application.resumeText);

        // Fallback to profile if no resume
        let candidateKeywords: Set<string>;
        if (resumeKeywords.size > 0) {
          candidateKeywords = resumeKeywords;
        } else {
          const profile = await this.generationService.getProfileWithRelations(userId);
          candidateKeywords = this.extractProfileKeywords(profile);
        }

        // Match keywords
        const { matchedKeywords, missingKeywords } = this.matchKeywords(
          keywords,
          candidateKeywords,
        );
        const matchAnalysis = this.calculateMatchAnalysis(
          matchedKeywords,
          missingKeywords,
          keywords,
          { targetRole: application.jobPosting.title },
        );

        this.logger.log(
          `Calculated live keywords analysis for application ${applicationId} (score: ${matchAnalysis.overallScore}%)`,
        );

        return {
          applicationId,
          keywords,
          matchAnalysis,
          matchedKeywords,
          missingKeywords,
          analyzedAt: application.updatedAt,
        };
      } catch (error) {
        this.logger.warn(`Failed to use atsKeywords, falling back to old system`, error);
      }
    }

    // PRIORITY 3: No cached data (legacy fallback - should rarely happen)
    this.logger.warn(
      `No atsKeywords or keywordsData found for application ${applicationId}, using old ATS Agent system`,
    );
    return this.analyzeKeywords(userId, applicationId);
  }

  /**
   * Analyze keywords for an application
   * SMART: Uses cached keywords from atsKeywords field if available
   * Only re-extracts from job posting if no cached keywords exist
   */
  async analyzeKeywords(
    userId: string,
    applicationId: string,
  ): Promise<ApplicationKeywordsResponseDto> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
      include: { jobPosting: true },
    });

    if (!application) {
      throw new NotFoundWithCode(ErrorCode.APPLICATION_NOT_FOUND);
    }

    if (!application.jobPosting) {
      throw new BadRequestException('Application has no associated job posting');
    }

    const jobPosting = application.jobPosting;

    // SMART: Check if we have cached keywords from single-LLM pipeline
    let keywords: any;
    if (application.atsKeywords) {
      this.logger.log(
        `Using cached keywords from atsKeywords for application ${applicationId}, re-matching against updated resume`,
      );
      // Convert new format to old format for matching
      keywords = this.convertAtsKeywordsToOldFormat(application.atsKeywords as any);
    } else {
      // No cached keywords - extract from job posting using LLM
      this.logger.log(
        `No cached keywords found for application ${applicationId}, extracting from job posting`,
      );
      keywords = await this.keywordsService.extractKeywords({
        title: jobPosting.title,
        company: jobPosting.company,
        location: jobPosting.location || undefined,
        language: jobPosting.language || undefined,
        fullText: jobPosting.fullText,
        rawText: jobPosting.rawText || undefined,
      });
    }

    // Extract keywords from application's resume (not profile!)
    // This allows ATS score to reflect edits made in the application
    const resumeKeywords = this.extractResumeKeywords(application.resumeText);

    // Fallback to profile if no resume exists yet
    let candidateKeywords: Set<string>;
    if (resumeKeywords.size > 0) {
      candidateKeywords = resumeKeywords;
      this.logger.debug(`Using resume keywords for matching (${resumeKeywords.size} keywords)`);
    } else {
      const profile = await this.generationService.getProfileWithRelations(userId);
      candidateKeywords = this.extractProfileKeywords(profile);
      this.logger.debug(`Using profile keywords for matching (${candidateKeywords.size} keywords)`);
    }

    // Perform matching
    const { matchedKeywords, missingKeywords } = this.matchKeywords(keywords, candidateKeywords);

    // Calculate match analysis
    const matchAnalysis = this.calculateMatchAnalysis(matchedKeywords, missingKeywords, keywords, {
      targetRole: jobPosting.title,
    });

    // Cache the results
    const analysisData = {
      keywords,
      matchAnalysis,
      matchedKeywords,
      missingKeywords,
      analyzedAt: new Date(),
    };

    await this.prisma.application.update({
      where: { id: applicationId },
      data: { keywordsData: JSON.stringify(analysisData) },
    });

    this.logger.log(
      `Keywords analysis complete for application ${applicationId}: ${matchAnalysis.overallScore}% match`,
    );

    return {
      applicationId,
      keywords,
      matchAnalysis,
      matchedKeywords,
      missingKeywords,
      analyzedAt: new Date(),
    };
  }

  /**
   * Extract keywords from profile for matching
   */
  private extractProfileKeywords(profile: ProfileWithRelations): Set<string> {
    const keywords = new Set<string>();

    // Skills
    profile.skills.forEach((s) => keywords.add(s.name.toLowerCase()));

    // Experience titles and descriptions
    profile.experiences.forEach((e) => {
      e.title
        .toLowerCase()
        .split(/\s+/)
        .forEach((w) => keywords.add(w));
      if (e.description) {
        e.description
          .toLowerCase()
          .split(/\s+/)
          .forEach((w) => {
            if (w.length > 3) keywords.add(w);
          });
      }
    });

    // Projects and technologies
    profile.projects.forEach((p) => {
      p.technologies.forEach((t) => keywords.add(t.toLowerCase()));
    });

    // Certificates
    profile.certificates.forEach((c) => {
      c.name
        .toLowerCase()
        .split(/\s+/)
        .forEach((w) => keywords.add(w));
    });

    return keywords;
  }

  /**
   * Extract keywords from application's saved resume JSON
   * This is used to match against the edited resume, not the profile
   */
  private extractResumeKeywords(resumeText: string | null): Set<string> {
    const keywords = new Set<string>();

    if (!resumeText) {
      this.logger.debug('extractResumeKeywords: No resumeText provided');
      return keywords;
    }

    try {
      const resume = JSON.parse(resumeText);
      this.logger.debug(
        `extractResumeKeywords: Parsing resume with keys: ${Object.keys(resume).join(', ')}`,
      );

      // Helper: Add keyword preserving tech terms (C++, .NET, AWS, etc.)
      const addKeyword = (word: string) => {
        const trimmed = word.trim().toLowerCase();
        if (trimmed.length >= 2) {
          keywords.add(trimmed);
        }
      };

      // Helper: Split text but preserve tech terms
      const extractWords = (text: string) => {
        if (!text) return;
        // Split on whitespace but keep special chars within words
        text.split(/\s+/).forEach((w) => {
          const cleaned = w.replace(/^[,;.:!?"'()\[\]{}]+|[,;.:!?"'()\[\]{}]+$/g, '');
          if (cleaned.length >= 2) {
            keywords.add(cleaned.toLowerCase());
          }
        });
      };

      // Summary
      if (resume.summary) {
        extractWords(resume.summary);
      }

      // Skills from all categories - MOST IMPORTANT for ATS matching
      if (resume.skillCategories && Array.isArray(resume.skillCategories)) {
        resume.skillCategories.forEach((category: { type?: string; skills?: string[] }) => {
          if (category.skills && Array.isArray(category.skills)) {
            this.logger.debug(
              `extractResumeKeywords: Category "${category.type}" has ${category.skills.length} skills: ${category.skills.join(', ')}`,
            );
            category.skills.forEach((skill: string) => {
              // Add full skill name (e.g., "React.js", "Node.js", "C++")
              addKeyword(skill);
              // Also add without common suffixes for fuzzy matching
              const simplified = skill.toLowerCase().replace(/\.js$|\.net$/i, '');
              if (simplified !== skill.toLowerCase()) {
                addKeyword(simplified);
              }
            });
          }
        });
      }

      // Experience titles, descriptions, and achievements
      if (resume.experiences && Array.isArray(resume.experiences)) {
        resume.experiences.forEach(
          (exp: {
            title?: string;
            company?: string;
            description?: string;
            achievements?: string[];
          }) => {
            if (exp.title) extractWords(exp.title);
            if (exp.description) extractWords(exp.description);
            if (exp.achievements && Array.isArray(exp.achievements)) {
              exp.achievements.forEach((achievement: string) => extractWords(achievement));
            }
          },
        );
      }

      // Projects and highlights
      if (resume.projects && Array.isArray(resume.projects)) {
        resume.projects.forEach(
          (project: { name?: string; description?: string; highlights?: string[] }) => {
            if (project.name) extractWords(project.name);
            if (project.description) extractWords(project.description);
            if (project.highlights && Array.isArray(project.highlights)) {
              project.highlights.forEach((h: string) => extractWords(h));
            }
          },
        );
      }

      // Certifications (name and issuer are both important for ATS)
      if (resume.certifications && Array.isArray(resume.certifications)) {
        resume.certifications.forEach((cert: { name?: string; issuer?: string }) => {
          if (cert.name) extractWords(cert.name);
          if (cert.issuer) extractWords(cert.issuer); // Include issuer (e.g., "Microsoft", "AWS")
        });
      }

      // Education (degree, field of study, and description)
      if (resume.education && Array.isArray(resume.education)) {
        resume.education.forEach(
          (edu: { degree?: string; fieldOfStudy?: string; description?: string }) => {
            if (edu.degree) extractWords(edu.degree);
            if (edu.fieldOfStudy) extractWords(edu.fieldOfStudy);
            if (edu.description) extractWords(edu.description); // Include education description
          },
        );
      }

      // Languages
      if (resume.languages && Array.isArray(resume.languages)) {
        resume.languages.forEach((lang: { name?: string }) => {
          if (lang.name) {
            addKeyword(lang.name);
          }
        });
      }

      this.logger.debug(
        `extractResumeKeywords: Extracted ${keywords.size} keywords: ${[...keywords].slice(0, 20).join(', ')}...`,
      );
      return keywords;
    } catch (error) {
      this.logger.warn('Failed to parse resume text for keyword extraction', error as Error);
      return keywords;
    }
  }

  /**
   * Match extracted keywords against profile
   * Handles both string[] (old format) and {keyword, source}[] (new format with metadata)
   */
  private matchKeywords(
    keywords: any,
    profileKeywords: Set<string>,
  ): { matchedKeywords: any[]; missingKeywords: any[] } {
    const matched: any[] = [];
    const missing: any[] = [];

    const checkKeyword = (kwInput: string | any, category: string) => {
      // Handle both string and object formats
      let keywordText: string;
      let precomputedSource: string | undefined;

      if (typeof kwInput === 'string') {
        keywordText = kwInput;
        precomputedSource = undefined;
      } else {
        keywordText = kwInput.keyword;
        precomputedSource = kwInput.source; // 'job', 'profile', or 'both'
      }

      const normalized = keywordText.toLowerCase().trim();

      // If we have precomputed source from matchKeywordsAgainstProfile, use it
      let found: boolean;
      let confidence: number;

      if (precomputedSource === 'both' || precomputedSource === 'profile') {
        // Keyword was already matched against profile during generation
        found = true;
        confidence = 1.0;
      } else {
        // For 'job' source or legacy path: compute match dynamically
        // This allows detecting keywords added to resume AFTER initial generation

        // Strategy 1: Exact match (case-insensitive)
        found = profileKeywords.has(normalized);
        confidence = 1.0;

        // Strategy 2: Partial match with word boundaries (e.g., "React" in "React.js")
        if (!found) {
          const wordPattern = new RegExp(`\\b${this.escapeRegex(normalized)}\\b`, 'i');
          found = [...profileKeywords].some((pk) => wordPattern.test(pk));
          confidence = 0.9;
        }

        // Strategy 3: Fuzzy match for common variations (e.g., "TypeScript" vs "Typescript")
        if (!found) {
          const withoutSpaces = normalized.replace(/[\s\-_.]/g, '');
          found = [...profileKeywords].some((pk) => {
            const pkNormalized = pk.toLowerCase().replace(/[\s\-_.]/g, '');
            return pkNormalized === withoutSpaces;
          });
          confidence = 0.85;
        }

        // Strategy 4: Substring match (avoid false positives with very short keywords)
        // Check if either keyword contains the other (e.g., "C++" matches "C++17/20")
        if (!found && (normalized.length > 2 || [...profileKeywords].some((pk) => pk.length > 2))) {
          found = [...profileKeywords].some((pk) => {
            // Check bidirectional: job keyword contains resume keyword OR vice versa
            // e.g., "c++17/20" contains "c++" OR "c++" is in "c++17/20"
            return pk.includes(normalized) || normalized.includes(pk);
          });
          confidence = 0.7;
        }
      }

      const match = {
        keyword: keywordText,
        category,
        found,
        confidence: found ? confidence : 0,
        usedIn: found ? ['profile'] : [],
      };

      if (found) {
        matched.push(match);
      } else {
        missing.push(match);
      }
    };

    // Check all keyword categories (support both old and new field names)
    // OLD format: technicalSkills, toolsAndTechnologies, etc.
    // NEW format: coreCompetencies, softSkills
    (keywords.technicalSkills || keywords.coreCompetencies || []).forEach((k: any) =>
      checkKeyword(k, 'technical'),
    );
    keywords.softSkills?.forEach((k: any) => checkKeyword(k, 'soft'));
    (keywords.toolsAndTechnologies || []).forEach((k: any) => checkKeyword(k, 'tool'));
    (keywords.industryKeywords || []).forEach((k: any) => checkKeyword(k, 'industry'));
    (keywords.senioritySignals || []).forEach((k: any) => checkKeyword(k, 'seniority'));
    (keywords.requirementKeywords || []).forEach((k: any) => checkKeyword(k, 'requirement'));
    (keywords.responsibilityKeywords || []).forEach((k: any) => checkKeyword(k, 'responsibility'));
    (keywords.methodologies || []).forEach((k: any) => checkKeyword(k, 'methodology'));

    return { matchedKeywords: matched, missingKeywords: missing };
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Calculate match analysis from matched/missing keywords.
   *
   * The `overallScore` is purely deterministic (keyword coverage) — it is NEVER
   * an LLM self-report. `context.targetRole` (the job title) lets the suggestions
   * name the role the user is applying for.
   */
  private calculateMatchAnalysis(
    matchedKeywords: any[],
    missingKeywords: any[],
    keywords: any,
    context?: { targetRole?: string },
  ): any {
    // Support both old and new field names for counting totals
    // Only count hard skills (technical) - soft skills removed
    const totalTechnical =
      (keywords.technicalSkills?.length || 0) +
      (keywords.toolsAndTechnologies?.length || 0) +
      (keywords.coreCompetencies?.length || 0); // NEW format
    const totalExperience =
      (keywords.senioritySignals?.length || 0) + (keywords.requirementKeywords?.length || 0);
    const totalIndustry = keywords.industryKeywords?.length || 0;

    // Count matched keywords by category (support both 'technical' and 'core')
    const matchedTechnical = matchedKeywords.filter(
      (k) =>
        k.category === 'core' ||
        k.category === 'methodology' ||
        k.category === 'technical' || // NEW format uses 'technical'
        k.category === 'tool',
    ).length;
    const matchedExperience = matchedKeywords.filter(
      (k) => k.category === 'seniority' || k.category === 'requirement',
    ).length;
    const matchedIndustry = matchedKeywords.filter((k) => k.category === 'industry').length;

    const technicalScore =
      totalTechnical > 0 ? Math.round((matchedTechnical / totalTechnical) * 100) : 0;
    const experienceScore =
      totalExperience > 0 ? Math.round((matchedExperience / totalExperience) * 100) : 0;
    const industryScore =
      totalIndustry > 0 ? Math.round((matchedIndustry / totalIndustry) * 100) : 0;

    // Overall score is now 100% based on technical score (hard skills only)
    // No more soft skills weighting
    const overallScore = technicalScore;

    const { suggestions, strengths, weaknesses } = buildMatchInsights(
      matchedKeywords,
      missingKeywords,
      { overallScore, experienceScore },
      context?.targetRole,
    );

    return {
      overallScore,
      categoryScores: {
        core: technicalScore,
        soft: 0, // Soft skills no longer extracted
        experience: experienceScore,
        industry: industryScore,
      },
      suggestions,
      strengths,
      weaknesses,
    };
  }
}
