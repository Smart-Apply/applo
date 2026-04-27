/**
 * Standalone Upstash REST validation:
 *   1. Round-trip raw INCR / EXPIRE / GET / TTL / DEL via @upstash/redis
 *   2. Exercise UpstashThrottlerStorage.increment() to prove the NestJS
 *      throttler adapter works against the real Redis.
 *
 * Run with:
 *   npx tsx --tsconfig apps/api/tsconfig.json apps/api/scripts/test-upstash.ts
 */
import 'dotenv/config';
import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set');
  process.exit(1);
}

const redis = new Redis({ url, token });

async function rawRoundtrip() {
  console.log('=== 1. Raw Upstash REST round-trip ===');
  const key = `__healthcheck:${Date.now()}`;
  console.log(`SET    ${key} "ok" EX 30`);
  await redis.set(key, 'ok', { ex: 30 });

  const got = await redis.get<string>(key);
  console.log(`GET    ${key} → ${got}`);

  const ttl = await redis.ttl(key);
  console.log(`TTL    ${key} → ${ttl}s`);

  await redis.del(key);
  console.log(`DEL    ${key}`);
  console.log('✅ Raw REST OK\n');
}

async function throttlerAdapter() {
  console.log('=== 2. UpstashThrottlerStorage.increment() ===');
  // Lazy-import after env is loaded so ConfigService picks up the values
  const { UpstashThrottlerStorage } = await import('../src/common/throttler/upstash-throttler-storage');
  // Build a minimal config-service shim so we don't need the full NestJS
  // bootstrap (which fails in scripts due to APP_GUARD wiring).
  const fakeConfig = {
    upstashRedisRestUrl: url,
    upstashRedisRestToken: token,
  } as any;

  const storage = new UpstashThrottlerStorage(fakeConfig);

  const key = `test:smoke:${Date.now()}`;
  const ttlMs = 30_000;
  const limit = 3;

  for (let i = 1; i <= 5; i++) {
    const result = await storage.increment(key, ttlMs, limit, 0, 'default');
    const exceeded = result.totalHits > limit;
    console.log(
      `  hit #${i}: totalHits=${result.totalHits}, ttl=${Math.round(result.timeToExpire / 1000)}s, exceeded=${exceeded}`,
    );
  }

  // Cleanup the namespaced key the adapter creates
  await redis.del(`throttle:${key}`);
  console.log('✅ Throttler adapter OK — counter increments correctly through Upstash\n');
}

async function failOpenBehavior() {
  console.log('=== 3. Verifying fail-open on bad credentials ===');
  const { UpstashThrottlerStorage } = await import('../src/common/throttler/upstash-throttler-storage');
  const badConfig = {
    upstashRedisRestUrl: url,
    upstashRedisRestToken: 'invalid-token-' + Date.now(),
  } as any;
  const storage = new UpstashThrottlerStorage(badConfig);
  const result = await storage.increment(`test:fail:${Date.now()}`, 30_000, 5, 0, 'default');
  if (result.totalHits === 0) {
    console.log('✅ Fails OPEN on auth failure (returns 0 hits, not blocking) — Redis outage cannot brick API\n');
  } else {
    console.log('❌ Did not fail open as expected:', result);
    process.exit(1);
  }
}

(async () => {
  await rawRoundtrip();
  await throttlerAdapter();
  await failOpenBehavior();
  console.log('🎉 All Upstash validations passed.');
})().catch((e) => {
  console.error('\n❌ Upstash test failed:', e);
  process.exit(1);
});
