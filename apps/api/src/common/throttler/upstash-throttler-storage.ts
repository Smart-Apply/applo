import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Redis } from '@upstash/redis';
import { ConfigService } from '../../config/config.service';

/**
 * Distributed rate-limit storage backed by Upstash Redis (REST API).
 *
 * Why REST instead of native Redis?
 *   - The same adapter works on the VM today and on Cloudflare Workers /
 *     edge runtimes tomorrow without code changes.
 *   - One less long-lived TCP connection to babysit.
 *   - Latency penalty is ~5-15ms per call, acceptable for rate-limit
 *     accounting (we are not on the request hot path for cached responses).
 *
 * Schema:
 *   key   = "throttle:<throttler-name>:<route>:<tracker>"
 *   value = integer counter
 *   ttl   = configured per throttler (ms in NestJS, seconds in Redis)
 *
 * Atomicity: we use an INCR + EXPIRE pipeline. INCR is atomic in Redis;
 * EXPIRE is set on the first hit only. Any race between two simultaneous
 * first hits is harmless because EXPIRE simply re-sets the same TTL.
 *
 * Block duration is currently ignored (matches the in-memory default
 * behaviour of @nestjs/throttler ^6) — the natural TTL is the cooldown.
 */
@Injectable()
export class UpstashThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(UpstashThrottlerStorage.name);
  private readonly redis: Redis;
  /** Track keys we've already EXPIRE'd this process so we don't issue
   *  redundant EXPIRE calls on every increment. The set is bounded by
   *  the natural TTL of each key — Redis evicts on the server, our copy
   *  here is best-effort and only an optimisation. */
  private readonly expiredKeys = new Set<string>();

  constructor(configService: ConfigService) {
    const url = configService.upstashRedisRestUrl;
    const token = configService.upstashRedisRestToken;

    if (!url || !token) {
      throw new Error(
        'Upstash throttler storage requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN',
      );
    }

    this.redis = new Redis({ url, token });
    this.logger.log('Upstash throttler storage initialised (REST)');
  }

  async increment(
    key: string,
    ttl: number,
    _limit: number,
    _blockDuration: number,
    _throttlerName: string,
  ): Promise<{
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
  }> {
    const ttlSeconds = Math.max(1, Math.ceil(ttl / 1000));
    const namespacedKey = `throttle:${key}`;

    try {
      const totalHits = await this.redis.incr(namespacedKey);

      // Set TTL once per key per process. Redis handles re-set safely if
      // multiple processes set the same TTL — they'll all match.
      if (totalHits === 1 || !this.expiredKeys.has(namespacedKey)) {
        await this.redis.expire(namespacedKey, ttlSeconds);
        this.expiredKeys.add(namespacedKey);

        // Best-effort cap on the optimisation set so it can't grow
        // unboundedly in long-running processes. 10k entries is plenty
        // for tens of thousands of requests/min.
        if (this.expiredKeys.size > 10_000) {
          this.expiredKeys.clear();
        }
      }

      // Look up actual TTL — Upstash returns -1 if no TTL, -2 if key missing.
      const remainingTtl = await this.redis.ttl(namespacedKey);
      const timeToExpire = remainingTtl > 0 ? remainingTtl * 1000 : ttl;

      return {
        totalHits,
        timeToExpire,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    } catch (error) {
      // Fail OPEN on Upstash errors so a Redis outage cannot brick the API.
      // Log loudly so we notice in Sentry / pino.
      this.logger.error(
        `Upstash throttler storage error for key=${namespacedKey}: ${error.message}. Failing open.`,
      );
      return {
        totalHits: 0,
        timeToExpire: ttl,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }
}
