import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LLMService } from '../llm/llm.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { PdfParser } from '../job-postings/parsers/pdf.parser';
import { DocxParser } from '../job-postings/parsers/docx.parser';
import { ErrorCode } from '../common/constants/error-codes';
import { NotFoundWithCode } from '../common/exceptions/coded-http.exception';
import { CreateValidationDto } from './dto/create-validation.dto';
import type {
  ApplicationValidationResult,
  Validation as ValidationRecord,
  ValidationSummary,
} from '@smart-apply/shared';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LLMService,
    private readonly subscriptionService: SubscriptionService,
    private readonly pdfParser: PdfParser,
    private readonly docxParser: DocxParser,
  ) {}

  /**
   * Extract plain text from an uploaded PDF or DOCX so the user can run a check
   * on an existing document without copy-pasting. No LLM, no persistence.
   */
  async extractText(buffer: Buffer, mimeType: string): Promise<{ text: string }> {
    let text: string;
    if (mimeType === 'application/pdf') {
      text = await this.pdfParser.parse(buffer);
    } else if (mimeType === DOCX_MIME) {
      text = await this.docxParser.parse(buffer);
    } else {
      throw new BadRequestException(
        'Nicht unterstützter Dateityp. Bitte lade eine PDF- oder DOCX-Datei hoch.',
      );
    }
    return { text: text.trim() };
  }

  /**
   * Run a standalone AI quality + ATS check on an application the user created
   * OUTSIDE Applo (their own résumé + optional cover letter + optional
   * job context), persist it, and return the record.
   *
   * Metered: the controller's `UsageLimitGuard` + `@CheckUsage('validation')`
   * enforces the monthly cap (Free: 5, Pro+: unlimited) BEFORE this runs. Usage
   * is recorded only AFTER a successful run, so a failed check never burns quota.
   */
  async create(userId: string, dto: CreateValidationDto): Promise<ValidationRecord> {
    const language = dto.language?.trim() || '';

    const raw = await this.llmService.callJson<ApplicationValidationResult>(
      'v1/application-validation.md',
      {
        resume: dto.resumeText,
        coverLetter: dto.coverLetterText ?? '',
        jobContext: dto.jobContext ?? '',
        language,
      },
      { temperature: 0.2, maxTokens: 2000 },
    );

    const result = this.normalizeValidationResult(raw);

    const record = await this.prisma.validation.create({
      data: {
        userId,
        title: dto.title?.trim() || null,
        resumeText: dto.resumeText,
        coverLetterText: dto.coverLetterText ?? null,
        jobContext: dto.jobContext ?? null,
        language: language || null,
        result: result as unknown as Prisma.InputJsonValue,
        score: result.overallScore,
      },
    });

    // Record usage AFTER success so a failed check doesn't burn the cap.
    // Best-effort: a metering hiccup must not fail the user-facing response.
    try {
      await this.subscriptionService.recordUsage(userId, 'validation');
    } catch (usageError) {
      this.logger.warn(`Failed to record validation usage for user ${userId}`, usageError);
    }

    this.logger.log(
      `Validation ${record.id} for user ${userId} (overall=${result.overallScore}, verdict=${result.verdict})`,
    );

    return this.toRecord(record);
  }

  /** History list (lightweight summaries, newest first). */
  async findAll(userId: string): Promise<ValidationSummary[]> {
    const rows = await this.prisma.validation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, title: true, score: true, result: true, createdAt: true },
    });

    return rows.map((r) => ({
      id: r.id,
      title: r.title ?? undefined,
      score: r.score,
      verdict: (r.result as unknown as ApplicationValidationResult).verdict,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /** Single check (full inputs + result). */
  async findOne(userId: string, id: string): Promise<ValidationRecord> {
    const record = await this.prisma.validation.findFirst({ where: { id, userId } });
    if (!record) {
      throw new NotFoundWithCode(ErrorCode.NOT_FOUND, 'Prüfung nicht gefunden.');
    }
    return this.toRecord(record);
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.validation.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundWithCode(ErrorCode.NOT_FOUND, 'Prüfung nicht gefunden.');
    }
    await this.prisma.validation.delete({ where: { id } });
  }

  private toRecord(row: {
    id: string;
    title: string | null;
    resumeText: string;
    coverLetterText: string | null;
    jobContext: string | null;
    language: string | null;
    result: Prisma.JsonValue;
    score: number;
    createdAt: Date;
  }): ValidationRecord {
    return {
      id: row.id,
      title: row.title ?? undefined,
      resumeText: row.resumeText,
      coverLetterText: row.coverLetterText ?? undefined,
      jobContext: row.jobContext ?? undefined,
      language: row.language ?? undefined,
      result: row.result as unknown as ApplicationValidationResult,
      score: row.score,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /**
   * Defensive normalization of the LLM payload. With Azure structured outputs
   * the shape is already guaranteed, but this clamps scores into 0-100,
   * guarantees the list fields are arrays, and stamps `validatedAt`.
   */
  private normalizeValidationResult(raw: ApplicationValidationResult): ApplicationValidationResult {
    const clamp = (n: unknown): number => {
      const v = Math.round(Number(n));
      if (Number.isNaN(v)) return 0;
      return Math.min(100, Math.max(0, v));
    };

    const verdicts = ['strong', 'good', 'needs_work'];
    const verdict = verdicts.includes(raw?.verdict) ? raw.verdict : 'needs_work';

    return {
      overallScore: clamp(raw?.overallScore),
      atsScore: clamp(raw?.atsScore),
      verdict,
      summary: typeof raw?.summary === 'string' ? raw.summary : '',
      categories: Array.isArray(raw?.categories)
        ? raw.categories.map((c) => ({
            id: c.id,
            label: typeof c.label === 'string' ? c.label : c.id,
            score: clamp(c.score),
            status: ['pass', 'warn', 'fail'].includes(c.status) ? c.status : 'warn',
          }))
        : [],
      blockers: Array.isArray(raw?.blockers) ? raw.blockers : [],
      recommendations: Array.isArray(raw?.recommendations) ? raw.recommendations : [],
      strengths: Array.isArray(raw?.strengths) ? raw.strengths : [],
      validatedAt: new Date().toISOString(),
    };
  }
}
