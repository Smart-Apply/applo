import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * EmailVerifiedGuard
 *
 * Blocks access for authenticated users whose email address has not been
 * verified yet. Apply ONLY to expensive or abuse-prone endpoints — for
 * example, generating bewerbungen with an LLM. Cheap reads (profile,
 * settings, list endpoints) should remain open so the user can configure
 * their account before they verify.
 *
 * Requires `JwtAuthGuard` to run first so `req.user.emailVerified` is
 * populated. The error response uses a stable code `EMAIL_NOT_VERIFIED`
 * so the frontend can show a tailored "verify your email" prompt instead
 * of a generic "Forbidden".
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
 *   @Post('expensive-thing')
 *   foo() {}
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  private readonly logger = new Logger(EmailVerifiedGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn(
        'EmailVerifiedGuard: No user found in request. Ensure JwtAuthGuard runs first.',
      );
      throw new UnauthorizedException('Authentifizierung erforderlich');
    }

    // OAuth-provider users are pre-verified at registration time, so
    // they always have emailVerified=true. Local-signup users start at
    // false and flip to true only after clicking the verification link.
    if (!user.emailVerified) {
      throw new ForbiddenException({
        message:
          'Bitte bestätige zuerst deine E-Mail-Adresse, bevor du eine Bewerbung erstellen kannst. Wir haben dir einen Bestätigungslink an deine E-Mail gesendet.',
        error: 'EMAIL_NOT_VERIFIED',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    return true;
  }
}
