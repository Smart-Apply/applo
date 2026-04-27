import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const VERIFY_TIMEOUT_MS = 5000;

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

/**
 * CloudflareTurnstileService
 *
 * Server-side verifier for Cloudflare Turnstile tokens. The frontend
 * widget produces a short-lived token; we forward it (plus the visitor's
 * IP) to Cloudflare's siteverify endpoint and reject if the token isn't
 * valid.
 *
 * Behavior when unconfigured:
 *   - If `TURNSTILE_SECRET_KEY` is unset, every verification returns
 *     `true` and we log a warning. This keeps local dev / preview
 *     environments usable without forcing every contributor to set up a
 *     Cloudflare account. Production MUST set the key to actually
 *     enforce the captcha.
 *
 * Reference: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
@Injectable()
export class CloudflareTurnstileService {
  private readonly logger = new Logger(CloudflareTurnstileService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * @returns true if the token is valid, false otherwise. Never throws —
   *          callers should branch on the boolean.
   */
  async verify(token: string | undefined, remoteIp?: string): Promise<boolean> {
    const secret = this.configService.turnstileSecretKey;

    // Soft-fail if Turnstile isn't configured. We don't want to brick
    // local dev. Log loudly so production ops sees the gap.
    if (!secret) {
      this.logger.warn(
        'TURNSTILE_SECRET_KEY not configured — captcha verification skipped. Set it in production!',
      );
      return true;
    }

    if (!token) {
      this.logger.warn('Turnstile verification rejected: no token supplied by client.');
      return false;
    }

    const formData = new URLSearchParams();
    formData.append('secret', secret);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

      const response = await fetch(TURNSTILE_VERIFY_URL, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        this.logger.warn(
          `Turnstile siteverify returned HTTP ${response.status}. Treating as failure.`,
        );
        return false;
      }

      const result = (await response.json()) as TurnstileVerifyResponse;

      if (!result.success) {
        // Cloudflare lists every error code at:
        // https://developers.cloudflare.com/turnstile/get-started/server-side-validation/#error-codes
        // Common ones: 'timeout-or-duplicate', 'invalid-input-response',
        // 'missing-input-response', 'bad-request'.
        this.logger.warn(
          `Turnstile token rejected. errors=${JSON.stringify(result['error-codes'] ?? [])}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      // Don't fail-open on transient network errors — a flaky verifier
      // shouldn't let bots through. Reject and let the user retry.
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Turnstile verification network error: ${msg}`);
      return false;
    }
  }
}
