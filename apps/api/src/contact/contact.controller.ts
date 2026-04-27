import { Body, Controller, HttpCode, HttpStatus, Logger, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ConfigService } from '../config/config.service';
import { EmailService } from '../email/email.service';
import { Public } from '../common/decorators/public.decorator';
import { UseThrottler } from '../common/decorators/throttle.decorator';
import { ContactSubmissionDto } from './contact.dto';

/**
 * Public landing-page contact form. Sends the user's submission to the
 * `SUPPORT_EMAIL` inbox via Resend so support requests don't depend on
 * the user being logged in or having a working CSRF token.
 *
 * Rate-limited via the `email` throttler (3 submissions / hour / IP) to
 * make spam unprofitable while keeping the form usable for real visitors.
 */
@ApiTags('contact')
@Controller('contact')
export class ContactController {
  private readonly logger = new Logger(ContactController.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
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

    // Plain HTML wrapper. Inline styles only — many email clients strip
    // <style> blocks. Keep DOM minimal so spam filters don't flag it.
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5;">
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
      subject: `[Smart Apply Kontakt] ${dto.name}`,
      html,
      replyTo: dto.email,
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

    this.logger.log(`Contact form: forwarded message from ${dto.email} to ${support}`);
    return {
      ok: true,
      message: 'Nachricht erfolgreich gesendet. Wir melden uns so schnell wie möglich bei dir.',
    };
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
