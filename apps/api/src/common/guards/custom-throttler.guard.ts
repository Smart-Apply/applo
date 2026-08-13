import { Injectable, ExecutionContext, Inject, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException, ThrottlerRequest } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { THROTTLER_NAME_KEY } from '../decorators/throttle.decorator';
import { AuditLoggerService } from '../audit-logger';

/** The slice of the Express request the tracker derivation reads. */
interface TrackerRequest {
  ip?: string;
  headers?: { authorization?: string };
  cookies?: Record<string, string | undefined>;
  socket?: { remoteAddress?: string };
}

/**
 * Custom ThrottlerGuard that:
 * 1. Skips rate limiting in development (NODE_ENV === 'development')
 * 2. Uses ONLY ONE throttler per request (default or named via @UseThrottler)
 * 3. Logs rate limit violations for audit purposes
 * 4. Exposes comprehensive rate limit headers (X-RateLimit-*)
 *
 * IMPORTANT: The base ThrottlerGuard iterates over `this.throttlers` and
 * calls `handleRequest` once PER THROTTLER. That means if you configure
 * throttlers `default=100000`, `auth=5`, `email=3`, every endpoint is
 * effectively capped at 3 — because the email bucket is incremented on
 * every request too. ThrottlerGuard doesn't expose a `getThrottlers()`
 * hook, so we intercept inside `handleRequest`: if the throttler being
 * processed isn't the one this route asked for via `@UseThrottler('name')`
 * (default: 'default'), we short-circuit and return `true` without
 * touching storage. Only the requested throttler accounts for the
 * request — yielding true per-route isolation.
 *
 * @SkipThrottle() handling lives entirely in the BASE guard: the library
 * decorator writes per-throttler metadata keys ('THROTTLER:SKIP' + name,
 * e.g. 'THROTTLER:SKIPdefault'), and the base canActivate reads exactly
 * those per configured throttler. Don't re-check skipping here — an
 * earlier bare 'THROTTLER:SKIP' lookup in this class was dead code (that
 * un-suffixed key is never written by the decorator).
 *
 * Note: @nestjs/throttler v6 changed the handleRequest signature to use
 * ThrottlerRequest.
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(CustomThrottlerGuard.name);

  @Inject(AuditLoggerService)
  private readonly auditLogger: AuditLoggerService;

  // Resolvable here because AuthModule exports JwtModule and AppModule (which
  // provides this guard) imports AuthModule. Same secret the auth stack signs
  // with — see getTracker for why this guard verifies tokens itself.
  @Inject(JwtService)
  private readonly jwtService: JwtService;

  /**
   * Override canActivate to:
   * 1. Skip rate limiting in development
   * 2. Skip for the liveness/readiness probes only
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip rate limiting entirely in development for easier testing
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Exempt ONLY the liveness/readiness probes: Fly polls them continuously
    // and they must never depend on the throttler storage (a down Upstash
    // would otherwise 500 the probe and get the machine pulled from the load
    // balancer). The blanket `/api/v1/health` prefix exemption used to also
    // cover the expensive public aggregate and /health/details — those now
    // throttle under the 'health-check' bucket instead (security audit
    // 2026-08-13, F16/F18).
    const path = typeof request.url === 'string' ? request.url.split('?')[0] : '';
    if (path === '/api/v1/health/live' || path === '/api/v1/health/ready') {
      return true;
    }

    // Call parent's canActivate which will call handleRequest for every
    // configured throttler (and honor @SkipThrottle() via its per-name
    // metadata keys). We filter inside handleRequest below.
    return super.canActivate(context);
  }

  /**
   * Override handleRequest with the v6 signature (ThrottlerRequest).
   *
   * Skips storage accounting for any throttler that isn't the one this
   * route selected via @UseThrottler('name'). Without this filter, the
   * strictest configured throttler caps every endpoint (see class-level
   * comment).
   */
  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context, limit, ttl, throttler, blockDuration } = requestProps;

    const handler = context.getHandler();
    const classRef = context.getClass();
    const requestedName =
      this.reflector.getAllAndOverride<string>(THROTTLER_NAME_KEY, [handler, classRef]) ||
      'default';

    const currentName = throttler.name || 'default';
    if (currentName !== requestedName) {
      // Not the throttler this route asked for — skip without counting.
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const tracker = await this.getTracker(request);
    const key = this.generateKey(context, tracker, currentName);

    // Convert ttl to milliseconds if it's in seconds
    const ttlMs = ttl < 1000 ? ttl * 1000 : ttl;

    try {
      // Increment counter and get total hits
      const { totalHits } = await this.storageService.increment(
        key,
        ttlMs,
        limit,
        blockDuration,
        currentName,
      );

      // Check if limit exceeded
      if (totalHits > limit) {
        // The tracker is the source of truth for who exceeded the limit —
        // request.user is never populated here (this guard runs before the
        // per-controller auth guards).
        const trackedUserId = tracker.startsWith('user:') ? tracker.slice(5) : undefined;

        // Log rate limit violation
        this.logger.warn(
          `Rate limit exceeded - endpoint: ${request.url}, method: ${request.method}, ` +
            `throttler: ${currentName}, limit: ${limit}, ttl: ${ttlMs}ms, ` +
            `tracker: ${tracker}, totalHits: ${totalHits}`,
        );

        this.auditLogger.logRateLimitViolation(trackedUserId, request.url, request);

        // Set rate limit headers for exceeded limit
        response.setHeader('X-RateLimit-Limit', limit.toString());
        response.setHeader('X-RateLimit-Remaining', '0');
        response.setHeader('X-RateLimit-Reset', (Date.now() + ttlMs).toString());
        response.setHeader('Retry-After', Math.ceil(ttlMs / 1000).toString());

        // Throw exception to trigger 429 response
        throw new ThrottlerException();
      }

      // Calculate remaining requests
      const remaining = Math.max(0, limit - totalHits);

      // Set comprehensive rate limit headers on success
      response.setHeader('X-RateLimit-Limit', limit.toString());
      response.setHeader('X-RateLimit-Remaining', remaining.toString());
      response.setHeader('X-RateLimit-Reset', (Date.now() + ttlMs).toString());

      return true;
    } catch (error) {
      // Re-throw ThrottlerException to trigger 429 response
      if (error instanceof ThrottlerException) {
        throw error;
      }
      // For other errors, log and re-throw
      this.logger.error(`Error in handleRequest: ${error}`);
      throw error;
    }
  }

  /**
   * Get tracker identifier: the authenticated user when the request carries a
   * valid access token, the socket-derived client IP otherwise.
   *
   * Trust model (security audit 2026-08-13, F16): `req.ip` is derived under
   * `app.set('trust proxy', 1)` in main.ts — i.e. from the X-Forwarded-For
   * entry appended by our own edge, which a client cannot influence. This
   * method must NEVER read client-supplied headers (CF-Connecting-IP,
   * X-Forwarded-For) directly: honouring them lets any client pick its own
   * rate-limit bucket per request, which defeats every bucket including
   * `auth` (login brute-force) and `email`.
   *
   * Per-user bucketing cannot come from `req.user`: this guard is a global
   * APP_GUARD and runs before the per-controller JwtAuthGuard populates it.
   * So we verify the access token ourselves — same extraction order and
   * secret as JwtStrategy. One HS256 verify per request is cheap, and any
   * failure falls through to IP bucketing; this path never throws.
   */
  protected async getTracker(req: TrackerRequest): Promise<string> {
    const userId = this.verifiedUserId(req);
    if (userId) {
      return `user:${userId}`;
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  /**
   * Extract + verify the JWT the auth stack would use (access_token cookie
   * first, Authorization bearer as fallback) and return its subject. Returns
   * null — never throws — for missing, expired, malformed, or refresh tokens.
   */
  private verifiedUserId(req: TrackerRequest): string | null {
    const authHeader = req.headers?.authorization;
    const bearer =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length)
        : undefined;
    const token = req.cookies?.access_token || bearer;
    if (typeof token !== 'string' || token.length === 0) {
      return null;
    }

    try {
      const payload = this.jwtService.verify<{ sub?: unknown; type?: unknown }>(token);
      // A refresh token must not buy its own (fresh) rate-limit bucket.
      if (payload.type === 'refresh') {
        return null;
      }
      return typeof payload.sub === 'string' && payload.sub.length > 0 ? payload.sub : null;
    } catch {
      return null;
    }
  }

  /**
   * Generate a unique key for rate limiting
   */
  protected generateKey(context: ExecutionContext, tracker: string, throttlerName: string): string {
    const request = context.switchToHttp().getRequest();
    const route = `${request.method}-${request.route?.path || request.url}`;
    return `${throttlerName}:${route}:${tracker}`;
  }
}
