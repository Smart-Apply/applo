import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { JobPosting } from '../generated/prisma/client';
import { ApplicationTrackingStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LLMService } from '../llm/llm.service';
import { TitleGeneratorService } from './title-generator.service';
import { TemplatesService } from '../templates/templates.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { GroundingValidatorService } from './grounding/grounding-validator.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicationResponseDto, ApplicationStatus } from './dto/application-response.dto';
import { TailoredProfileDto, RewrittenProfileDto } from './dto/tailored-profile.dto';
import { ErrorCode } from '../common/constants/error-codes';
import {
  BadRequestWithCode,
  NotFoundWithCode,
  ConflictWithCode,
} from '../common/exceptions/coded-http.exception';
import { normalizeSkillCategory } from '@applo/shared';
import {
  buildResumeTemplateData,
  ProfileWithRelations,
  sanitizeUrl,
  formatDate,
  formatDateRange,
  normalizeProficiencyLevel,
} from './resume-template.util';
import { serializeJobPostingForLlm } from './serialize.util';
import { isKeywordPresent } from './keyword-coverage.util';
import {
  isValidJobFacts,
  normalizeJobFacts,
  type JobFactsDto,
} from './job-facts.util';
import {
  evaluateShortenRewrite,
  lintCoverLetterLength,
  lintGeneratedStyle,
} from './style-lint.util';
import {
  DEFAULT_COVER_LETTER_LENGTH,
  GENERATION_SYSTEM_ANCHOR,
  resolveCoverLetterBudget,
  resolveCoverLetterTargetMin,
} from './constants';
import { convertCoverLetterToHtml } from './cover-letter-html.util';
import { mapApplicationToResponseDto } from './application-response.util';
import { generateApplication } from './headless/generate';

/**
 * GenerationService — owns the application generation pipeline: the create
 * paths, the single-LLM pipeline, and every LLM pass (editor, keyword weave,
 * style rewrite, length governor, grounding/style checks). Extracted from
 * `ApplicationsService` (first cut of the god-service split); the CRUD /
 * export / keyword-analysis surfaces stay behind.
 *
 * Public beyond the four orchestrators are the helpers the edit-mode
 * cover-letter regenerate (`ApplicationsService.upsertCoverLetter`) shares
 * with the pipeline: `getProfileWithRelations`, `detectLanguage`,
 * `extractJobFacts`, `runLengthGovernorPass`. These are transitional — they
 * move again when the editor surface gets its own service.
 */
@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);

  // In-memory cache for skill categorization (keyed by sorted skill names)
  private readonly skillCategorizationCache = new Map<
    string,
    { type: string; skills: string[] }[]
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LLMService,
    private readonly titleGenerator: TitleGeneratorService,
    private readonly templatesService: TemplatesService,
    private readonly subscriptionService: SubscriptionService,
    private readonly groundingValidator: GroundingValidatorService,
  ) {}

  async getProfileWithRelations(userId: string): Promise<ProfileWithRelations> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        user: true,
        skills: true,
        certificates: true,
        experiences: true,
        projects: true,
        education: true,
        languages: true,
      },
    });

    if (!profile) {
      throw new BadRequestWithCode(ErrorCode.PROFILE_INCOMPLETE);
    }

    return profile;
  }

  /**
   * Intelligently categorize skills using LLM based on candidate profile
   * Uses in-memory cache to avoid re-categorizing the same skill set
   */
  private async categorizeSkillsWithLLM(
    profile: ProfileWithRelations,
  ): Promise<{ type: string; skills: string[] }[]> {
    // Skip if no skills
    if (!profile.skills || profile.skills.length === 0) {
      return [];
    }

    try {
      const skillNames = profile.skills.map((s) => s.name);

      // Create cache key from sorted skill names (order-independent)
      const cacheKey = [...skillNames].sort().join('|');

      // Check cache first
      const cached = this.skillCategorizationCache.get(cacheKey);
      if (cached) {
        this.logger.debug(`Using cached skill categorization for ${skillNames.length} skills`);
        return cached;
      }

      // Build context for LLM
      const candidateName =
        [profile.user.firstName, profile.user.lastName].filter(Boolean).join(' ').trim() ||
        'Professional';

      // Infer industry/role from profile
      const latestExperience = profile.experiences
        .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
        .at(0);

      const candidateContext = latestExperience
        ? `${latestExperience.title} with experience in ${latestExperience.company}`
        : profile.summary
          ? profile.summary.substring(0, 200)
          : candidateName;

      // Attempt to infer industry from experiences or education
      let industry: string | undefined;
      if (latestExperience?.title) {
        const title = latestExperience.title.toLowerCase();
        if (
          title.includes('software') ||
          title.includes('developer') ||
          title.includes('engineer')
        ) {
          industry = 'IT/Software Development';
        } else if (title.includes('marketing') || title.includes('content')) {
          industry = 'Marketing';
        } else if (title.includes('sales') || title.includes('business development')) {
          industry = 'Sales';
        } else if (title.includes('finance') || title.includes('analyst')) {
          industry = 'Finance';
        } else if (
          title.includes('nurse') ||
          title.includes('doctor') ||
          title.includes('healthcare')
        ) {
          industry = 'Healthcare';
        }
      }

      this.logger.log(
        `Categorizing ${skillNames.length} skills for ${candidateContext} (Industry: ${industry || 'auto-detect'})`,
      );

      // Call LLM service
      const categories = await this.llmService.categorizeSkills({
        skills: skillNames,
        candidateContext,
        industry,
      });

      this.logger.log(`LLM categorized skills into ${categories.length} categories`);

      // Cache the result
      this.skillCategorizationCache.set(cacheKey, categories);

      // Prevent cache from growing too large (limit to 100 entries)
      if (this.skillCategorizationCache.size > 100) {
        const firstKey = this.skillCategorizationCache.keys().next().value;
        this.skillCategorizationCache.delete(firstKey);
      }

      return categories;
    } catch (error) {
      this.logger.error('Failed to categorize skills with LLM, using fallback', error);
      // Fallback: return empty to use default categorization
      return [];
    }
  }

  /**
   * Detect language from job posting text using simple heuristics
   * Returns 'de' for German, 'en' for English, or null if undetermined
   */
  detectLanguage(text: string): 'de' | 'en' | null {
    const lowercase = text.toLowerCase();

    // Common German words (excluding ones that overlap with English)
    const germanWords = [
      'und',
      'für',
      'mit',
      'von',
      'bei',
      'wir',
      'sie',
      'ihre',
      'unser',
      'durch',
      'über',
      'zum',
    ];
    const englishWords = [
      'and',
      'for',
      'with',
      'from',
      'at',
      'we',
      'you',
      'your',
      'our',
      'through',
      'about',
      'the',
    ];

    let germanScore = 0;
    let englishScore = 0;

    for (const word of germanWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowercase.match(regex);
      if (matches) germanScore += matches.length;
    }
    for (const word of englishWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowercase.match(regex);
      if (matches) englishScore += matches.length;
    }

    this.logger.debug(`Language detection: German=${germanScore}, English=${englishScore}`);

    if (germanScore > englishScore && germanScore > 2) return 'de';
    if (englishScore > germanScore && englishScore > 2) return 'en';
    return null;
  }

  /**
   * Resolve template ID to language-specific variant based on detected language
   * If templateId is provided, find the matching language variant from the same design family
   */
  private async resolveTemplateForLanguage(
    templateId: string | null | undefined,
    language: string,
    type: 'COVER_LETTER' | 'RESUME',
  ): Promise<string | null> {
    if (!templateId) {
      return null;
    }

    try {
      // Get the selected template to find its category
      const selectedTemplate = await this.prisma.template.findUnique({
        where: { id: templateId },
        select: { category: true, language: true },
      });

      if (!selectedTemplate) {
        this.logger.warn(`Template ${templateId} not found, using default`);
        return null;
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
        type === 'COVER_LETTER' ? 'COVER_LETTER' : 'RESUME',
      );

      if (languageVariant) {
        this.logger.log(
          `Resolved template ${templateId} (${selectedTemplate.category}) to language variant ${languageVariant.id} (${language})`,
        );
        return languageVariant.id;
      }

      // Fallback: keep original template if no language variant found
      this.logger.warn(
        `No ${language} variant found for template ${templateId} (${selectedTemplate.category}), using original`,
      );
      return templateId;
    } catch (error) {
      this.logger.error(`Failed to resolve template for language ${language}:`, error);
      return templateId; // Fallback to original
    }
  }

  /**
   * Create a new application and trigger background processing
   */
  async create(userId: string, dto: CreateApplicationDto): Promise<ApplicationResponseDto> {
    this.logger.log(`Creating application for user ${userId}`);

    // 1. Verify job posting exists AND belongs to the caller (IDOR defense —
    // a foreign posting id must 404, not let the user attach an application
    // to and read another user's posting).
    const jobPosting = await this.prisma.jobPosting.findFirst({
      where: { id: dto.jobPostingId, userId },
    });

    if (!jobPosting) {
      throw new NotFoundException(`Job posting with ID ${dto.jobPostingId} not found`);
    }

    // 2. Check for existing application (prevent duplicates)
    // Note: Only check non-deleted applications (deletedAt: null)
    const existingApplication = await this.prisma.application.findFirst({
      where: {
        userId,
        jobPostingId: dto.jobPostingId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (existingApplication) {
      throw new ConflictWithCode(ErrorCode.APPLICATION_DUPLICATE);
    }

    // 3. Prefill resume data from profile
    const profile = await this.getProfileWithRelations(userId);

    // 3.1. Categorize skills: user-defined profile categories win; the LLM
    // only categorizes when the profile has none (buildResumeTemplateData
    // then falls back to deterministic grouping by Skill.category)
    const hasUserCategories = profile.skills.some((s) => normalizeSkillCategory(s.category));
    const skillCategories = hasUserCategories
      ? undefined
      : await this.categorizeSkillsWithLLM(profile);

    // 3.2. Detect language from job posting for multilingual templates —
    // BEFORE building the resume data so date labels are localized correctly
    const detectedLanguage =
      jobPosting.language || this.detectLanguage(jobPosting.fullText) || 'en';
    const resumeTemplate = buildResumeTemplateData(profile, skillCategories, detectedLanguage);
    resumeTemplate.language = detectedLanguage;

    // 3.3. Translate summary if job language differs from profile language (assume profile is in German)
    const profileLanguage = 'de'; // Assume profile is written in German
    if (resumeTemplate.summary && detectedLanguage !== profileLanguage) {
      this.logger.log(`Translating summary to ${detectedLanguage}`);
      try {
        resumeTemplate.summary = await this.llmService.translateSummary(
          resumeTemplate.summary,
          detectedLanguage,
        );
      } catch (error) {
        this.logger.warn('Failed to translate summary, using original', error as Error);
      }
    }

    // 4. Generate title for application
    const title = await this.titleGenerator.generateTitle(jobPosting);

    // 5. Create application record (no automatic generation yet)
    try {
      const application = await this.prisma.application.create({
        data: {
          userId,
          jobPostingId: dto.jobPostingId,
          title,
          applicationStatus: ApplicationTrackingStatus.CREATED,
          status: ApplicationStatus.PENDING,
          notes: dto.notes,
          coverLetterLength: dto.coverLetterLength || DEFAULT_COVER_LETTER_LENGTH,
          resumeText: JSON.stringify(resumeTemplate),
        },
        include: {
          jobPosting: true,
        },
      });

      return mapApplicationToResponseDto(application);
    } catch (error) {
      // Handle Prisma unique constraint violation (defense in depth)
      if (error.code === 'P2002') {
        throw new ConflictWithCode(ErrorCode.APPLICATION_DUPLICATE);
      }
      throw error;
    }
  }

  /**
   * Create application with immediate LLM generation (resume + cover letter)
   */
  async createWithGeneration(
    userId: string,
    dto: CreateApplicationDto,
  ): Promise<ApplicationResponseDto> {
    this.logger.log(`Creating application with single-LLM pipeline for user ${userId}`);

    const shouldGenerateCoverLetter = dto.generateCoverLetter !== false;
    const coverLetterLength = dto.coverLetterLength || DEFAULT_COVER_LETTER_LENGTH;
    const coverLetterBudget = resolveCoverLetterBudget(coverLetterLength);

    // 1. Verify job posting exists AND belongs to the caller (IDOR defense —
    // a foreign posting id must 404, not let the user attach an application
    // to and read another user's posting).
    const jobPosting = await this.prisma.jobPosting.findFirst({
      where: { id: dto.jobPostingId, userId },
    });

    if (!jobPosting) {
      throw new NotFoundException(`Job posting with ID ${dto.jobPostingId} not found`);
    }

    // 2. Get profile data
    const profile = await this.getProfileWithRelations(userId);

    // 3. Detect language (prioritize user selection, then job posting, then auto-detect, default to German)
    const detectedLanguage =
      dto.language || jobPosting.language || this.detectLanguage(jobPosting.fullText) || 'de';
    this.logger.log(
      `Using language: ${detectedLanguage} (source: ${dto.language ? 'user selection' : jobPosting.language ? 'job posting' : 'auto-detected/default'})`,
    );

    // 4. Check if application already exists (prevent duplicates BEFORE generation)
    // Note: Only check non-deleted applications (deletedAt: null). A previously
    // FAILED attempt is treated as recyclable below (step 7) so a failed
    // generation never permanently blocks re-creating for the same posting.
    const existingApplication = await this.prisma.application.findFirst({
      where: {
        userId,
        jobPostingId: dto.jobPostingId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (existingApplication && existingApplication.status !== ApplicationStatus.FAILED) {
      // A READY (genuine duplicate) or in-progress (PENDING/GENERATING) row
      // exists. The in-progress case also covers a retry of a slow request
      // whose first attempt already succeeded server-side after the client
      // connection dropped. Surface the existing id so the frontend navigates
      // straight into it instead of starting a second generation.
      const error = new ConflictException(
        'Du hast bereits eine Bewerbung für diese Stelle erstellt.',
      ) as ConflictException & { applicationId: string };
      error.applicationId = existingApplication.id;
      throw error;
    }

    // 5. Generate title
    const title = await this.titleGenerator.generateTitle(jobPosting);

    // 6. Resolve templates to match detected language
    const resolvedResumeTemplateId = await this.resolveTemplateForLanguage(
      dto.resumeTemplateId,
      detectedLanguage,
      'RESUME',
    );
    const resolvedCoverLetterTemplateId = shouldGenerateCoverLetter
      ? await this.resolveTemplateForLanguage(
          dto.coverLetterTemplateId,
          detectedLanguage,
          'COVER_LETTER',
        )
      : null;

    // 7. Create application (initially empty, will be populated by pipeline).
    // If a previously FAILED attempt for this (user, job) exists, reuse that
    // row instead of inserting a new one — a failed generation must never
    // permanently block the user from re-creating an application.
    let application: Prisma.ApplicationGetPayload<{ include: { jobPosting: true } }>;
    try {
      const applicationData = {
        title,
        applicationStatus: ApplicationTrackingStatus.CREATED,
        status: ApplicationStatus.PENDING,
        // Reset persisted progress — a reused FAILED row would otherwise show
        // the previous run's stale bar until the pipeline's first write.
        generationProgress: 0,
        generationMessage: null,
        notes: dto.notes,
        coverLetterTemplateId: resolvedCoverLetterTemplateId,
        resumeTemplateId: resolvedResumeTemplateId,
        language: detectedLanguage,
        // Original content language — the export path uses it to decide
        // whether a cross-language translation is needed.
        sourceLanguage: detectedLanguage,
        // Length preference — regeneration paths honor the same budget.
        coverLetterLength,
      };

      if (existingApplication) {
        // Only a FAILED row reaches here (READY/in-progress threw at step 4).
        application = await this.prisma.application.update({
          where: { id: existingApplication.id },
          data: { ...applicationData, errorMessage: null },
          include: {
            jobPosting: true,
          },
        });
      } else {
        application = await this.prisma.application.create({
          data: {
            userId,
            jobPostingId: dto.jobPostingId,
            ...applicationData,
          },
          include: {
            jobPosting: true,
          },
        });
      }
    } catch (error) {
      // Handle Prisma unique constraint violation (defense in depth)
      if (error.code === 'P2002') {
        throw new ConflictWithCode(ErrorCode.APPLICATION_DUPLICATE);
      }
      throw error;
    }

    this.logger.log(`Application ${application.id} created, starting generation pipeline`);

    // 8. Run the v1 chain. The chain itself lives in `headless/generate.ts` and
    // is shared with the eval platform's process seam — this service owns
    // persistence and metering, never the passes.
    try {
      const startTime = Date.now();

      const result = await generateApplication(
        profile,
        jobPosting,
        {
          language: detectedLanguage,
          generateCoverLetter: shouldGenerateCoverLetter,
          coverLetterLength,
          context: { userId, jobPostingId: jobPosting.id },
        },
        { llm: this.llmService, grounding: this.groundingValidator },
      );

      // Convert to the JSON ResumeData shape the frontend editor consumes.
      const resumeJson = this.convertTailoredProfileToResumeJson(
        profile,
        result.tailoredProfile,
        result.resume,
        detectedLanguage,
      );

      // Grounding check (#7): flag any fabricated impact numbers (non-destructive).
      this.runGroundingCheck(
        application.id,
        { resume: JSON.stringify(resumeJson), coverLetter: result.coverLetter },
        profile,
        jobPosting.fullText,
      );

      // Style check: flag forbidden AI clichés + German hedging (non-destructive).
      this.runStyleCheck(
        application.id,
        { resume: JSON.stringify(resumeJson), coverLetter: result.coverLetter },
        detectedLanguage,
        coverLetterBudget,
      );

      // Convert cover letter Markdown to HTML for proper PDF rendering
      const coverLetterHtml = convertCoverLetterToHtml(result.coverLetter);

      const updatedApplication = await this.prisma.application.update({
        where: { id: application.id },
        data: {
          resumeText: JSON.stringify(resumeJson), // Store JSON for editor
          coverLetterText: coverLetterHtml,
          atsKeywords: result.atsKeywords as any,
          tailoredProfile: result.tailoredProfile as any,
          status: ApplicationStatus.READY,
        },
        include: { jobPosting: true },
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `Application ${application.id} generated successfully in ${duration}ms (coverLetter: ${shouldGenerateCoverLetter})`,
      );

      return mapApplicationToResponseDto(updatedApplication);
    } catch (error) {
      this.logger.error(`Failed to generate application ${application.id}`, error);

      // Update status to FAILED
      await this.prisma.application.update({
        where: { id: application.id },
        data: {
          status: ApplicationStatus.FAILED,
          errorMessage: error.message || 'Generation failed',
        },
      });

      throw error;
    }
  }

  /**
   * Cancel an in-flight generation for a job posting by soft-deleting its
   * PENDING/GENERATING application row. The synchronous pipeline keeps
   * running and lands its final update on the (now hidden) row — the
   * duplicate-guard ignores soft-deleted rows, so the user can immediately
   * re-generate for the same posting. No-op when nothing is in flight.
   */
  async cancelPendingGeneration(
    userId: string,
    jobPostingId: string,
  ): Promise<{ cancelled: boolean; applicationId: string | null }> {
    const application = await this.prisma.application.findFirst({
      where: {
        userId,
        jobPostingId,
        deletedAt: null,
        status: { in: [ApplicationStatus.PENDING, ApplicationStatus.GENERATING] },
      },
      select: { id: true },
    });

    if (!application) {
      return { cancelled: false, applicationId: null };
    }

    await this.prisma.application.update({
      where: { id: application.id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(
      `Cancelled in-flight generation ${application.id} (user ${userId}, job posting ${jobPostingId})`,
    );
    return { cancelled: true, applicationId: application.id };
  }

  /**
   * NEW: Single-LLM pipeline for application generation
   * Replaces agent-based architecture with deterministic single-pass generation
   *
   * Pipeline: Profile Selection → Resume → Cover Letter → ATS Keywords
   */
  async generateWithSinglePipeline(
    applicationId: string,
    userId: string,
  ): Promise<ApplicationResponseDto> {
    const startTime = Date.now();
    this.logger.log(`Starting single-LLM pipeline for application ${applicationId}`);

    // 0. Ownership check FIRST — before any write. `findFirst` scoped by
    // userId (not `findUnique` by id alone) is the IDOR defense: a foreign
    // application id must 404 before this method resets or overwrites the row.
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
      include: { jobPosting: true },
    });

    if (!application) {
      throw new NotFoundWithCode(ErrorCode.APPLICATION_NOT_FOUND);
    }

    // Persist progress on the row (fire-and-forget) so the SSE poll can
    // serve it from ANY machine — prod runs 2 Fly machines and in-memory
    // callbacks only reached streams on the machine running the pipeline.
    // progress=0 resets unconditionally (new run); later writes are
    // monotonic (`lt`) so a stale async write can never move the bar back.
    const emitProgress = (progress: number, message: string) => {
      this.prisma.application
        .updateMany({
          where:
            progress === 0
              ? { id: applicationId }
              : { id: applicationId, generationProgress: { lt: progress } },
          data: { generationProgress: progress, generationMessage: message },
        })
        .catch((error) => {
          // Progress is cosmetic — never let a failed write break the pipeline.
          this.logger.warn(`Failed to persist progress for ${applicationId}`, error);
        });
    };

    // 0. Initial progress — awaited unconditional reset so the monotonic
    // ladder below has a stable floor (a fire-and-forget 0-write could
    // otherwise commit AFTER the 10% write and drag the bar backwards).
    await this.prisma.application
      .updateMany({
        where: { id: applicationId },
        data: { generationProgress: 0, generationMessage: 'Starte Generierung...' },
      })
      .catch((error) => {
        this.logger.warn(`Failed to reset progress for ${applicationId}`, error);
      });

    // 1. Load data
    emitProgress(10, 'Lade Profil und Stellenanzeige...');
    const profile = await this.getProfileWithRelations(userId);

    const jobPosting = application.jobPosting;
    const shouldGenerateCoverLetter = application.coverLetterText !== null; // Infer from initial state
    const coverLetterBudget = resolveCoverLetterBudget(application.coverLetterLength);

    // 2. Detect language
    const language = jobPosting.language || this.detectLanguage(jobPosting.fullText) || 'en';
    this.logger.log(`Detected language: ${language}`);

    try {
      // 3. Run the v1 chain. The chain itself lives in `headless/generate.ts`
      // and is shared with the eval platform's process seam — this service
      // owns persistence, progress and metering, never the passes.
      const result = await generateApplication(
        profile,
        jobPosting,
        {
          language,
          generateCoverLetter: shouldGenerateCoverLetter,
          coverLetterLength: application.coverLetterLength ?? undefined,
          context: { userId, jobPostingId: jobPosting.id },
        },
        {
          llm: this.llmService,
          grounding: this.groundingValidator,
          onProgress: emitProgress,
        },
      );

      const resumeText = JSON.stringify(
        this.convertTailoredProfileToResumeJson(
          profile,
          result.tailoredProfile,
          result.resume,
          language,
        ),
      );

      // Grounding + style checks — deterministic, non-destructive reporting on
      // the finalized documents.
      this.runGroundingCheck(
        applicationId,
        { resume: resumeText, coverLetter: result.coverLetter },
        profile,
        jobPosting.fullText,
      );
      this.runStyleCheck(
        applicationId,
        { resume: resumeText, coverLetter: result.coverLetter },
        language,
        coverLetterBudget,
      );

      // Convert cover letter Markdown to HTML for proper PDF rendering
      const coverLetterHtml = convertCoverLetterToHtml(result.coverLetter);

      emitProgress(95, 'Speichere Ergebnisse...');
      const updated = await this.prisma.application.update({
        where: { id: applicationId },
        data: {
          resumeText,
          coverLetterText: coverLetterHtml,
          atsKeywords: result.atsKeywords as any,
          tailoredProfile: result.tailoredProfile as any,
          status: ApplicationStatus.READY,
        },
        include: { jobPosting: true },
      });

      emitProgress(100, 'Fertig!');

      const duration = Date.now() - startTime;
      this.logger.log(
        `Single-LLM pipeline completed in ${duration}ms for application ${applicationId}`,
      );

      return mapApplicationToResponseDto(updated);
    } catch (error) {
      this.logger.error(`Single-LLM pipeline failed for application ${applicationId}`, error);

      // Update status to FAILED with error message
      await this.prisma.application.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.FAILED,
          errorMessage: error.message || 'Pipeline failed',
        },
      });

      throw error;
    }
  }

  /**
   * Serialize job posting for LLM consumption.
   * Delegates to the shared pure serializer so the offline eval harness (#10)
   * renders identical prompt inputs. See `serialize.util.ts`.
   */
  private serializeJobPosting(job: any): Record<string, any> {
    return serializeJobPostingForLlm(job);
  }

  /**
   * Cover-letter data layer (#5) — extract structured job facts (contact person,
   * company specifics, explicit salary/start-date asks) as a focused step, so the
   * cover-letter writer gets them ready-made instead of scanning `fullText` while
   * it writes. Graceful degradation: on any failure returns null and the prompt
   * falls back to scanning `fullText` itself.
   */
  /**
   * Extract the job facts (#5) used by the cover letter.
   */
  async extractJobFacts(
    jobPosting: JobPosting,
    language: string,
    userId: string,
  ): Promise<JobFactsDto | null> {
    try {
      const raw = await this.llmService.callJson<JobFactsDto>(
        'v1/job-facts.md',
        {
          job: this.serializeJobPosting(jobPosting),
          language,
          userId,
          jobPostingId: jobPosting.id,
        },
        { temperature: 0, maxTokens: 500 },
      );
      if (!isValidJobFacts(raw)) {
        this.logger.warn('Job-facts extraction returned an invalid payload; ignoring');
        return null;
      }
      const facts = normalizeJobFacts(raw);
      this.logger.log(
        `Job facts: contact="${facts.contact_name || '—'}", ${facts.company_specifics.length} specifics` +
          `, salary=${facts.asks_salary}, startDate=${facts.asks_start_date}`,
      );
      return facts;
    } catch (error) {
      this.logger.warn(`Job-facts extraction failed; continuing without it: ${error.message}`);
      return null;
    }
  }

  /**
   * Length governor — one guarded shorten pass that fires ONLY when the
   * deterministic length lint reports the finished cover letter over its word
   * budget (beyond tolerance). It runs after the last content-modifying pass so
   * nothing can re-inflate the letter afterwards, mirroring the style-rewrite
   * "teeth" pattern: detect deterministically → surgical LLM fix → deterministic
   * acceptance guard → graceful fallback.
   *
   * Never truncates mechanically and can never ship a worse letter:
   * - Skips the LLM call entirely when the letter is within budget.
   * - Carries the `GENERATION_SYSTEM_ANCHOR` so the shorten can't fabricate.
   * - Accepts the rewrite ONLY when `evaluateShortenRewrite` confirms it lands
   *   within budget, isn't gutted, keeps the salutation line verbatim, doesn't
   *   regress the style-violation count, and retains every priority-1
   *   profile-supported keyword present in the draft (the weave pass's work);
   *   otherwise keeps the pre-shorten draft. Never throws.
   */
  async runLengthGovernorPass(
    draft: string | null,
    atsKeywords: unknown,
    // Retained for the ApplicationsService call site; the shorten pass no longer sends the profile.
    _tailoredProfile: TailoredProfileDto,
    language: string,
    lengthBudget: number,
    userId: string,
    jobPosting: JobPosting,
  ): Promise<string | null> {
    if (!draft || draft.trim() === '') return draft;

    const lint = lintCoverLetterLength(draft, lengthBudget, language);
    if (!lint.overrun) {
      this.logger.debug(
        `Length governor: cover letter within budget (${lint.words}/${lint.budget} words); skipping`,
      );
      return draft;
    }

    // The priority-1 profile-supported keywords already present in the draft
    // must survive the shortening — never undo the keyword weave (#6).
    // `atsKeywords` may arrive as a typed matcher result or a Prisma Json
    // value, so narrow structurally instead of trusting the shape.
    const hardSkillsRaw =
      atsKeywords && typeof atsKeywords === 'object'
        ? (atsKeywords as { hard_skills?: unknown }).hard_skills
        : undefined;
    const mustKeepKeywords: string[] = (Array.isArray(hardSkillsRaw) ? hardSkillsRaw : [])
      .filter((kw): kw is { keyword: string; priority?: unknown; source?: unknown } => {
        if (!kw || typeof kw !== 'object') return false;
        const candidate = kw as { keyword?: unknown; priority?: unknown; source?: unknown };
        return (
          candidate.priority === 1 &&
          candidate.source === 'both' &&
          typeof candidate.keyword === 'string' &&
          isKeywordPresent(draft, candidate.keyword)
        );
      })
      .map((kw) => kw.keyword);

    try {
      const shortened = await this.llmService.callText(
        'v1/shorten-cover-letter.md',
        {
          draft,
          lengthBudget,
          lengthTargetMin: resolveCoverLetterTargetMin(lengthBudget),
          currentWords: lint.words,
          job: this.serializeJobPosting(jobPosting),
          language,
          userId,
          jobPostingId: jobPosting.id,
        },
        { temperature: 0.3, maxTokens: 1500, systemMessage: GENERATION_SYSTEM_ANCHOR },
      );

      const decision = evaluateShortenRewrite(
        draft,
        shortened,
        lengthBudget,
        language,
        mustKeepKeywords,
      );
      if (!decision.accept) {
        this.logger.warn(
          `Length governor rejected (${decision.reason}, ${decision.wordsBefore}→${decision.wordsAfter} words, budget ${lengthBudget}); keeping pre-shorten draft`,
        );
        return draft;
      }

      this.logger.log(
        `Length governor applied (${decision.wordsBefore}→${decision.wordsAfter} words, budget ${lengthBudget})`,
      );
      return shortened;
    } catch (error) {
      this.logger.warn(`Length governor failed; keeping pre-shorten draft: ${error.message}`);
      return draft;
    }
  }

  /**
   * Grounding check (#7) — deterministic, non-destructive. Logs a warning when
   * the generated documents contain impact numbers that look fabricated. The
   * job posting additionally grounds cover-letter numbers (quoting the ad is
   * legitimate personalization); résumé numbers must come from the profile.
   * Never throws.
   */
  private runGroundingCheck(
    applicationId: string,
    generated: { resume?: string | null; coverLetter?: string | null },
    profile: ProfileWithRelations,
    jobPostingText?: string | null,
  ): void {
    try {
      const report = this.groundingValidator.validate(generated, profile, jobPostingText);
      if (!report.grounded) {
        this.logger.warn(
          `Grounding check (application ${applicationId}): ${report.unsupported.length}/${report.totalChecked} impact numbers not found in profile (score ${report.score}). Unsupported: ${report.unsupported
            .map((u) => u.value)
            .join(', ')}`,
        );
      } else {
        this.logger.debug(
          `Grounding check (application ${applicationId}): all ${report.totalChecked} impact numbers grounded`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Grounding check failed for application ${applicationId}: ${error.message}`,
      );
    }
  }

  /**
   * Style check — deterministic, non-destructive. Logs a warning when the
   * generated documents contain forbidden AI-style clichés or (for German)
   * Konjunktiv/hedging that the prompts explicitly ban, and — when a word
   * budget is provided — when the cover letter overruns it. Detection only;
   * the text is never altered here. Never throws. See `style-lint.util.ts`.
   */
  private runStyleCheck(
    applicationId: string,
    generated: { resume?: string | null; coverLetter?: string | null },
    language: string,
    coverLetterBudget?: number,
  ): void {
    try {
      const cover = lintGeneratedStyle(generated.coverLetter, language);
      const resume = lintGeneratedStyle(generated.resume, language);
      const phrases = [...new Set([...cover.aiPhrases, ...resume.aiPhrases])];
      const hedges = [...new Set([...cover.hedging, ...resume.hedging])];
      const total = phrases.length + hedges.length;
      if (total > 0) {
        this.logger.warn(
          `Style check (application ${applicationId}): ${total} violation(s) — ` +
            `clichés: [${phrases.join(', ') || '—'}]; hedging: [${hedges.join(', ') || '—'}]`,
        );
      } else {
        this.logger.debug(`Style check (application ${applicationId}): clean`);
      }

      if (coverLetterBudget && generated.coverLetter) {
        const length = lintCoverLetterLength(generated.coverLetter, coverLetterBudget, language);
        if (length.overrun) {
          const overrunPct = Math.round(((length.words - length.budget) / length.budget) * 100);
          this.logger.warn(
            `Length check (application ${applicationId}): ${length.words} words vs budget ${length.budget} (+${overrunPct}%) — severity: ${length.severity}`,
          );
        } else if (length.underrun) {
          this.logger.warn(
            `Length check (application ${applicationId}): ${length.words} words vs budget ${length.budget} — UNDER floor ${length.floor} (reads as low-effort)`,
          );
        } else {
          this.logger.debug(
            `Length check (application ${applicationId}): ${length.words}/${length.budget} words — ok`,
          );
        }
      }
    } catch (error) {
      this.logger.warn(`Style check failed for application ${applicationId}: ${error.message}`);
    }
  }

  /**
   * Convert tailoredProfile to JSON ResumeData format for frontend editor
   * Maps the selected/filtered profile data from LLM back to the expected JSON structure
   * @param profile - Full profile with relations
   * @param tailoredProfile - LLM-selected relevant profile data
   * @param rewrittenProfile - Optional LLM-rewritten professional content
   */
  private convertTailoredProfileToResumeJson(
    profile: ProfileWithRelations,
    tailoredProfile: any,
    rewrittenProfile?: RewrittenProfileDto | null,
    language?: string,
  ): any {
    const candidateName =
      `${profile.user.firstName || ''} ${profile.user.lastName || ''}`.trim() || profile.user.email;

    // Create lookup maps for rewritten content (by profileExperienceId/profileProjectId)
    const rewrittenExperienceMap = new Map(
      (rewrittenProfile?.rewritten_experiences || []).map((exp) => [exp.profileExperienceId, exp]),
    );
    const rewrittenProjectMap = new Map(
      (rewrittenProfile?.rewritten_projects || []).map((proj) => [proj.profileProjectId, proj]),
    );

    // Debug: Log the IDs to check if they match
    this.logger.debug(`Profile experience IDs: ${profile.experiences.map((e) => e.id).join(', ')}`);
    this.logger.debug(
      `Rewritten experience IDs: ${Array.from(rewrittenExperienceMap.keys()).join(', ')}`,
    );
    // Debug: Log what the LLM returned for each experience
    rewrittenExperienceMap.forEach((rewritten, id) => {
      const originalExp = profile.experiences.find((e) => e.id === id);
      this.logger.debug(
        `Experience "${originalExp?.title}" (${id}): ` +
          `desc="${(rewritten.rewritten_description || '').substring(0, 50)}...", ` +
          `achievements=[${rewritten.rewritten_achievements?.length || 0} items: ${(rewritten.rewritten_achievements || []).map((a) => a.substring(0, 30) + '...').join(' | ')}]`,
      );
    });

    // Build skill categories from selected hard skills AND tools
    const skillCategories: any[] = [];

    // Create a Set of valid profile skills for validation (case-insensitive)
    const validProfileSkills = new Set(profile.skills.map((s) => s.name.toLowerCase()));

    // Combine hard skills and tools into one array, removing duplicates
    const allSkills: string[] = [];

    if (tailoredProfile.selected_hard_skills?.length > 0) {
      allSkills.push(
        ...tailoredProfile.selected_hard_skills.map((s: any) =>
          typeof s === 'string' ? s : s.name || '',
        ),
      );
    }

    if (tailoredProfile.selected_tools?.length > 0) {
      allSkills.push(
        ...tailoredProfile.selected_tools.map((s: any) =>
          typeof s === 'string' ? s : s.name || '',
        ),
      );
    }

    // Filter skills to only include those that exist in the user's profile (prevents LLM hallucination)
    const validatedSkills = allSkills.filter((skill) => {
      const isValid = validProfileSkills.has(skill.toLowerCase());
      return isValid;
    });

    // Log warning for hallucinated skills (skills returned by LLM but not in profile)
    const hallucinatedSkills = allSkills.filter(
      (skill) => !validProfileSkills.has(skill.toLowerCase()),
    );
    if (hallucinatedSkills.length > 0) {
      this.logger.warn(
        `LLM returned ${hallucinatedSkills.length} skills not found in profile: ${hallucinatedSkills.join(', ')}`,
      );
    }

    // Remove duplicates (case-insensitive)
    const uniqueSkills = Array.from(new Set(validatedSkills.map((s) => s.toLowerCase()))).map(
      (lower) => validatedSkills.find((s) => s.toLowerCase() === lower) || lower,
    );

    // Group the LLM-selected skills by the user's profile categories
    // (deterministic post-LLM mapping — the LLM never invents categories).
    // Named categories keep the profile's first-seen order; uncategorized
    // skills come last under an empty type (headerless render), which is
    // also the unchanged single-group behavior for profiles without categories.
    if (uniqueSkills.length > 0) {
      const categoryBySkillName = new Map(
        profile.skills.map((s) => [s.name.toLowerCase(), normalizeSkillCategory(s.category)]),
      );
      const categoryOrder = Array.from(
        new Set(
          profile.skills
            .map((s) => normalizeSkillCategory(s.category))
            .filter((c): c is string => c !== null),
        ),
      );

      const grouped = new Map<string, string[]>(categoryOrder.map((c) => [c, []]));
      const uncategorized: string[] = [];
      for (const skillName of uniqueSkills) {
        const category = categoryBySkillName.get(skillName.toLowerCase());
        if (category) {
          grouped.get(category)!.push(skillName);
        } else {
          uncategorized.push(skillName);
        }
      }

      let categoryIndex = 0;
      for (const [type, skills] of grouped) {
        if (skills.length > 0) {
          skillCategories.push({
            id: `skills-${Date.now()}-${categoryIndex++}`,
            type,
            skills,
          });
        }
      }
      if (uncategorized.length > 0) {
        skillCategories.push({
          id: 'skills-' + Date.now(),
          type: '',
          skills: uncategorized,
        });
      }
    }

    // Include ALL profile experiences (not just LLM-selected ones)
    // Users can remove unwanted ones in the editor; sorted by start date (most recent first)
    // Use rewritten descriptions/achievements if available, with fallback to original
    const experiences = profile.experiences
      .slice() // Create copy to avoid mutating original
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
      .map((exp) => {
        const rewritten = rewrittenExperienceMap.get(exp.id);
        if (!rewritten) {
          this.logger.warn(
            `No rewritten content found for experience "${exp.title}" (ID: ${exp.id}) - using original text`,
          );
        }
        // Determine if LLM provided rewritten content (achievements take priority)
        const hasRewrittenAchievements =
          rewritten?.rewritten_achievements && rewritten.rewritten_achievements.length > 0;
        const hasRewrittenDescription =
          rewritten?.rewritten_description && rewritten.rewritten_description.trim() !== '';

        // IMPORTANT: If LLM provided achievements but no description, use ONLY achievements
        // (don't mix English original description with German achievements)
        let description: string | undefined;
        if (hasRewrittenDescription) {
          // LLM provided a rewritten description - use it
          description = rewritten.rewritten_description;
        } else if (hasRewrittenAchievements) {
          // LLM provided achievements but no description - leave description empty
          // Frontend will display only the achievements
          description = undefined;
        } else {
          // No rewritten content at all - fallback to original
          description = exp.description || undefined;
        }

        return {
          id: exp.id,
          title: exp.title,
          company: exp.company,
          dateRange: formatDateRange(exp.startDate, exp.endDate, exp.isCurrent, language),
          startDate: exp.startDate?.toISOString() || undefined,
          endDate: exp.endDate?.toISOString() || undefined,
          isCurrent: exp.isCurrent || undefined,
          location: exp.location || undefined,
          description,
          // Use rewritten achievements if available, fallback to original
          achievements: hasRewrittenAchievements
            ? rewritten.rewritten_achievements
            : exp.achievements || [],
        };
      });

    // Include ALL profile projects (not just LLM-selected ones)
    // Users can remove unwanted ones in the editor
    // Use rewritten descriptions/highlights if available, with fallback to original
    const projects = profile.projects.map((proj) => {
      const rewritten = rewrittenProjectMap.get(proj.id);

      // Determine if LLM provided rewritten content (highlights take priority)
      const hasRewrittenHighlights =
        rewritten?.rewritten_highlights && rewritten.rewritten_highlights.length > 0;
      const hasRewrittenDescription =
        rewritten?.rewritten_description && rewritten.rewritten_description.trim() !== '';

      // IMPORTANT: If LLM provided highlights but no description, use ONLY highlights
      // (don't mix English original description with German highlights)
      let description: string | undefined;
      if (hasRewrittenDescription) {
        description = rewritten.rewritten_description;
      } else if (hasRewrittenHighlights) {
        // LLM provided highlights but no description - leave description empty
        description = undefined;
      } else {
        description = proj.description || undefined;
      }

      return {
        id: proj.id,
        name: proj.name,
        description,
        date: proj.startDate ? formatDate(proj.startDate, language) : undefined,
        startDate: proj.startDate?.toISOString() || undefined,
        highlights: hasRewrittenHighlights
          ? rewritten.rewritten_highlights
          : proj.technologies || [],
      };
    });

    // Map selected education - Handle both string[] (legacy) and object[] (new)
    let education = (tailoredProfile.selected_education || [])
      .map((edu: any) => {
        // Handle string format (legacy LLM output)
        if (typeof edu === 'string') {
          // Try to match with profile education by degree or institution name
          const matchedEdu = profile.education.find(
            (e) =>
              edu.toLowerCase().includes(e.degree.toLowerCase()) ||
              edu.toLowerCase().includes(e.institution.toLowerCase()),
          );
          if (matchedEdu) {
            return {
              id: matchedEdu.id,
              degree: matchedEdu.degree,
              institution: matchedEdu.institution,
              fieldOfStudy: matchedEdu.fieldOfStudy ?? undefined,
              year: matchedEdu.endYear?.getFullYear()?.toString() || '',
              gpa: matchedEdu.gpa ?? undefined,
              description: matchedEdu.description ?? undefined,
            };
          }
          // Fallback: parse "Degree at Institution" format
          const parts = edu.split(/\s+at\s+|\s+-\s+|\s+from\s+/i).map((s: string) => s.trim());
          return {
            id: 'edu-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            degree: parts[0] || edu,
            institution: parts[1] || 'Unknown',
            year: new Date().getFullYear().toString(),
          };
        }
        // Handle object format (new LLM output)
        if (!edu.degree && !edu.institution) return null;
        // Find original education from profile by ID to enrich data
        const originalEdu = profile.education.find((e) => e.id === edu.profileEducationId);
        const year =
          edu.endYear ||
          edu.startYear ||
          originalEdu?.endYear?.getFullYear()?.toString() ||
          new Date().getFullYear().toString();
        return {
          id: edu.profileEducationId || 'edu-' + Date.now(),
          degree: originalEdu?.degree || edu.degree,
          institution: originalEdu?.institution || edu.institution,
          fieldOfStudy: originalEdu?.fieldOfStudy || edu.fieldOfStudy || undefined,
          year: year.toString(),
          gpa: originalEdu?.gpa || edu.gpa || undefined,
          description: originalEdu?.description || edu.description || undefined,
        };
      })
      .filter(Boolean);

    // Fallback: If no education from LLM, use all profile education
    if (education.length === 0 && profile.education.length > 0) {
      education = profile.education.map((edu) => ({
        id: edu.id,
        degree: edu.degree,
        institution: edu.institution,
        fieldOfStudy: edu.fieldOfStudy ?? undefined,
        year:
          edu.endYear?.getFullYear()?.toString() || edu.startYear?.getFullYear()?.toString() || '',
        gpa: edu.gpa ?? undefined,
        description: edu.description ?? undefined,
      }));
    }

    // Map selected certifications - Handle both string[] (legacy) and object[] (new)
    let certifications = (tailoredProfile.selected_certificates || [])
      .map((cert: any) => {
        // Handle string format (legacy LLM output)
        if (typeof cert === 'string') {
          // Find matching certificate in profile by name
          const matchedCert = profile.certificates.find(
            (c) => c.name.toLowerCase() === cert.toLowerCase(),
          );
          if (matchedCert) {
            return {
              id: matchedCert.id,
              name: matchedCert.name,
              issuer: matchedCert.issuer,
              date: matchedCert.issueDate ? formatDate(matchedCert.issueDate, language) : undefined,
            };
          }
          // Fallback: use string as name with unknown issuer
          return {
            id: 'cert-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            name: cert,
            issuer: 'Unknown',
          };
        }
        // Handle object format (new LLM output)
        if (!cert.name) return null;
        // Find original certificate from profile by ID to enrich data
        const originalCert = profile.certificates.find((c) => c.id === cert.profileCertificateId);
        return {
          id: cert.profileCertificateId || 'cert-' + Date.now(),
          name: originalCert?.name || cert.name,
          issuer: originalCert?.issuer || cert.issuer || 'Unknown',
          date:
            (originalCert?.issueDate ? formatDate(originalCert.issueDate, language) : undefined) ||
            cert.issueDate ||
            undefined,
        };
      })
      .filter(Boolean);

    // Fallback: If no certifications from LLM, use all profile certificates
    if (certifications.length === 0 && profile.certificates.length > 0) {
      certifications = profile.certificates.map((cert) => ({
        id: cert.id,
        name: cert.name,
        issuer: cert.issuer,
        date: cert.issueDate ? formatDate(cert.issueDate, language) : undefined,
      }));
    }

    // Map languages - ALWAYS use ALL profile languages (not LLM-filtered)
    // Normalize proficiency levels to translation keys for multilingual support
    const languages = profile.languages.map((lang) => ({
      name: lang.name,
      level: normalizeProficiencyLevel(lang.level),
    }));

    // Build full address from components
    const addressParts: string[] = [];
    if (profile.street) addressParts.push(profile.street);
    if (profile.postalCode || profile.city) {
      addressParts.push(`${profile.postalCode || ''} ${profile.city || ''}`.trim());
    }
    if (profile.country) addressParts.push(profile.country);
    const fullAddress = addressParts.join(', ');

    return {
      candidateName,
      email: profile.user.email,
      phone: profile.phone || undefined,
      street: profile.street || undefined,
      postalCode: profile.postalCode || undefined,
      city: profile.city || undefined,
      country: profile.country || undefined,
      fullAddress: fullAddress || undefined,
      linkedin: sanitizeUrl(profile.linkedinUrl),
      github: sanitizeUrl(profile.githubUrl),
      // Priority: rewritten_summary > customized_summary > profile.summary
      summary:
        rewrittenProfile?.rewritten_summary ||
        tailoredProfile.customized_summary ||
        profile.summary ||
        undefined,
      skillCategories,
      experiences,
      projects: projects.length > 0 ? projects : undefined,
      education: education.length > 0 ? education : undefined,
      certifications: certifications.length > 0 ? certifications : undefined,
      languages: languages.length > 0 ? languages : undefined,
    };
  }
}
