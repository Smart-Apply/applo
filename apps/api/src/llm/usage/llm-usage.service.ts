import { Injectable, Logger } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { createHmac } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '../../config/config.service';
import type { SubscriptionTier } from '../../generated/prisma/client';
import type { LlmActorContext, LlmUsageRecordInput } from './llm-usage.types';
import { estimateCostUsd } from './llm-pricing';

/**
 * `LlmUsageEvent.language` is a STRUCTURAL field — it must never become a
 * carrier for free text. `JobPosting.language` can reach this sink unclamped
 * (it is the one field `job-postings.service.ts#clampParsedJobData` passes
 * through verbatim, and on the URL-parse path its value is produced by an LLM
 * reading an attacker-controllable page). Normalising against a fixed
 * allow-list here keeps the invariant true regardless of upstream validation.
 */
const TRACKED_LANGUAGES = new Set(['de', 'en', 'fr', 'es', 'pt', 'it']);

function normalizeLanguage(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return TRACKED_LANGUAGES.has(normalized) ? normalized : null;
}

/**
 * Per-scope actor context. `tier` is resolved lazily on first `record()` call
 * within the scope and memoised here so a whole generation (many LLM calls)
 * costs one `Subscription` lookup, not one per call.
 */
interface ActorStore {
  userId: string;
  language?: string;
  tier?: Promise<SubscriptionTier | null>;
}

/**
 * Pseudonymous per-feature LLM token-usage recorder (issue #522). Writes
 * `LlmUsageEvent` rows keyed by `actorHash` — an HMAC-SHA256 keyed pseudonym
 * of the userId; never the raw id, never prompt/response text.
 *
 * NOT anonymous (audit 2026-08-13, F11 — this header used to claim it was):
 * the hash is stable per user, and the table sits beside
 * `applications`/`validations`/`interview_sessions`, whose `userId` +
 * millisecond timestamps let a usage burst be time-correlated back to its
 * trigger without the salt. GDPR erasure therefore applies: account deletion
 * calls {@link deleteEventsForActor}, and `LlmUsageRetentionCron` ages out
 * everything else.
 *
 * No-op entirely when `LLM_USAGE_HASH_SALT` is unset, so local dev and tests
 * stay clean by default.
 */
@Injectable()
export class LlmUsageService {
  private readonly logger = new Logger(LlmUsageService.name);
  private readonly actor = new AsyncLocalStorage<ActorStore>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  get enabled(): boolean {
    return Boolean(this.config.llmUsageHashSalt);
  }

  /** Establish the actor scope for an async unit of work (HTTP request, queue job). */
  runWithActor<T>(ctx: LlmActorContext, fn: () => Promise<T>): Promise<T> {
    const store: ActorStore = { userId: ctx.userId, language: ctx.language };
    return this.actor.run(store, fn);
  }

  /**
   * Same as {@link runWithActor} but for a synchronous entry point (the
   * interceptor calls this from `intercept()`, which must return synchronously).
   */
  runWithActorSync<T>(ctx: LlmActorContext, fn: () => T): T {
    const store: ActorStore = { userId: ctx.userId, language: ctx.language };
    return this.actor.run(store, fn);
  }

  /**
   * Record one completed (or failed) logical LLM call. Fire-and-forget: reads
   * the active actor scope synchronously, then writes the row without the
   * caller awaiting it. Analytics must never slow down or break generation —
   * insert failures are logged, never thrown.
   */
  record(input: LlmUsageRecordInput): void {
    if (!this.enabled) return;
    const salt = this.config.llmUsageHashSalt;
    if (!salt) return;

    const store = this.actor.getStore();
    const actorHash = store ? this.hashActor(store.userId, salt) : undefined;
    const language = input.language ?? store?.language;
    const tierPromise = store ? this.resolveTier(store) : Promise.resolve(null);

    void tierPromise
      .then((tier) =>
        this.prisma.llmUsageEvent.create({
          data: {
            actorHash: actorHash ?? null,
            feature: input.feature,
            provider: input.provider,
            model: input.model,
            lane: input.lane,
            promptTokens: input.usage?.promptTokens ?? null,
            completionTokens: input.usage?.completionTokens ?? null,
            totalTokens:
              input.usage !== undefined
                ? input.usage.promptTokens + input.usage.completionTokens
                : null,
            cachedTokens: input.usage?.cachedTokens ?? null,
            tier: tier ?? null,
            language: normalizeLanguage(language),
            latencyMs: input.latencyMs,
            success: input.success,
            circuitState: input.circuitState,
            errorKind: input.errorKind ?? null,
            estimatedCostUsd: estimateCostUsd(input.model, input.usage),
          },
        }),
      )
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to record LLM usage event: ${message}`);
      });
  }

  /**
   * GDPR erasure hook (audit 2026-08-13, F11): delete every usage event this
   * user's calls produced, by recomputing the HMAC with the live salt. Rows
   * written under an earlier salt (or while the salt was unset, which stores
   * a null actorHash) cannot be matched and are left for the retention sweep.
   *
   * NOT fire-and-forget, unlike {@link record}: both account-deletion paths
   * run this BEFORE `user.delete` and treat a failure as fatal to the
   * deletion, so personal data is never silently orphaned.
   */
  async deleteEventsForActor(userId: string): Promise<number> {
    const salt = this.config.llmUsageHashSalt;
    if (!salt) {
      return 0;
    }
    const { count } = await this.prisma.llmUsageEvent.deleteMany({
      where: { actorHash: this.hashActor(userId, salt) },
    });
    if (count > 0) {
      this.logger.log(`Erased ${count} LLM usage events for a deleted account`);
    }
    return count;
  }

  /**
   * Keyed pseudonym for the actor. HMAC rather than `sha256(userId + salt)`:
   * concatenating a secret onto a message is the wrong primitive for a keyed
   * digest, and HMAC states the intent (and the domain separation) explicitly.
   *
   * NOTE on strength: `User.id` is a cuid, which has a fairly enumerable
   * preimage space against a single fast hash. This value is therefore only as
   * private as `LLM_USAGE_HASH_SALT` — see docs/security/SECRETS_ROTATION.md §12.
   */
  private hashActor(userId: string, salt: string): string {
    return createHmac('sha256', salt).update(userId).digest('hex');
  }

  private resolveTier(store: ActorStore): Promise<SubscriptionTier | null> {
    if (!store.tier) {
      store.tier = this.prisma.subscription
        .findUnique({ where: { userId: store.userId }, select: { tier: true } })
        .then((row) => row?.tier ?? null)
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.debug(`Tier lookup failed for usage event: ${message}`);
          return null;
        });
    }
    return store.tier;
  }
}
