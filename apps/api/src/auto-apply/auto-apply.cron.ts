import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service';
import { LinkedInJobsService } from '../linkedin-jobs/linkedin-jobs.service';
import { AutoApplyService } from './auto-apply.service';
import { SearchLinkedInJobsDto } from '../linkedin-jobs/dto/search-linkedin-jobs.dto';
import { LinkedInJobDto } from '../linkedin-jobs/dto/linkedin-job.dto';
import { Prisma } from '../generated/prisma/client';

/**
 * Background cron worker for the Auto-Apply Agent.
 *
 * Runs every 15 minutes, scoops up active configs whose `nextRunAt` is
 * due, and creates fresh `AutoApplySuggestion` rows.
 *
 * Per-config flow:
 *   1. Search LinkedIn via existing `LinkedInJobsService.search`
 *   2. Filter out blocked companies, already-suggested jobs (dedup)
 *   3. Apply requiredKeywords + minAtsScore filters
 *   4. Score each candidate against the user's profile (deterministic;
 *      LLM-based scoring only happens later if the user approves)
 *   5. Insert top-N suggestions with `status = PENDING`
 *   6. Re-schedule `nextRunAt` from the cron expression
 *
 * Failures on one config never affect others (try/catch per config).
 */
@Injectable()
export class AutoApplyCron {
  private readonly logger = new Logger(AutoApplyCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly linkedinJobs: LinkedInJobsService,
    private readonly autoApply: AutoApplyService,
  ) {}

  /**
   * Master scheduler. Picks configs whose `nextRunAt` <= now AND `isActive`,
   * runs them serially (LinkedIn rate-limit friendly), and reschedules each.
   */
  @Cron(CronExpression.EVERY_30_MINUTES, { name: 'auto-apply-tick' })
  async tick(): Promise<void> {
    const due = await this.prisma.autoApplyConfig.findMany({
      where: {
        isActive: true,
        OR: [{ nextRunAt: null }, { nextRunAt: { lte: new Date() } }],
      },
      take: 50, // safety: never grab more than 50 per tick
    });

    if (due.length === 0) return;
    this.logger.log(`auto-apply tick: ${due.length} config(s) due`);

    for (const config of due) {
      try {
        await this.runConfig(config);
      } catch (err) {
        this.logger.error(
          `auto-apply config ${config.id} failed: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    }
  }

  /**
   * Manual trigger from `POST /auto-apply/config/run-now`.
   * Returns how many new suggestions landed in the inbox.
   */
  async runForUser(userId: string): Promise<{ ok: boolean; suggestionsCreated: number }> {
    const config = await this.prisma.autoApplyConfig.findUnique({ where: { userId } });
    if (!config) return { ok: false, suggestionsCreated: 0 };
    const created = await this.runConfig(config);
    return { ok: true, suggestionsCreated: created };
  }

  // ─── Private ────────────────────────────────────────────────────────

  private async runConfig(config: {
    id: string;
    userId: string;
    searchFilters: Prisma.JsonValue;
    maxSuggestionsPerDay: number;
    minAtsScore: number | null;
    requiredKeywords: string[];
    blockedCompanies: string[];
    cronSchedule: string;
  }): Promise<number> {
    const filters = config.searchFilters as unknown as SearchLinkedInJobsDto;

    // Search LinkedIn (uses existing Apify-backed service)
    const search = await this.linkedinJobs.search(filters);

    // Dedup against existing suggestions
    const existingIds = new Set(
      (
        await this.prisma.autoApplySuggestion.findMany({
          where: { userId: config.userId, externalJobId: { in: search.results.map((j) => j.id) } },
          select: { externalJobId: true },
        })
      ).map((s) => s.externalJobId),
    );

    const blocklist = new Set(config.blockedCompanies.map((c) => c.toLowerCase()));
    const requiredKw = config.requiredKeywords.map((k) => k.toLowerCase());

    // Load minimal profile data for scoring (skills + experience titles)
    const profile = await this.prisma.profile.findUnique({
      where: { userId: config.userId },
      select: {
        skills: { select: { name: true } },
        experiences: { select: { title: true } },
      },
    });
    const profileTokens = this.buildProfileTokens(profile);

    // Filter + score
    const candidates: Array<{ job: LinkedInJobDto; score: number; reasons: string[] }> = [];
    for (const job of search.results) {
      if (existingIds.has(job.id)) continue;
      if (blocklist.has(job.company.toLowerCase())) continue;

      const haystack = `${job.title} ${job.description ?? ''}`.toLowerCase();
      // Required keywords gate
      if (requiredKw.length && !requiredKw.every((kw) => haystack.includes(kw))) continue;

      const { score, reasons } = this.scoreJob(haystack, profileTokens);
      if (config.minAtsScore !== null && score < config.minAtsScore) continue;

      candidates.push({ job, score, reasons });
    }

    // Take top N by score
    candidates.sort((a, b) => b.score - a.score);
    const top = candidates.slice(0, config.maxSuggestionsPerDay);

    // Insert suggestions
    if (top.length > 0) {
      await this.prisma.autoApplySuggestion.createMany({
        data: top.map(({ job, score, reasons }) => ({
          userId: config.userId,
          configId: config.id,
          externalJobId: job.id,
          jobTitle: job.title,
          company: job.company,
          location: job.location ?? null,
          jobUrl: job.url,
          postedAt: this.parsePostedAt(job.postedAt),
          matchScore: score,
          matchReasons: { matchedTokens: reasons } as Prisma.InputJsonValue,
        })),
        skipDuplicates: true, // safety against race with another tick
      });
    }

    // Reschedule
    const nextRunAt = this.autoApply.computeNextRunAt(config.cronSchedule, new Date());
    await this.prisma.autoApplyConfig.update({
      where: { id: config.id },
      data: { lastRunAt: new Date(), nextRunAt },
    });

    this.logger.log(
      `auto-apply config ${config.id}: ${search.results.length} found → ${top.length} new suggestions`,
    );
    return top.length;
  }

  /**
   * Build a deterministic, lower-cased token bag from the user's skills +
   * experience titles. Used by `scoreJob` — no LLM, no API call.
   */
  private buildProfileTokens(profile: {
    skills: { name: string }[];
    experiences: { title: string }[];
  } | null): string[] {
    if (!profile) return [];
    const tokens = new Set<string>();
    for (const s of profile.skills) tokens.add(s.name.toLowerCase().trim());
    for (const e of profile.experiences) {
      // Split titles on common delimiters so "Senior Frontend Developer" → ["senior", "frontend", "developer"]
      for (const word of e.title.toLowerCase().split(/[\s,/&-]+/)) {
        if (word.length >= 3) tokens.add(word);
      }
    }
    return Array.from(tokens);
  }

  /**
   * Lightweight match score in [0, 100]: percentage of profile tokens that
   * appear in the job's title + description. Returns the matched tokens as
   * "reasons" for display in the inbox.
   *
   * This is NOT the same as the full ATS analysis used after approval —
   * it's a cheap pre-filter to avoid LLM costs on every cron tick.
   */
  private scoreJob(
    haystack: string,
    profileTokens: string[],
  ): { score: number; reasons: string[] } {
    if (profileTokens.length === 0) return { score: 0, reasons: [] };
    const matched = profileTokens.filter((t) => haystack.includes(t));
    const score = Math.round((matched.length / profileTokens.length) * 100);
    return { score, reasons: matched.slice(0, 10) };
  }

  private parsePostedAt(input?: string): Date | null {
    if (!input) return null;
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }
}
