import { Body, Controller, HttpCode, HttpStatus, Logger, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ConfigService } from '../config/config.service';
import { EmailService } from '../email/email.service';
import { Public } from '../common/decorators/public.decorator';
import { UseThrottler } from '../common/decorators/throttle.decorator';
import { SubscriptionService } from '../subscription/subscription.service';
import { ContactSubmissionDto } from './contact.dto';

/**
 * Public landing-page contact form. Sends the user's submission to the
 * `SUPPORT_EMAIL` inbox via Resend so support requests don't depend on
 * the user being logged in or having a working CSRF token.
 *
 * Rate-limited via the `email` throttler (3 submissions / hour / IP) to
 * make spam unprofitable while keeping the form usable for real visitors.
 *
 * Premium-tier users get priority routing: their submissions are tagged
 * with `priority=premium` in Resend (so support can filter the dashboard)
 * and prefixed with `[🔥 PREMIUM]` in the subject line. The endpoint stays
 * @Public() so anonymous landing-page submissions still work — premium
 * detection is best-effort by reading the access_token cookie.
 */
@ApiTags('contact')
@Controller('contact')
export class ContactController {
  private readonly logger = new Logger(ContactController.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Public()
  @UseThrottler('email')
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a contact-form message to support' })
  async submit(@Body() dto: ContactSubmissionDto, @Req() req: Request) {
    const support = this.configService.supportEmail;
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const ua = req.headers['user-agent'] || 'unknown';

    // Best-effort premium detection. We don't require auth (the form is
    // also used by anonymous visitors on the landing page), but if a valid
    // access_token cookie is present we look up the user's tier so the
    // support team can prioritise paid customers.
    const isPremium = await this.detectPremiumTier(req);

    const subjectPrefix = isPremium ? '[🔥 PREMIUM] ' : '';
    const priorityBanner = isPremium
      ? `<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;margin:0 0 16px 0;border-radius:4px;">
           <strong style="color:#92400e;">⚡ Premium-Kunde</strong>
           <span style="color:#78350f;"> · Antwort innerhalb 24h zugesagt</span>
         </div>`
      : '';

    // Plain HTML wrapper. Inline styles only — many email clients strip
    // <style> blocks. Keep DOM minimal so spam filters don't flag it.
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5;">
        ${priorityBanner}
        <h2 style="margin: 0 0 12px 0;">Neue Kontaktanfrage</h2>
        <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${escapeHtml(dto.name)}</p>
        <p style="margin: 0 0 8px 0;"><strong>E-Mail:</strong> ${escapeHtml(dto.email)}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 16px 0;" />
        <p style="white-space: pre-wrap; margin: 0 0 16px 0;">${escapeHtml(dto.message)}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 16px 0;" />
        <p style="color: #888; font-size: 12px; margin: 0;">IP: ${escapeHtml(ip)}</p>
        <p style="color: #888; font-size: 12px; margin: 0;">User-Agent: ${escapeHtml(String(ua))}</p>
      </div>
    `;

    const sent = await this.emailService.sendRawHtml({
      to: support,
      subject: `${subjectPrefix}[Applo Kontakt] ${dto.name}`,
      html,
      replyTo: dto.email,
      tags: [{ name: 'priority', value: isPremium ? 'premium' : 'standard' }],
    });

    if (!sent) {
      // Surface a generic error — don't leak whether it was a config or
      // network problem. The user just needs to know it didn't go through.
      this.logger.warn(`Contact form submission from ${dto.email} could not be delivered.`);
      return {
        ok: false,
        message:
          'Nachricht konnte nicht gesendet werden. Bitte versuche es später erneut oder schreibe direkt an die Support-Adresse.',
      };
    }

    this.logger.log(
      `Contact form: forwarded message from ${dto.email} to ${support}` +
        (isPremium ? ' (PREMIUM priority)' : ''),
    );
    return {
      ok: true,
      message: isPremium
        ? 'Nachricht erfolgreich gesendet. Als Premium-Kunde erhältst du innerhalb von 24h eine Antwort.'
        : 'Nachricht erfolgreich gesendet. Wir melden uns so schnell wie möglich bei dir.',
    };
  }

  /**
   * Best-effort lookup of whether the request comes from a PREMIUM user.
   * Returns false on any failure (missing/invalid/expired token, DB error,
   * non-premium tier) so that anonymous and free-tier flows keep working.
   */
  private async detectPremiumTier(req: Request): Promise<boolean> {
    const token = req?.cookies?.access_token as string | undefined;
    if (!token) return false;

    try {
      const payload = this.jwtService.verify<{ sub?: string; type?: string }>(token);
      if (!payload?.sub || payload.type === 'refresh') return false;

      const tier = await this.subscriptionService.getUserTier(payload.sub);
      return tier === 'PREMIUM';
    } catch {
      // Silently ignore: invalid signature, expired token, missing user, etc.
      return false;
    }
  }
}

/** Minimal HTML-escape so user input can't break out of the email body. */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
