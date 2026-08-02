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
import { AtsKeywordsOutputDto } from '../keywords/dto/ats-keywords.dto';
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
import { serializeProfileForLlm, serializeJobPostingForLlm } from './serialize.util';
import { matchAtsKeywordsToProfile, selectKeywordsToWeave, isKeywordPresent } from './keyword-coverage.util';
import {
  countResumeStyleViolations,
  evaluateResumeStyleRewrite,
  isValidResumeEdit,
} from './resume-editor.util';
import {
  buildSalutation,
  isValidJobFacts,
  normalizeJobFacts,
  type JobFactsDto,
} from './job-facts.util';
import { isValidTailoredProfile, isDegradedTailoredProfile } from './tailored-profile.util';
import {
  evaluateShortenRewrite,
  evaluateStyleRewrite,
  lintCoverLetterLength,
  lintGeneratedStyle,
} from './style-lint.util';
import {
  DEFAULT_COVER_LETTER_LENGTH,
  GENERATION_SYSTEM_ANCHOR,
  resolveCoverLetterBudget,
} from './constants';
import { convertCoverLetterToHtml } from './cover-letter-html.util';
import { mapApplicationToResponseDto } from './application-response.util';

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
   * Match job keywords against pre-extracted profile keywords (deterministic matching)
   * @param jobKeywords Keywords extracted from job posting
   * @param profileKeywords Pre-extracted keywords from profile (cached)
   * @returns Merged keywords with 'source' field indicating match status
   */
  private matchJobAndProfileKeywords(
    jobKeywords: any,
    profileKeywords: any,
  ): { matched: any; unmatched: any; matchCount: number } {
    if (!jobKeywords || !profileKeywords) {
      return { matched: jobKeywords || {}, unmatched: {}, matchCount: 0 };
    }

    const matched: any = {
      hard_skills: [],
      tools_and_tech: [],
      domains: [],
      methodologies: [],
    };

    const unmatched: any = {
      hard_skills: [],
      tools_and_tech: [],
      domains: [],
      methodologies: [],
    };

    let matchCount = 0;

    // Helper to normalize keywords for comparison
    const normalizeKeyword = (kw: string) => kw.toLowerCase().trim();

    // Build profile keyword sets for fast lookup
    const profileKeywordSets = {
      hard_skills: new Set(
        (profileKeywords.hard_skills || []).map((k: any) => normalizeKeyword(k.keyword)),
      ),
      tools_and_tech: new Set(
        (profileKeywords.tools_and_tech || []).map((k: any) => normalizeKeyword(k.keyword)),
      ),
      domains: new Set(
        (profileKeywords.domains || []).map((k: any) => normalizeKeyword(k.keyword)),
      ),
      methodologies: new Set(
        (profileKeywords.methodologies || []).map((k: any) => normalizeKeyword(k.keyword)),
      ),
    };

    // Match each category
    for (const category of ['hard_skills', 'tools_and_tech', 'domains', 'methodologies']) {
      const jobCategoryKeywords = jobKeywords[category] || [];
      const profileSet = profileKeywordSets[category as keyof typeof profileKeywordSets];

      for (const jobKw of jobCategoryKeywords) {
        const normalized = normalizeKeyword(jobKw.keyword);
        const isMatch = profileSet.has(normalized);

        if (isMatch) {
          matched[category].push({ ...jobKw, source: 'both' });
          matchCount++;
        } else {
          unmatched[category].push({ ...jobKw, source: 'job' });
        }
      }
    }

    return { matched, unmatched, matchCount };
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

    // 8. Run single-LLM pipeline to generate everything
    try {
      const startTime = Date.now();

      // Step 1: Select relevant profile data (in parallel with job-facts
      // extraction (#5) — both only depend on the job posting, so no added
      // critical-path latency).
      this.logger.log('Step 1: Selecting relevant profile data...');
      const [tailoredProfile, jobFacts] = await Promise.all([
        this.selectTailoredProfile(profile, jobPosting, detectedLanguage, userId),
        shouldGenerateCoverLetter
          ? this.extractJobFacts(jobPosting, detectedLanguage, userId)
          : Promise.resolve(null),
      ]);
      this.logger.log(
        `Profile tailored: ${tailoredProfile.selected_hard_skills.length} hard skills, ${tailoredProfile.selected_experiences.length} experiences`,
      );

      // Step 2: Parallel generation - Cover letter + Resume rewrite + ATS keywords
      this.logger.log(
        'Step 2: Parallel generation (cover letter, resume rewrite, ATS keywords)...',
      );

      // Prepare parallel promises
      const coverLetterPromise = shouldGenerateCoverLetter
        ? this.llmService.callText(
            'v1/cover-letter.md',
            {
              job: this.serializeJobPosting(jobPosting),
              tailoredProfile,
              jobFacts: normalizeJobFacts(jobFacts),
              salutation: buildSalutation(jobFacts, detectedLanguage),
              language: detectedLanguage,
              lengthBudget: coverLetterBudget,
              userId,
              jobPostingId: jobPosting.id,
            },
            { systemMessage: GENERATION_SYSTEM_ANCHOR },
          )
        : Promise.resolve(null);

      const resumeRewritePromise = this.callResumeRewrite(
        tailoredProfile,
        jobPosting,
        detectedLanguage,
        userId,
      );

      const atsKeywordsPromise = this.llmService
        .callJson('v1/ats-keywords.md', {
          job: this.serializeJobPosting(jobPosting),
          userId,
          jobPostingId: jobPosting.id,
        })
        .then((extractedKeywords) => {
          this.logger.log('Step 2b: Matching keywords against profile (deterministic)...');
          return this.matchKeywordsAgainstProfile(extractedKeywords, profile);
        })
        .catch((error) => {
          this.logger.warn('Failed to extract ATS keywords, continuing without them', error);
          return null;
        });

      // Execute all in parallel
      const [coverLetterMarkdown, rewrittenProfile, atsKeywords] = await Promise.all([
        coverLetterPromise,
        resumeRewritePromise,
        atsKeywordsPromise,
      ]);

      // Log results
      if (rewrittenProfile) {
        this.logger.log(
          `Resume rewrite completed: ${rewrittenProfile.rewritten_experiences?.length || 0} experiences, ${rewrittenProfile.rewritten_projects?.length || 0} projects`,
        );
      }
      if (atsKeywords) {
        const totalKeywords =
          (atsKeywords.hard_skills?.length || 0) + (atsKeywords.soft_skills?.length || 0);
        const matchedCount = this.countMatchedKeywords(atsKeywords);
        this.logger.log(
          `Extracted ${totalKeywords} ATS keywords (${matchedCount} matched in profile)`,
        );
      }

      // Editor pass (#1, resume): critique + revise the rewritten resume payload
      // (summary + achievements), preserving every profile ID. Graceful fallback.
      const editedRewrittenProfile = await this.runResumeEditorPass(
        rewrittenProfile,
        tailoredProfile,
        detectedLanguage,
        userId,
        jobPosting,
      );

      // Style rewrite ("teeth", résumé): surgically fix the AI clichés the linter
      // flags in the résumé prose. Guarded (JSON→JSON, ID-preserving, strictly
      // cleaner) — the analogue of the cover-letter teeth. Falls back to the
      // edited payload otherwise. See runResumeStyleRewritePass.
      const styledRewrittenProfile = await this.runResumeStyleRewritePass(
        editedRewrittenProfile,
        tailoredProfile,
        detectedLanguage,
        userId,
        jobPosting,
      );

      // Step 3: Convert tailoredProfile to JSON format for frontend editor
      this.logger.log('Step 3: Converting resume to JSON format for editor...');
      const resumeJson = this.convertTailoredProfileToResumeJson(
        profile,
        tailoredProfile,
        styledRewrittenProfile,
        detectedLanguage,
      );

      // Debug: Log the first experience achievements to verify German content is saved
      const firstExp = resumeJson.experiences?.[0];
      if (firstExp) {
        this.logger.debug(
          `Saving resumeJson - First experience "${firstExp.title}": achievements=[${firstExp.achievements
            ?.slice(0, 2)
            .map((a: string) => a.substring(0, 40) + '...')
            .join(' | ')}]`,
        );
      }

      // Step 4: Update application with generated content
      // Note: resumeText stores JSON for editor, Markdown can be regenerated from tailoredProfile
      // Editor pass (#1): one critique-and-revise pass over the draft cover letter.
      const editedCoverLetterMarkdown = shouldGenerateCoverLetter
        ? await this.runCoverLetterEditorPass(
            coverLetterMarkdown,
            jobPosting,
            tailoredProfile,
            detectedLanguage,
            coverLetterBudget,
            userId,
          )
        : coverLetterMarkdown;

      // Keyword weave (#6): close profile-supported priority-1 keyword gaps.
      const wovenCoverLetterMarkdown = shouldGenerateCoverLetter
        ? await this.runKeywordWeavePass(
            editedCoverLetterMarkdown,
            atsKeywords,
            jobPosting,
            tailoredProfile,
            detectedLanguage,
            coverLetterBudget,
            userId,
          )
        : editedCoverLetterMarkdown;

      // Style rewrite ("teeth"): surgically fix the AI clichés + German hedging
      // the deterministic linter flags. Guarded — only fires on a real violation
      // and only keeps a strictly-cleaner, non-gutted result; otherwise falls
      // back to the woven draft. Never fabricates (see runStyleRewritePass).
      const polishedCoverLetterMarkdown = shouldGenerateCoverLetter
        ? await this.runStyleRewritePass(
            wovenCoverLetterMarkdown,
            tailoredProfile,
            detectedLanguage,
            userId,
            jobPosting,
          )
        : wovenCoverLetterMarkdown;

      // Length governor: if the letter still overruns its word budget after the
      // last content-modifying pass, one guarded shorten pass cuts redundancy
      // and filler. Fires only on a measured overrun; falls back to the
      // pre-shorten draft on any guard failure (see runLengthGovernorPass).
      const governedCoverLetterMarkdown = shouldGenerateCoverLetter
        ? await this.runLengthGovernorPass(
            polishedCoverLetterMarkdown,
            atsKeywords,
            tailoredProfile,
            detectedLanguage,
            coverLetterBudget,
            userId,
            jobPosting,
          )
        : polishedCoverLetterMarkdown;

      // Grounding check (#7): flag any fabricated impact numbers (non-destructive).
      this.runGroundingCheck(
        application.id,
        { resume: JSON.stringify(resumeJson), coverLetter: governedCoverLetterMarkdown },
        profile,
      );

      // Style check: flag forbidden AI clichés + German hedging (non-destructive).
      this.runStyleCheck(
        application.id,
        { resume: JSON.stringify(resumeJson), coverLetter: governedCoverLetterMarkdown },
        detectedLanguage,
        coverLetterBudget,
      );

      // Convert cover letter Markdown to HTML for proper PDF rendering
      const coverLetterHtml = convertCoverLetterToHtml(governedCoverLetterMarkdown);

      const updatedApplication = await this.prisma.application.update({
        where: { id: application.id },
        data: {
          resumeText: JSON.stringify(resumeJson), // Store JSON for editor
          coverLetterText: coverLetterHtml,
          atsKeywords: atsKeywords as any,
          tailoredProfile: tailoredProfile as any,
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
      // 3. Call skill selector (ONCE per application), in parallel with the
      // job-facts extraction (#5) used for the cover letter.
      emitProgress(20, 'Wähle relevante Profildaten aus...');
      this.logger.log('Step 1: Selecting relevant profile data...');
      const [tailoredProfile, jobFacts] = await Promise.all([
        this.selectTailoredProfile(profile, jobPosting, language, userId),
        shouldGenerateCoverLetter
          ? this.extractJobFacts(jobPosting, language, userId)
          : Promise.resolve(null),
      ]);
      this.logger.log(
        `Profile tailored: ${tailoredProfile.selected_hard_skills.length} hard skills, ${tailoredProfile.selected_experiences.length} experiences`,
      );

      // 4. Generate resume (uses tailored profile)
      emitProgress(40, 'Generiere Lebenslauf mit KI...');
      this.logger.log('Step 2: Generating resume...');
      const resumeMarkdown = await this.llmService.callText('v1/resume.md', {
        job: this.serializeJobPosting(jobPosting),
        tailoredProfile,
        language,
        userId,
        jobPostingId: jobPosting.id,
      });

      // 5. Generate cover letter (if enabled)
      let coverLetterMarkdown: string | null = null;
      if (shouldGenerateCoverLetter) {
        emitProgress(60, 'Generiere Anschreiben mit KI...');
        this.logger.log('Step 3: Generating cover letter...');
        coverLetterMarkdown = await this.llmService.callText('v1/cover-letter.md', {
          job: this.serializeJobPosting(jobPosting),
          tailoredProfile,
          jobFacts: normalizeJobFacts(jobFacts),
          salutation: buildSalutation(jobFacts, language),
          language,
          lengthBudget: coverLetterBudget,
          userId,
          jobPostingId: jobPosting.id,
        });
      } else {
        emitProgress(60, 'Überspringe Anschreiben-Generierung...');
        this.logger.log('Skipping cover letter generation');
      }

      // 6. Extract ATS keywords with optimized two-phase matching
      emitProgress(80, 'Extrahiere ATS-Keywords...');
      this.logger.log('Step 4: Extracting and matching ATS keywords...');
      let atsKeywords: AtsKeywordsOutputDto | null = null;
      try {
        // Phase 1: Extract job keywords using LLM
        const jobKeywords = await this.llmService.callJson<AtsKeywordsOutputDto>(
          'v1/ats-keywords.md',
          {
            job: this.serializeJobPosting(jobPosting),
            tailoredProfile,
            userId,
            jobPostingId: jobPosting.id,
          },
        );

        const jobKeywordCount =
          (jobKeywords.hard_skills?.length || 0) +
          (jobKeywords.tools_and_tech?.length || 0) +
          (jobKeywords.domains?.length || 0) +
          (jobKeywords.methodologies?.length || 0);
        this.logger.log(`Extracted ${jobKeywordCount} job keywords`);

        // Phase 2: Load cached profile keywords (pre-extracted on profile update)
        const cachedProfileKeywords = profile.profileKeywords as any;

        if (cachedProfileKeywords) {
          // Deterministic keyword matching (no LLM needed)
          const { matched, unmatched, matchCount } = this.matchJobAndProfileKeywords(
            jobKeywords,
            cachedProfileKeywords,
          );

          // Merge matched and unmatched keywords for final result
          atsKeywords = {
            hard_skills: [...matched.hard_skills, ...unmatched.hard_skills],
            tools_and_tech: [...matched.tools_and_tech, ...unmatched.tools_and_tech],
            domains: [...matched.domains, ...unmatched.domains],
            methodologies: [...matched.methodologies, ...unmatched.methodologies],
          };

          this.logger.log(
            `Matched ${matchCount}/${jobKeywordCount} keywords from cached profile keywords`,
          );
        } else {
          // Fallback: No cached profile keywords, use job keywords as-is
          this.logger.warn('No cached profile keywords found, skipping matching');
          atsKeywords = jobKeywords;
        }
      } catch (error) {
        this.logger.warn('Failed to extract ATS keywords, continuing without them', error);
      }

      // 7. Persist results
      // Editor pass (#1): critique-and-revise the draft cover letter.
      if (shouldGenerateCoverLetter) {
        emitProgress(90, 'Anschreiben wird geprüft und verfeinert...');
      }
      const editedCoverLetter = shouldGenerateCoverLetter
        ? await this.runCoverLetterEditorPass(
            coverLetterMarkdown,
            jobPosting,
            tailoredProfile,
            language,
            coverLetterBudget,
            userId,
          )
        : coverLetterMarkdown;

      // Keyword weave (#6): close profile-supported priority-1 keyword gaps.
      // No-ops gracefully when atsKeywords has no priority-1 'both' hard skills.
      const wovenCoverLetter = shouldGenerateCoverLetter
        ? await this.runKeywordWeavePass(
            editedCoverLetter,
            atsKeywords,
            jobPosting,
            tailoredProfile,
            language,
            coverLetterBudget,
            userId,
          )
        : editedCoverLetter;

      // Length governor: one guarded shorten pass when the letter overruns its
      // word budget after the last content-modifying pass (graceful fallback).
      const governedCoverLetter = shouldGenerateCoverLetter
        ? await this.runLengthGovernorPass(
            wovenCoverLetter,
            atsKeywords,
            tailoredProfile,
            language,
            coverLetterBudget,
            userId,
            jobPosting,
          )
        : wovenCoverLetter;

      // Grounding check (#7): flag fabricated impact numbers (non-destructive).
      this.runGroundingCheck(
        applicationId,
        { resume: resumeMarkdown, coverLetter: governedCoverLetter },
        profile,
      );

      // Convert cover letter Markdown to HTML for proper PDF rendering
      const coverLetterHtml = convertCoverLetterToHtml(governedCoverLetter);

      emitProgress(95, 'Speichere Ergebnisse...');
      const updated = await this.prisma.application.update({
        where: { id: applicationId },
        data: {
          resumeText: resumeMarkdown,
          coverLetterText: coverLetterHtml,
          atsKeywords: atsKeywords as any,
          tailoredProfile: tailoredProfile as any,
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
   * Deterministically match extracted keywords against profile data.
   * Delegates to the shared pure matcher (`keyword-coverage.util.ts`) so the
   * offline eval harness (#10) measures coverage with the identical matcher.
   * Returns keywords with a "source" field: "job" (missing) or "both" (matched).
   */
  private matchKeywordsAgainstProfile(extractedKeywords: any, profile: ProfileWithRelations): any {
    const matched = matchAtsKeywordsToProfile(extractedKeywords, profile);
    this.logger.debug(
      `Matched ${matched.hard_skills?.length || 0} hard_skills against profile ` +
        `(${this.countMatchedKeywords(matched)} supported)`,
    );
    return matched;
  }

  /**
   * Count how many keywords are matched in profile
   * SIMPLIFIED: Only hard_skills now (soft skills removed)
   */
  private countMatchedKeywords(keywords: any): number {
    const allKeywords = keywords.hard_skills || [];
    return allKeywords.filter((kw) => kw.source === 'both').length;
  }

  /**
   * Serialize profile data for LLM consumption.
   * Delegates to the shared pure serializer so the offline eval harness (#10)
   * renders identical prompt inputs. See `serialize.util.ts`.
   */
  private serializeProfile(profile: ProfileWithRelations): Record<string, any> {
    return serializeProfileForLlm(profile);
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
   * Run the skill-selector and validate the hand-off before the prose calls
   * consume it.
   *
   * This is the pipeline's only non-optional producer: it runs first and feeds
   * BOTH `cover-letter` and `resume-rewrite`. `job-facts` and `ats-keywords`
   * degrade to null; this cannot. It also has no strict `json_schema`, so when
   * `LLM_FAST_MODEL` routes it to a cheaper model a malformed or gutted payload
   * is retried once on the default model — the fast model is an optimization,
   * the default is the floor.
   */
  private async selectTailoredProfile(
    profile: ProfileWithRelations,
    jobPosting: JobPosting,
    language: string,
    userId: string,
  ): Promise<TailoredProfileDto> {
    const TEMPLATE = 'v1/skill-selector.md';
    const variables = {
      profile: this.serializeProfile(profile),
      job: this.serializeJobPosting(jobPosting),
      language,
      userId,
      jobPostingId: jobPosting.id,
    };
    const sourceExperienceCount = profile.experiences?.length ?? 0;

    const attempt = async (model?: string): Promise<TailoredProfileDto | string> => {
      try {
        const raw = await this.llmService.callJson<TailoredProfileDto>(TEMPLATE, variables, {
          temperature: 0.2, // deterministic skill matching
          maxTokens: 3000,
          ...(model ? { model } : {}),
        });
        if (!isValidTailoredProfile(raw)) return 'malformed payload';
        if (isDegradedTailoredProfile(raw, sourceExperienceCount)) {
          return 'no skills selected or every experience dropped';
        }
        return raw;
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    };

    const first = await attempt();
    if (typeof first !== 'string') return first;

    if (!this.llmService.isFastRouted(TEMPLATE)) {
      throw new Error(`Skill selection failed: ${first}`);
    }

    this.logger.warn(
      `Skill selection failed on the fast model (${first}); escalating to ${this.llmService.defaultModel}`,
    );
    const escalated = await attempt(this.llmService.defaultModel);
    if (typeof escalated === 'string') {
      throw new Error(`Skill selection failed on both models: ${escalated}`);
    }
    return escalated;
  }

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
   * Call resume-rewrite LLM with graceful degradation
   * If the LLM call fails, returns null and the pipeline continues with original profile data
   */
  private async callResumeRewrite(
    tailoredProfile: TailoredProfileDto,
    jobPosting: any,
    language: string,
    userId: string,
  ): Promise<RewrittenProfileDto | null> {
    try {
      const rewrittenProfile = await this.llmService.callJson<RewrittenProfileDto>(
        'v1/resume-rewrite.md',
        {
          tailoredProfile,
          job: this.serializeJobPosting(jobPosting),
          language,
          userId,
          jobPostingId: jobPosting.id,
        },
        {
          temperature: 0.35, // Balanced: consistent but creative
          maxTokens: 2000,
          systemMessage: GENERATION_SYSTEM_ANCHOR,
        },
      );

      // Validate response structure
      if (!rewrittenProfile || typeof rewrittenProfile !== 'object') {
        this.logger.warn('Resume rewrite returned invalid structure, using original profile data');
        return null;
      }

      return rewrittenProfile;
    } catch (error) {
      // Graceful degradation: log warning and continue with original data
      this.logger.warn(
        `Resume rewrite LLM call failed, continuing with original profile data: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Resume editor pass (#1) — one critique-and-revise pass over the rewritten
   * resume payload (summary + achievements), mirroring the cover-letter editor.
   * JSON → JSON. Graceful degradation: on any failure, an invalid edit, or an
   * edit that drops/changes a `profileExperienceId` / `profileProjectId` (which
   * would silently lose the rewritten content), we keep the pre-edit payload.
   */
  private async runResumeEditorPass(
    rewrittenProfile: RewrittenProfileDto | null,
    tailoredProfile: TailoredProfileDto,
    language: string,
    userId: string,
    jobPosting: JobPosting,
  ): Promise<RewrittenProfileDto | null> {
    if (!rewrittenProfile) return rewrittenProfile;

    try {
      const edited = await this.llmService.callJson<RewrittenProfileDto>(
        'v1/editor-resume.md',
        {
          rewrittenProfile,
          tailoredProfile,
          job: this.serializeJobPosting(jobPosting),
          language,
          userId,
          jobPostingId: jobPosting.id,
        },
        { temperature: 0.35, maxTokens: 2000, systemMessage: GENERATION_SYSTEM_ANCHOR },
      );

      // Guard: the edit MUST preserve every ID and not gut an entry. Otherwise
      // the rewritten (often translated) content can't map back to the profile.
      if (!isValidResumeEdit(rewrittenProfile, edited)) {
        this.logger.warn(
          'Resume editor pass produced an invalid or ID-dropping edit; keeping pre-edit payload',
        );
        return rewrittenProfile;
      }

      this.logger.log('Resume editor pass applied');
      return edited;
    } catch (error) {
      this.logger.warn(`Resume editor pass failed; keeping pre-edit payload: ${error.message}`);
      return rewrittenProfile;
    }
  }

  /**
   * Editor/critique pass (#1) — one LLM call that revises a draft cover letter
   * against the editing rubric (de-cliché, concrete company reference, no
   * Konjunktiv, honest metrics). Graceful degradation: on any failure or a
   * suspiciously short result we keep the original draft so generation never
   * breaks.
   */
  private async runCoverLetterEditorPass(
    draft: string | null,
    jobPosting: JobPosting,
    tailoredProfile: TailoredProfileDto,
    language: string,
    lengthBudget: number,
    userId: string,
  ): Promise<string | null> {
    if (!draft || draft.trim() === '') return draft;

    try {
      const edited = await this.llmService.callText(
        'v1/editor-cover-letter.md',
        {
          draft,
          job: this.serializeJobPosting(jobPosting),
          tailoredProfile,
          language,
          lengthBudget,
          userId,
          jobPostingId: jobPosting.id,
        },
        { temperature: 0.4, maxTokens: 1500, systemMessage: GENERATION_SYSTEM_ANCHOR },
      );

      // Guard: the editor must not gut the letter. If it returns empty or less
      // than half the draft length, treat it as a failure and keep the draft.
      if (!edited || edited.trim().length < draft.trim().length * 0.5) {
        this.logger.warn(
          'Cover letter editor pass returned suspiciously short output; keeping original draft',
        );
        return draft;
      }

      this.logger.log('Cover letter editor pass applied');
      return edited;
    } catch (error) {
      this.logger.warn(
        `Cover letter editor pass failed; keeping original draft: ${error.message}`,
      );
      return draft;
    }
  }

  /**
   * Coverage-driven keyword weave (#6) — one guarded pass that weaves the
   * priority-1, profile-supported keywords still MISSING from the cover letter
   * into the existing prose. Never adds a keyword the profile doesn't support
   * (that would be fabrication and would defeat the grounding validator), never
   * stuffs, and never invents facts.
   *
   * Skips the LLM call entirely when there is no profile-supported gap. Graceful
   * degradation: on any failure or a suspiciously short result we keep the
   * pre-weave draft so generation never breaks.
   */
  private async runKeywordWeavePass(
    draft: string | null,
    atsKeywords: any,
    jobPosting: JobPosting,
    tailoredProfile: TailoredProfileDto,
    language: string,
    lengthBudget: number,
    userId: string,
  ): Promise<string | null> {
    if (!draft || draft.trim() === '') return draft;

    const keywords = selectKeywordsToWeave(atsKeywords, draft);
    if (keywords.length === 0) {
      this.logger.debug(
        'Keyword weave: no profile-supported priority-1 gaps in cover letter; skipping',
      );
      return draft;
    }

    try {
      const woven = await this.llmService.callText(
        'v1/keyword-weave.md',
        {
          draft,
          keywords,
          tailoredProfile,
          job: this.serializeJobPosting(jobPosting),
          language,
          lengthBudget,
          userId,
          jobPostingId: jobPosting.id,
        },
        { temperature: 0.3, maxTokens: 1500, systemMessage: GENERATION_SYSTEM_ANCHOR },
      );

      // Guard: a surgical weave must not gut the letter. If it returns empty or
      // shrinks below 60% of the draft, treat it as a failure and keep the draft.
      if (!woven || woven.trim().length < draft.trim().length * 0.6) {
        this.logger.warn(
          'Keyword weave returned suspiciously short output; keeping pre-weave draft',
        );
        return draft;
      }

      this.logger.log(`Keyword weave applied (${keywords.length}: ${keywords.join(', ')})`);
      return woven;
    } catch (error) {
      this.logger.warn(`Keyword weave failed; keeping pre-weave draft: ${error.message}`);
      return draft;
    }
  }

  /**
   * Style rewrite ("teeth") — one guarded pass that surgically rephrases the
   * forbidden AI clichés + German Konjunktiv/hedging the deterministic linter
   * flags into confident, concrete language. This is the enforcement step the
   * `style-lint.util` deliberately left out: the linter detects, this fixes.
   *
   * Fully guarded so it can never ship a worse letter:
   * - Skips the LLM call entirely when the draft is already clean.
   * - Carries the `GENERATION_SYSTEM_ANCHOR` so the rewrite can't fabricate.
   * - Accepts the rewrite ONLY when `evaluateStyleRewrite` confirms it both
   *   preserves the draft's length and strictly reduces the violation count;
   *   otherwise keeps the pre-rewrite draft. Never throws.
   */
  private async runStyleRewritePass(
    draft: string | null,
    tailoredProfile: TailoredProfileDto,
    language: string,
    userId: string,
    jobPosting: JobPosting,
  ): Promise<string | null> {
    if (!draft || draft.trim() === '') return draft;

    const before = lintGeneratedStyle(draft, language);
    if (before.total === 0) {
      this.logger.debug('Style rewrite: cover letter already clean; skipping');
      return draft;
    }

    const violations = [...before.aiPhrases, ...before.hedging];
    try {
      const rewritten = await this.llmService.callText(
        'v1/style-rewrite.md',
        { draft, violations, tailoredProfile, job: this.serializeJobPosting(jobPosting), language, userId, jobPostingId: jobPosting.id },
        { temperature: 0.3, maxTokens: 1500, systemMessage: GENERATION_SYSTEM_ANCHOR },
      );

      const decision = evaluateStyleRewrite(draft, rewritten, language);
      if (!decision.accept) {
        this.logger.warn(
          `Style rewrite rejected (${decision.reason}, ${decision.before}→${decision.after} violation(s)); keeping pre-rewrite draft`,
        );
        return draft;
      }

      this.logger.log(
        `Style rewrite applied (${decision.before}→${decision.after} violation(s): ${violations.join(', ')})`,
      );
      return rewritten;
    } catch (error) {
      this.logger.warn(`Style rewrite failed; keeping pre-rewrite draft: ${error.message}`);
      return draft;
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
    tailoredProfile: TailoredProfileDto,
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
          currentWords: lint.words,
          tailoredProfile,
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
   * Résumé style rewrite ("teeth", JSON→JSON) — the résumé analogue of
   * `runStyleRewritePass`. Surgically rephrases the forbidden AI clichés the
   * deterministic linter flags in the résumé prose (summary + achievements +
   * highlights) into concrete language, leaving every other field — and every
   * `profileExperienceId` / `profileProjectId` — untouched.
   *
   * Fully guarded so it can never ship a worse or structurally-broken payload:
   * - Skips the LLM call when the résumé prose is already clean.
   * - Carries the `GENERATION_SYSTEM_ANCHOR` so the rewrite can't fabricate.
   * - Accepts the rewrite ONLY when `evaluateResumeStyleRewrite` confirms it is a
   *   valid, ID-preserving `RewrittenProfileDto` AND strictly reduces the
   *   violation count; otherwise keeps the pre-rewrite payload. Never throws.
   */
  private async runResumeStyleRewritePass(
    rewrittenProfile: RewrittenProfileDto | null,
    tailoredProfile: TailoredProfileDto,
    language: string,
    userId: string,
    jobPosting: JobPosting,
  ): Promise<RewrittenProfileDto | null> {
    if (!rewrittenProfile) return rewrittenProfile;

    const before = countResumeStyleViolations(rewrittenProfile, language);
    if (before.total === 0) {
      this.logger.debug('Résumé style rewrite: prose already clean; skipping');
      return rewrittenProfile;
    }

    const violations = [...before.aiPhrases, ...before.hedging];
    const verbFirstBullets = before.verbFirstBullets;
    try {
      const edited = await this.llmService.callJson<RewrittenProfileDto>(
        'v1/resume-style-rewrite.md',
        { rewrittenProfile, tailoredProfile, job: this.serializeJobPosting(jobPosting), violations, verbFirstBullets, language, userId, jobPostingId: jobPosting.id },
        { temperature: 0.3, maxTokens: 2000, systemMessage: GENERATION_SYSTEM_ANCHOR },
      );

      const decision = evaluateResumeStyleRewrite(rewrittenProfile, edited, language);
      if (!decision.accept) {
        this.logger.warn(
          `Résumé style rewrite rejected (${decision.reason}, ${decision.before}→${decision.after} violation(s)); keeping pre-rewrite payload`,
        );
        return rewrittenProfile;
      }

      this.logger.log(
        `Résumé style rewrite applied (${decision.before}→${decision.after} violation(s); ${violations.length} phrase(s), ${verbFirstBullets.length} verb-first bullet(s))`,
      );
      return edited;
    } catch (error) {
      this.logger.warn(
        `Résumé style rewrite failed; keeping pre-rewrite payload: ${error.message}`,
      );
      return rewrittenProfile;
    }
  }

  /**
   * Grounding check (#7) — deterministic, non-destructive. Logs a warning when
   * the generated documents contain impact numbers that don't appear anywhere
   * in the source profile (likely fabrications). Never throws.
   */
  private runGroundingCheck(
    applicationId: string,
    generated: { resume?: string | null; coverLetter?: string | null },
    profile: ProfileWithRelations,
  ): void {
    try {
      const report = this.groundingValidator.validate(generated, profile);
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
