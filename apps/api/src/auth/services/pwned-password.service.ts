import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { ConfigService } from '../../config/config.service';

const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/';
const CHECK_TIMEOUT_MS = 2_500;

/**
 * Compromised-password check against the Have I Been Pwned Pwned-Passwords
 * corpus (security audit 2026-08-13, F10 / NIST SP 800-63B §5.1.1.2).
 *
 * k-anonymity range API: only the first 5 hex chars of the SHA-1 leave the
 * server — never the password, never the full hash. `Add-Padding` makes the
 * response size independent of the prefix's real match count.
 *
 * Deliberately FAIL-OPEN, the opposite of the Turnstile service one file
 * over: a captcha outage letting bots through is a security failure, while a
 * HIBP outage blocking every signup and password change is an availability
 * failure with no attacker in the loop. An error or timeout here returns
 * "not compromised" and logs a warning.
 */
@Injectable()
export class PwnedPasswordService {
  private readonly logger = new Logger(PwnedPasswordService.name);

  constructor(private readonly configService: ConfigService) {}

  /** True when the password appears in a known breach corpus. */
  async isCompromised(password: string): Promise<boolean> {
    if (!this.configService.pwnedPasswordCheckEnabled) {
      return false;
    }

    const sha1 = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

      const response = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
        headers: { 'Add-Padding': 'true' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        this.logger.warn(`HIBP range query returned HTTP ${response.status} — failing open`);
        return false;
      }

      const body = await response.text();
      // Response lines: "<35-hex-char suffix>:<count>". Padded entries have
      // count 0 and must not count as a hit.
      for (const line of body.split('\n')) {
        const [candidate, countRaw] = line.trim().split(':');
        if (candidate === suffix && parseInt(countRaw ?? '0', 10) > 0) {
          return true;
        }
      }
      return false;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`HIBP check failed (${msg}) — failing open`);
      return false;
    }
  }
}
