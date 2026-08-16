import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionClient } from '../prisma/prisma.types';
import {
  RegisterDto,
  LoginDto,
  UpdateUserProfileDto,
  ChangePasswordDto,
  DeleteAccountDto,
  Verify2FALoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import { ConfigService } from '../config/config.service';
import { AuditLoggerService } from '../common/audit-logger';
import { SessionService } from './session.service';
import { TwoFactorService } from './two-factor.service';
import { EmailService } from '../email/email.service';
import { MAX_TOKENS_PER_USER } from './session.constants';
import type { Request, Response } from 'express';
import { ErrorCode } from '../common/constants/error-codes';
import {
  ConflictWithCode,
  UnauthorizedWithCode,
  BadRequestWithCode,
  NotFoundWithCode,
  ForbiddenWithCode,
} from '../common/exceptions/coded-http.exception';
import { SubscriptionService } from '../subscription/subscription.service';
import { UserErasureService } from '../common/erasure/user-erasure.service';
import { LlmUsageService } from '../llm/usage/llm-usage.service';
import { PwnedPasswordService } from './services/pwned-password.service';

/**
 * Art. 15(1)(c)-(h) DSGVO information that has to accompany the copy of the
 * data. Kept next to the export so a new recipient or a changed retention
 * period is edited in the same place as the query that produces the copy;
 * `docs/security/SUBPROCESSORS.md` is the authoritative recipient list and
 * `docs/security/DELETION_CONCEPT.md` the authoritative retention list.
 */
const ACCESS_RIGHT_DISCLOSURE = {
  recipients:
    'Auftragsverarbeiter, an die Daten weitergegeben werden, sind in ' +
    'docs/security/SUBPROCESSORS.md und in der Datenschutzerklärung unter /datenschutz ' +
    'abschließend aufgeführt (u. a. Fly.io, Neon, Cloudflare, Microsoft Azure OpenAI, ' +
    'Azure AI Foundry, Mistral AI, Upstash, Resend, Sentry, Microsoft Graph). ' +
    'Lebenslauf-, Anschreiben- und Stellenanzeigen-Inhalte werden im Volltext an den ' +
    'jeweils konfigurierten KI-Anbieter übermittelt.',
  storagePeriod:
    'Kontodaten bis zur Löschung des Kontos (sofortige, endgültige Löschung — kein ' +
    'Papierkorb). Gelöschte Bewerbungen und Stellenanzeigen inklusive der erzeugten PDFs: ' +
    '30 Tage. Verwaiste Uploads: 7 Tage. E-Mail-Tracking-Ereignisse: 180 Tage. ' +
    'KI-Nutzungsstatistik: 90 Tage. Sicherheits-Logdateien: 90 Tage.',
  rights:
    'Du kannst Berichtigung, Löschung oder Einschränkung der Verarbeitung verlangen und ' +
    'der Verarbeitung widersprechen (Art. 16, 17, 18, 21 DSGVO). Die Löschung deines ' +
    'Kontos ist in den Einstellungen jederzeit selbst auslösbar.',
  supervisoryAuthority:
    'Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren ' +
    '(Art. 77 DSGVO).',
  dataSource:
    'Alle Daten stammen von dir selbst (Eingaben, Uploads, hochgeladene Lebensläufe) oder ' +
    'entstehen bei der Nutzung (Sitzungen, Sicherheitsereignisse, KI-Ergebnisse). ' +
    'Ausnahme: Bei OAuth-Login stammen Name, E-Mail-Adresse und Profilbild vom gewählten ' +
    'Anbieter; beim E-Mail-Tracking stammen Absender und Betreff aus deinem Postfach.',
  automatedDecisionMaking:
    'Es findet keine automatisierte Entscheidung im Sinne von Art. 22 DSGVO statt. ' +
    'KI-Ergebnisse (Bewerbungsunterlagen, Bewerbungs-Check, Interview-Feedback) sind ' +
    'Vorschläge, die du prüfst und änderst.',
  securityLogs:
    'Sicherheitsereignisse (Login, Passwortänderung, Kontolöschung) werden zusätzlich in ' +
    'Logdateien auf dem Server festgehalten — mit E-Mail-Adresse, IP-Adresse und ' +
    'User-Agent, Rechtsgrundlage Art. 6(1)(f) DSGVO. Diese Dateien liegen außerhalb der ' +
    'Datenbank und rotieren nach 90 Tagen; sie sind deshalb nicht Teil dieser Datei. ' +
    'Eine Kopie kannst du über die in der Datenschutzerklärung genannte Kontaktadresse ' +
    'anfordern.',
} as const;

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface LoginResult {
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  accessToken?: string;
  refreshToken?: string;
  requiresTwoFactor?: boolean;
  challengeToken?: string;
  methods?: string[];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditLogger: AuditLoggerService,
    // Plain injection: SessionService and TwoFactorService live in this same
    // module and inject only Prisma/Config/AuditLogger — they never inject
    // AuthService back, so there is no cycle and forwardRef isn't needed.
    private sessionService: SessionService,
    private subscriptionService: SubscriptionService,
    private twoFactorService: TwoFactorService,
    private emailService: EmailService,
    private userErasureService: UserErasureService,
    private llmUsage: LlmUsageService,
    private pwnedPasswordService: PwnedPasswordService,
  ) {}

  async register(dto: RegisterDto, userAgent?: string, ipAddress?: string, req?: Request) {
    // Check if user exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictWithCode(ErrorCode.USER_EXISTS);
    }

    // Breach-corpus check (audit F10) — regex strength alone lets through
    // passwords that appear verbatim in credential-stuffing lists.
    if (await this.pwnedPasswordService.isCompromised(dto.password)) {
      throw new BadRequestWithCode(ErrorCode.PASSWORD_COMPROMISED);
    }

    // Hash password
    const hashedPassword = await argon2.hash(dto.password);

    // Create user and profile in a single transaction.
    const user = await this.prisma.$transaction(async (tx: TransactionClient) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          provider: 'local',
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
      });

      // Create empty profile for new user
      await tx.profile.create({
        data: {
          userId: newUser.id,
        },
      });

      return newUser;
    });

    // Create default FREE subscription for new user
    // This is done outside the transaction to avoid circular dependency issues
    try {
      await this.subscriptionService.getOrCreateSubscription(user.id);
      this.logger.log(`Created FREE subscription for new user ${user.id}`);
    } catch (error) {
      this.logger.error(`Failed to create subscription for user ${user.id}:`, error);
      // Don't fail registration if subscription creation fails
      // The subscription will be created lazily on first access
    }

    // Log registration event
    if (req) {
      this.auditLogger.logRegistration(user.email, user.id, req);
    }

    // Send the verification email straight away. We deliberately await
    // it here (rather than fire-and-forget) so the audit log accurately
    // records EMAIL_VERIFICATION_SENT in the same trace, but we swallow
    // failures so a transient Resend outage can never block account
    // creation — the user can still trigger "Erneut senden" from the UI.
    try {
      await this.sendVerificationEmail(user.id, req);
    } catch (error) {
      this.logger.error(
        `Failed to send verification email after registration for ${user.email}: ${(error as Error).message}`,
      );
    }

    // Generate tokens and create session
    const tokens = await this.generateTokens(user.id, user.email, userAgent, ipAddress, req);

    return {
      user,
      ...tokens,
    };
  }

  async login(
    dto: LoginDto,
    userAgent?: string,
    ipAddress?: string,
    req?: Request,
  ): Promise<LoginResult> {
    // Find user with 2FA relation
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        twoFactorAuth: {
          select: { isEnabled: true },
        },
      },
    });

    if (!user || !user.password) {
      // Log failed login attempt
      if (req) {
        this.auditLogger.logLoginAttempt(dto.email, false, req);
      }
      throw new UnauthorizedWithCode(ErrorCode.INVALID_CREDENTIALS);
    }

    // Verify password
    const valid = await argon2.verify(user.password, dto.password);

    if (!valid) {
      // Log failed login attempt
      if (req) {
        this.auditLogger.logLoginAttempt(dto.email, false, req, user.id);
      }
      throw new UnauthorizedWithCode(ErrorCode.INVALID_CREDENTIALS);
    }

    // Check if 2FA is enabled
    if (user.twoFactorAuth?.isEnabled) {
      // Check for trusted device
      const trustedDeviceToken = req?.cookies?.trusted_device;
      if (trustedDeviceToken) {
        const isTrusted = await this.twoFactorService.isTrustedDevice(user.id, trustedDeviceToken);
        if (isTrusted) {
          // Skip 2FA for trusted device
          this.logger.log(`Trusted device detected for user ${user.id}, skipping 2FA`);
        } else {
          // Require 2FA
          return this.generateTwoFactorChallenge(user.id, user.email);
        }
      } else {
        // Require 2FA
        return this.generateTwoFactorChallenge(user.id, user.email);
      }
    }

    // Log successful login
    if (req) {
      this.auditLogger.logLoginAttempt(dto.email, true, req, user.id);
    }

    // Generate tokens and create session
    const tokens = await this.generateTokens(user.id, user.email, userAgent, ipAddress, req);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      ...tokens,
    };
  }

  /**
   * Verify 2FA code and complete login
   */
  async verify2FAAndLogin(
    dto: Verify2FALoginDto,
    req: Request,
  ): Promise<LoginResult & { deviceToken?: string }> {
    // Validate challenge token
    let payload: { sub: string; email: string; type: string };
    try {
      payload = this.jwtService.verify(dto.challengeToken, {
        secret: this.configService.jwtSecret,
      });
    } catch {
      throw new UnauthorizedWithCode(ErrorCode.INVALID_CREDENTIALS);
    }

    // Verify token type
    if (payload.type !== '2fa_challenge') {
      throw new UnauthorizedWithCode(ErrorCode.INVALID_TOKEN_TYPE);
    }

    const userId = payload.sub;
    const email = payload.email;

    // Verify 2FA code
    const isValid = await this.twoFactorService.verifyCode(userId, dto.code, req);

    if (!isValid) {
      throw new UnauthorizedWithCode(ErrorCode.INVALID_CREDENTIALS);
    }

    // Log successful login
    this.auditLogger.logLoginAttempt(email, true, req, userId);

    // Generate tokens
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;
    const tokens = await this.generateTokens(userId, email, userAgent, ipAddress, req);

    // Add trusted device if requested
    let deviceToken: string | undefined;
    if (dto.trustDevice) {
      deviceToken = await this.twoFactorService.addTrustedDevice(userId, req);
    }

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    return {
      user: user!,
      ...tokens,
      deviceToken,
    };
  }

  /**
   * Generate a 2FA challenge token (5 minute expiry)
   */
  private generateTwoFactorChallenge(userId: string, email: string): LoginResult {
    const challengeToken = this.jwtService.sign(
      {
        sub: userId,
        email,
        type: '2fa_challenge',
      },
      { expiresIn: '5m' },
    );

    return {
      requiresTwoFactor: true,
      challengeToken,
      methods: ['totp', 'backup_code'],
    };
  }

  async refresh(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
    req?: Request,
  ): Promise<TokenPair> {
    // Verify refresh token signature
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.jwtRefreshSecret,
      });
    } catch (error) {
      throw new UnauthorizedWithCode(ErrorCode.REFRESH_TOKEN_INVALID);
    }

    // Verify token type
    if (payload.type !== 'refresh') {
      throw new UnauthorizedWithCode(ErrorCode.INVALID_TOKEN_TYPE);
    }

    // Find all non-expired refresh tokens for this user (both active and
    // recently-revoked — see the reuse-detection check below; revoked
    // tokens are kept for 24h by the cleanup pass further down).
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: payload.sub,
        expiresAt: { gt: new Date() },
      },
    });

    if (storedTokens.length === 0) {
      throw new UnauthorizedWithCode(ErrorCode.REFRESH_TOKEN_NOT_FOUND);
    }

    // Verify the provided token matches one of the stored hashes
    let matchingToken: (typeof storedTokens)[0] | null = null;
    for (const storedToken of storedTokens) {
      try {
        const isMatch = await argon2.verify(storedToken.token, refreshToken);
        if (isMatch) {
          matchingToken = storedToken;
          break;
        }
      } catch (error) {
        // Skip invalid hashes
        continue;
      }
    }

    if (!matchingToken) {
      throw new UnauthorizedWithCode(ErrorCode.REFRESH_TOKEN_NOT_FOUND);
    }

    // Reuse/theft detection (security audit F6): rotation revokes a refresh
    // token the moment it's used, so a client presenting an ALREADY-revoked
    // token means either the token was stolen and the legitimate rotation
    // already happened, or an attacker replayed a captured token. Either
    // way we can't tell which of the two holders is legitimate, so treat it
    // as compromised and revoke the whole session/token family for this
    // user rather than just rejecting the one request.
    if (matchingToken.isRevoked) {
      if (req) {
        this.auditLogger.logSecurityEvent(
          'REFRESH_TOKEN_REUSE_DETECTED',
          payload.email,
          req,
          payload.sub,
          { tokenId: matchingToken.id },
        );
      }
      await this.sessionService.revokeAllSessions(payload.sub);
      await this.revokeRefreshToken(payload.sub);
      throw new UnauthorizedWithCode(ErrorCode.REFRESH_TOKEN_INVALID);
    }

    // Log refresh token usage
    if (req) {
      this.auditLogger.logRefreshTokenUsed(payload.sub, payload.email, req);
    }

    // Find session associated with this refresh token
    const session = await this.sessionService.findSessionByRefreshToken(matchingToken.id);

    // Update session last active timestamp
    if (session) {
      await this.sessionService.updateLastActive(session.id);
    }

    // Revoke the specific refresh token (rotation strategy)
    await this.prisma.refreshToken.update({
      where: { id: matchingToken.id },
      data: { isRevoked: true },
    });

    // Revoke the session associated with the old refresh token
    if (session) {
      await this.sessionService.revokeSession(session.id);
    }

    // Clean up old/expired tokens for this user (but keep recently revoked for security audit)
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId: payload.sub,
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            AND: [
              { isRevoked: true },
              { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, // Keep revoked tokens for 24h
            ],
          },
        ],
      },
    });

    // Generate new token pair and create new session
    const tokens = await this.generateTokens(payload.sub, payload.email, userAgent, ipAddress, req);

    return tokens;
  }

  async logout(userId: string, req: Request): Promise<void> {
    // Log logout event
    this.auditLogger.logLogout(userId, req);

    // Revoke all sessions for this user
    await this.sessionService.revokeAllSessions(userId);

    // Revoke all refresh tokens for this user
    await this.revokeRefreshToken(userId);
  }

  async revokeRefreshToken(userId: string, tokenId?: string): Promise<void> {
    if (tokenId) {
      // Revoke specific token
      await this.prisma.refreshToken.updateMany({
        where: {
          id: tokenId,
          userId,
        },
        data: { isRevoked: true },
      });
    } else {
      // Revoke all tokens for user (logout from all devices)
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
    }
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        provider: true,
        // Required so GET /auth/me returns the verification flag.
        // Without this, the frontend's user.emailVerified is always
        // undefined and the verification banner shows forever even
        // after the user successfully verifies.
        emailVerified: true,
        // Used to compute hasPassword below \u2014 stripped from the
        // response so the (hashed) value never leaves the server.
        password: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Expose a boolean flag instead of the hash. The frontend uses this
    // to decide whether the "delete account" / "change password" flows
    // should require a password (local accounts) or fall back to a
    // typed-confirmation flow (OAuth-only accounts).
    const { password: _password, ...safeUser } = user;
    return { ...safeUser, hasPassword: _password !== null && _password !== undefined };
  }

  async updateUserProfile(userId: string, dto: UpdateUserProfileDto, req?: Request) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    // Log profile update event
    if (req) {
      this.auditLogger.logProfileUpdate(userId, req, {
        updatedFields: Object.keys(dto).filter(
          (key) => dto[key as keyof UpdateUserProfileDto] !== undefined,
        ),
      });
    }

    return user;
  }

  async changePassword(userId: string, dto: ChangePasswordDto, req?: Request): Promise<void> {
    // Get user with password
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, password: true },
    });

    if (!user || !user.password) {
      throw new BadRequestWithCode(ErrorCode.PASSWORD_CHANGE_OAUTH);
    }

    // Verify current password
    const valid = await argon2.verify(user.password, dto.currentPassword);
    if (!valid) {
      // Log failed password change attempt
      if (req) {
        this.auditLogger.logSecurityEvent('PASSWORD_CHANGE_FAILED', user.email, req, user.id, {
          reason: 'Invalid current password',
        });
      }
      throw new BadRequestWithCode(ErrorCode.PASSWORD_INCORRECT);
    }

    // Ensure new password is different from current
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestWithCode(ErrorCode.PASSWORD_SAME_AS_CURRENT);
    }

    // Breach-corpus check (audit F10)
    if (await this.pwnedPasswordService.isCompromised(dto.newPassword)) {
      throw new BadRequestWithCode(ErrorCode.PASSWORD_COMPROMISED);
    }

    // Hash new password
    const hashedPassword = await argon2.hash(dto.newPassword);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Revoke all refresh tokens (force re-login on all devices)
    await this.revokeRefreshToken(userId);

    // Revoke all sessions
    await this.sessionService.revokeAllSessions(userId);

    // Log successful password change
    if (req) {
      this.auditLogger.logPasswordChange(user.id, req);
    }
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto, req?: Request): Promise<void> {
    // Get user with password
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, password: true },
    });

    if (!user) {
      throw new UnauthorizedWithCode(ErrorCode.USER_NOT_FOUND);
    }

    // For local accounts, verify password. OAuth-only accounts (no
    // password set) skip this check entirely so they can self-delete
    // without ever having to set a password.
    if (user.password) {
      if (!dto.password) {
        if (req) {
          this.auditLogger.logSecurityEvent('ACCOUNT_DELETE_FAILED', user.email, req, user.id, {
            reason: 'Password missing',
          });
        }
        throw new BadRequestWithCode(ErrorCode.PASSWORD_INCORRECT);
      }
      const valid = await argon2.verify(user.password, dto.password);
      if (!valid) {
        // Log failed account deletion attempt
        if (req) {
          this.auditLogger.logSecurityEvent('ACCOUNT_DELETE_FAILED', user.email, req, user.id, {
            reason: 'Invalid password',
          });
        }
        throw new BadRequestWithCode(ErrorCode.PASSWORD_INCORRECT);
      }
    }

    // Collect every storage prefix this account owns. Prefixes, not keys:
    // the previous key-based cleanup only knew about generated PDFs and the
    // Bewerbungsfoto, so every uploaded original (résumés, job-posting files
    // under `<userId>/`) survived the deletion indefinitely — Art. 17 /
    // Art. 5(1)(e) DSGVO. `UserErasureService` owns the full list so the
    // admin deletion path cannot drift from this one.
    const erasure = await this.userErasureService.eraseUser(userId);

    // Logged after the fact so the audit trail records what actually
    // happened — a failed erasure must not leave an ACCOUNT_DELETED entry.
    if (req) {
      this.auditLogger.logSecurityEvent('ACCOUNT_DELETED', user.email, req, user.id, {
        applicationsDeleted: erasure.applicationsDeleted,
        storagePrefixesPurged: erasure.storagePrefixesPurged,
        llmUsageEventsDeleted: erasure.llmUsageEventsDeleted,
      });
    }
  }

  // ==========================================
  // Email Verification Methods
  // ==========================================

  /**
   * Generate a secure random token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a token using SHA-256 for secure storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Send verification email to a user
   */
  async sendVerificationEmail(userId: string, req?: Request): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, emailVerified: true },
    });

    if (!user) {
      throw new NotFoundWithCode(ErrorCode.USER_NOT_FOUND);
    }

    if (user.emailVerified) {
      throw new BadRequestWithCode(ErrorCode.EMAIL_ALREADY_VERIFIED);
    }

    // Generate and store verification token
    const token = this.generateSecureToken();
    const hashedToken = this.hashToken(token);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: expires,
      },
    });

    // Send verification email
    await this.emailService.sendVerificationEmail(user.email, token, user.firstName || undefined);

    // Log email sent event
    if (req) {
      this.auditLogger.logSecurityEvent('EMAIL_VERIFICATION_SENT', user.email, req, user.id);
    }

    this.logger.log(`Verification email sent to ${user.email}`);
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string, req?: Request): Promise<{ email: string }> {
    const hashedToken = this.hashToken(token);

    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { gt: new Date() },
      },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new BadRequestWithCode(ErrorCode.INVALID_OR_EXPIRED_TOKEN);
    }

    // Mark email as verified and clear token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    // Log email verified event
    if (req) {
      this.auditLogger.logSecurityEvent('EMAIL_VERIFIED', user.email, req, user.id);
    }

    this.logger.log(`Email verified for user ${user.email}`);

    return { email: user.email };
  }

  // ==========================================
  // Password Reset Methods
  // ==========================================

  /**
   * Request password reset (sends email if user exists)
   * Always returns success to prevent email enumeration
   */
  async requestPasswordReset(dto: ForgotPasswordDto, req?: Request): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, firstName: true, password: true },
    });

    // Always log the attempt for security monitoring
    if (req) {
      this.auditLogger.logSecurityEvent(
        'PASSWORD_RESET_REQUEST',
        dto.email,
        req,
        user?.id,
        { userExists: !!user },
      );
    }

    // If user doesn't exist or is OAuth-only, silently return (prevent enumeration)
    if (!user || !user.password) {
      this.logger.log(`Password reset requested for non-existent or OAuth user: ${dto.email}`);
      return;
    }

    // Generate and store reset token
    const token = this.generateSecureToken();
    const hashedToken = this.hashToken(token);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: expires,
      },
    });

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(user.email, token, user.firstName || undefined);

    this.logger.log(`Password reset email sent to ${user.email}`);
  }

  /**
   * Reset password with token
   */
  async resetPassword(dto: ResetPasswordDto, req?: Request): Promise<void> {
    const hashedToken = this.hashToken(dto.token);

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gt: new Date() },
      },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new BadRequestWithCode(ErrorCode.INVALID_OR_EXPIRED_TOKEN);
    }

    // Breach-corpus check (audit F10)
    if (await this.pwnedPasswordService.isCompromised(dto.password)) {
      throw new BadRequestWithCode(ErrorCode.PASSWORD_COMPROMISED);
    }

    // Hash new password
    const hashedPassword = await argon2.hash(dto.password);

    // Update password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Revoke all refresh tokens (force re-login on all devices)
    await this.revokeRefreshToken(user.id);

    // Revoke all sessions
    await this.sessionService.revokeAllSessions(user.id);

    // Log password reset complete
    if (req) {
      this.auditLogger.logSecurityEvent('PASSWORD_RESET_COMPLETE', user.email, req, user.id);
    }

    this.logger.log(`Password reset completed for user ${user.email}`);
  }

  async generateTokens(
    userId: string,
    email: string,
    userAgent?: string,
    ipAddress?: string,
    req?: Request,
  ): Promise<TokenPair> {
    // Generate access token (short-lived)
    const accessToken = this.jwtService.sign(
      { sub: userId, email, type: 'access' },
      { expiresIn: this.configService.jwtAccessExpiresIn as any },
    );

    // Generate refresh token (long-lived) with unique identifier
    const refreshToken = this.jwtService.sign(
      {
        sub: userId,
        email,
        type: 'refresh',
        jti: `${Date.now()}-${Math.random().toString(36).substring(7)}`, // Unique token ID
      },
      {
        expiresIn: this.configService.jwtRefreshExpiresIn as any,
        secret: this.configService.jwtRefreshSecret,
      },
    );

    // Calculate expiration date for refresh token
    const expiresIn = this.configService.jwtRefreshExpiresIn;
    const expiresAt = this.calculateExpirationDate(expiresIn);

    // Hash the refresh token before storing
    const hashedToken = await argon2.hash(refreshToken);

    // Store refresh token in database
    const storedRefreshToken = await this.prisma.refreshToken.create({
      data: {
        token: hashedToken,
        userId,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    // Create session for this refresh token
    if (req) {
      await this.sessionService.createSession(userId, storedRefreshToken.id, req);
    }

    // Enforce max tokens per user
    const userTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Revoke oldest tokens if limit exceeded
    if (userTokens.length > MAX_TOKENS_PER_USER) {
      const tokensToRevoke = userTokens.slice(MAX_TOKENS_PER_USER);
      const tokenIdsToRevoke = tokensToRevoke.map((t) => t.id);

      await this.prisma.refreshToken.updateMany({
        where: {
          id: { in: tokenIdsToRevoke },
        },
        data: { isRevoked: true },
      });

      // Also revoke associated sessions
      for (const tokenId of tokenIdsToRevoke) {
        await this.sessionService.revokeSessionByRefreshToken(tokenId);
      }
    }

    return { accessToken, refreshToken };
  }

  private calculateExpirationDate(expiresIn: string): Date {
    const now = new Date();
    const match = expiresIn.match(/^(\d+)([smhd])$/);

    if (!match) {
      throw new Error(`Invalid expiresIn format: ${expiresIn}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return new Date(now.getTime() + value * 1000);
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      default:
        throw new Error(`Unknown time unit: ${unit}`);
    }
  }

  // ==========================================
  // OAuth Methods
  // ==========================================

  /**
   * Validate OAuth user from Google/Microsoft/LinkedIn
   * Creates new user if first login, links to existing account if email matches
   *
   * SECURITY (nOAuth): `email` is only allowed to MATCH an existing local
   * account or CREATE a new one when the strategy asserts `emailTrusted`
   * (provider-verified ownership — see oauth-email-trust.util.ts).
   * Without this gate, an attacker who controls the asserted email (e.g.
   * the freely-editable `mail` attribute in their own Entra tenant) could
   * take over any local account by email collision. Identities already
   * linked by provider+providerId are unaffected.
   */
  async validateOAuthUser(oauthData: {
    provider: string;
    providerId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    accessToken?: string;
    refreshToken?: string;
    emailTrusted: boolean;
  }): Promise<any> {
    const {
      provider,
      providerId,
      email,
      firstName,
      lastName,
      avatarUrl,
      accessToken,
      refreshToken,
      emailTrusted,
    } = oauthData;

    // Check if OAuth provider already linked
    const existingOAuth = await this.prisma.oAuthProvider.findUnique({
      where: {
        provider_providerId: {
          provider: provider as any,
          providerId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            emailVerified: true,
            createdAt: true,
          },
        },
      },
    });

    // If OAuth provider exists, update last used and return user
    if (existingOAuth) {
      await this.prisma.oAuthProvider.update({
        where: { id: existingOAuth.id },
        data: {
          lastUsedAt: new Date(),
          accessToken,
          refreshToken,
          tokenExpiry: refreshToken ? new Date(Date.now() + 3600 * 1000) : null, // 1 hour expiry
        },
      });

      return existingOAuth.user;
    }

    // First-time sign-in with this OAuth identity: from here on the
    // asserted email decides which account gets linked or created, so it
    // MUST be provider-verified. Refuse otherwise (fail closed) — the
    // user can register with email/password instead.
    if (!emailTrusted) {
      this.auditLogger.logOAuthEmailUntrusted(provider, email);
      this.logger.warn(
        `Refused OAuth ${provider} sign-in for unverified email assertion (${email}) — ` +
          'auto-link/creation blocked (nOAuth mitigation)',
      );
      throw new ForbiddenWithCode(ErrorCode.OAUTH_EMAIL_UNVERIFIED);
    }

    // Check if user with this email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        emailVerified: true,
        createdAt: true,
        password: true,
        avatarUrl: true,
      },
    });

    // If user exists, link OAuth provider to existing account
    if (existingUser) {
      const linkedUser = await this.prisma.$transaction(async (tx: TransactionClient) => {
        // Create OAuth provider link
        await tx.oAuthProvider.create({
          data: {
            provider: provider as any,
            providerId,
            email,
            displayName: firstName && lastName ? `${firstName} ${lastName}` : undefined,
            avatarUrl,
            accessToken,
            refreshToken,
            tokenExpiry: refreshToken ? new Date(Date.now() + 3600 * 1000) : null,
            userId: existingUser.id,
          },
        });

        // Update user with OAuth provider info if not set
        const updatedUser = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            emailVerified: true, // OAuth emails are pre-verified
            avatarUrl: avatarUrl || existingUser.avatarUrl,
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            emailVerified: true,
            createdAt: true,
          },
        });

        return updatedUser;
      });

      this.logger.log(`Linked OAuth provider ${provider} to existing user ${email}`);
      return linkedUser;
    }

    // Create new user with OAuth provider
    const newUser = await this.prisma.$transaction(async (tx: TransactionClient) => {
      // Create user (password is null for OAuth users)
      const user = await tx.user.create({
        data: {
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          provider,
          providerId,
          emailVerified: true, // OAuth emails are pre-verified
          avatarUrl,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          emailVerified: true,
          createdAt: true,
        },
      });

      // Create OAuth provider link
      await tx.oAuthProvider.create({
        data: {
          provider: provider as any,
          providerId,
          email,
          displayName: firstName && lastName ? `${firstName} ${lastName}` : undefined,
          avatarUrl,
          accessToken,
          refreshToken,
          tokenExpiry: refreshToken ? new Date(Date.now() + 3600 * 1000) : null,
          userId: user.id,
        },
      });

      // Create empty profile
      await tx.profile.create({
        data: {
          userId: user.id,
        },
      });

      // Create user preferences with defaults
      await tx.userPreferences.create({
        data: {
          userId: user.id,
        },
      });

      // Create FREE subscription for new user
      // Note: Subscription is auto-created by getOrCreateSubscription on first access
      // No need to manually create here

      return user;
    });

    this.logger.log(`Created new user via OAuth provider ${provider}: ${email}`);
    return newUser;
  }

  /**
   * Link OAuth provider to existing user
   */
  async linkOAuthProvider(
    userId: string,
    provider: string,
    providerId: string,
    accessToken?: string,
    refreshToken?: string,
  ): Promise<void> {
    // Check if OAuth provider already linked to another user
    const existingOAuth = await this.prisma.oAuthProvider.findUnique({
      where: {
        provider_providerId: {
          provider: provider as any,
          providerId,
        },
      },
    });

    if (existingOAuth && existingOAuth.userId !== userId) {
      throw new ConflictWithCode(ErrorCode.OAUTH_ALREADY_LINKED);
    }

    if (existingOAuth) {
      // Update existing OAuth provider
      await this.prisma.oAuthProvider.update({
        where: { id: existingOAuth.id },
        data: {
          lastUsedAt: new Date(),
          accessToken,
          refreshToken,
          tokenExpiry: refreshToken ? new Date(Date.now() + 3600 * 1000) : null,
        },
      });
    } else {
      // Create new OAuth provider link
      await this.prisma.oAuthProvider.create({
        data: {
          provider: provider as any,
          providerId,
          userId,
          accessToken,
          refreshToken,
          tokenExpiry: refreshToken ? new Date(Date.now() + 3600 * 1000) : null,
        },
      });
    }

    this.logger.log(`Linked OAuth provider ${provider} to user ${userId}`);
  }

  /**
   * Unlink OAuth provider from user
   */
  async unlinkOAuthProvider(userId: string, provider: string): Promise<void> {
    // Check if user has password set (can't unlink if OAuth is only auth method)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user?.password) {
      throw new BadRequestWithCode(ErrorCode.CANNOT_UNLINK_ONLY_AUTH_METHOD);
    }

    // Delete OAuth provider
    await this.prisma.oAuthProvider.delete({
      where: {
        provider_userId: {
          provider: provider as any,
          userId,
        },
      },
    });

    this.logger.log(`Unlinked OAuth provider ${provider} from user ${userId}`);
  }

  /**
   * Get all linked OAuth providers for user
   */
  async getLinkedOAuthProviders(userId: string) {
    return this.prisma.oAuthProvider.findMany({
      where: { userId },
      select: {
        provider: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  // ==========================================
  // GDPR Data Export (Art. 15 / Art. 20 DSGVO)
  // ==========================================

  /**
   * Build a structured, machine-readable JSON export of all data we hold
   * for the given user. Sensitive credential material (password hashes,
   * raw tokens, encrypted 2FA secrets, OAuth tokens) is intentionally
   * excluded — GDPR access right does not require disclosure of security
   * material that would compromise the account if leaked.
   *
   * Every user-scoped relation in `schema.prisma` must be represented here.
   * The export used to silently omit appointments, validations, mailbox
   * connections, trusted devices, the 2FA status and the LLM usage events,
   * and capped `auditLogs` at 500 rows — an Art. 15(1) disclosure cannot be
   * paginated away (issue #806). When you add a user-scoped model, add it
   * here and to {@link UserErasureService} in the same change.
   *
   * `auditLogs` is deliberately NOT included: nothing writes to that table
   * (0 `prisma.auditLog.create` call sites), so the key only ever shipped an
   * empty array and implied a record we do not keep. The security events are
   * Winston files instead — described under `meta.securityLogs`.
   */
  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            skills: true,
            certificates: true,
            education: true,
            experiences: true,
            projects: true,
            languages: true,
          },
        },
        preferences: true,
        jobPostings: true,
        applications: true,
        validations: true,
        appointments: true,
        sessions: true,
        subscription: { include: { usage: true } },
        interviewSessions: { include: { questions: true, feedback: true } },
        oauthProviders: {
          select: {
            provider: true,
            email: true,
            displayName: true,
            avatarUrl: true,
            lastUsedAt: true,
            createdAt: true,
          },
        },
        // Device-trust cookies are matched by `deviceTokenHash`; disclosing it
        // would hand over a 2FA bypass, so only the display metadata ships.
        trustedDevices: {
          select: {
            id: true,
            deviceName: true,
            browser: true,
            os: true,
            ipAddress: true,
            expiresAt: true,
            lastUsedAt: true,
            createdAt: true,
          },
        },
        // Status only — the encrypted TOTP secret and its IV/auth tag are
        // account-compromising material, not disclosable personal data.
        twoFactorAuth: {
          select: { isEnabled: true, verifiedAt: true, createdAt: true, updatedAt: true },
        },
        // Mailbox OAuth material (refresh-token ciphertext, IV, auth tag,
        // webhook client state) is excluded for the same reason.
        mailboxConnections: {
          select: {
            id: true,
            provider: true,
            status: true,
            emailAddress: true,
            scope: true,
            subscriptionExpiresAt: true,
            lastSyncedAt: true,
            lastErrorAt: true,
            createdAt: true,
            updatedAt: true,
            emailEvents: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundWithCode(ErrorCode.USER_NOT_FOUND);
    }

    // Strip sensitive credential fields before returning
    const {
      password: _pw,
      emailVerificationToken: _evt,
      passwordResetToken: _prt,
      ...userPublic
    } = user as Record<string, unknown> & {
      password?: unknown;
      emailVerificationToken?: unknown;
      passwordResetToken?: unknown;
    };

    return {
      meta: {
        format: 'applo.user-export.v2',
        exportedAt: new Date().toISOString(),
        notice:
          'Diese Datei enthält die personenbezogenen Daten, die Applo zu deinem Konto speichert ' +
          '(Art. 15 und Art. 20 DSGVO). Sicherheitsmaterial (Passwort-Hash, Rohtokens, ' +
          'verschlüsseltes 2FA-Geheimnis, OAuth-Refresh-Tokens) ist bewusst nicht enthalten: ' +
          'seine Offenlegung würde das Konto kompromittieren.',
        ...ACCESS_RIGHT_DISCLOSURE,
      },
      user: userPublic,
      llmUsageEvents: await this.llmUsage.exportEventsForActor(userId),
    };
  }
}
