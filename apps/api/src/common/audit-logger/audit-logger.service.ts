import { Injectable } from '@nestjs/common';
import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import type { Request } from 'express';

export enum AuditEventType {
  // Authentication
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  REGISTRATION = 'REGISTRATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  REFRESH_TOKEN_USED = 'REFRESH_TOKEN_USED',

  // Security
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CSRF_VALIDATION_FAILED = 'CSRF_VALIDATION_FAILED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',

  // Account Changes
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_CHANGE_FAILED = 'PASSWORD_CHANGE_FAILED',
  EMAIL_CHANGED = 'EMAIL_CHANGED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',
  ACCOUNT_DELETE_FAILED = 'ACCOUNT_DELETE_FAILED',

  // Suspicious Activity
  MULTIPLE_FAILED_LOGINS = 'MULTIPLE_FAILED_LOGINS',
  IP_CHANGE_DETECTED = 'IP_CHANGE_DETECTED',
  /**
   * A refresh token that was already revoked/rotated was presented again.
   * Under strict rotation this only happens if the token was stolen and
   * replayed (or, far less likely, a client retried a request after
   * missing the rotated response) — treated as theft: the whole session/
   * token family for the user is revoked. See auth.service.ts `refresh()`.
   */
  REFRESH_TOKEN_REUSE_DETECTED = 'REFRESH_TOKEN_REUSE_DETECTED',

  // Closed-beta invite-code gate
  INVITE_CODE_ISSUED = 'INVITE_CODE_ISSUED',
  INVITE_CODE_REDEEMED = 'INVITE_CODE_REDEEMED',
  INVITE_CODE_REJECTED = 'INVITE_CODE_REJECTED',
  /**
   * A brand-new OAuth signup (Google / Microsoft / Azure AD) was blocked
   * because the closed-beta gate is on and OAuth has no place to enter
   * an invite code. Distinct from `INVITE_CODE_REJECTED` so we can chart
   * "how many would-be users hit the OAuth wall" separately from
   * email/password attempts (signal for whether to build a pre-claim
   * flow post-beta).
   */
  OAUTH_SIGNUP_BLOCKED = 'OAUTH_SIGNUP_BLOCKED',
}

export interface AuditLogEntry {
  eventType: AuditEventType;
  userId?: string;
  email?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  severity: 'info' | 'warning' | 'critical';
}

@Injectable()
export class AuditLoggerService {
  private logger = createLogger({
    format: format.combine(format.timestamp(), format.json()),
    transports: [
      // Daily rotating file for audit logs
      new DailyRotateFile({
        filename: 'logs/audit-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '90d', // Keep 90 days
        level: 'info',
      }),
      // Console in development
      ...(process.env.NODE_ENV === 'development'
        ? [
            new transports.Console({
              format: format.combine(format.colorize(), format.simple()),
            }),
          ]
        : []),
    ],
  });

  log(entry: AuditLogEntry) {
    // Map 'warning' to 'warn' for winston compatibility
    const level = entry.severity === 'warning' ? 'warn' : entry.severity;

    this.logger.log({
      level,
      message: entry.eventType,
      ...entry,
    });
  }

  logLoginAttempt(email: string, success: boolean, req: Request, userId?: string) {
    this.log({
      eventType: success ? AuditEventType.LOGIN_SUCCESS : AuditEventType.LOGIN_FAILED,
      email,
      userId,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      severity: success ? 'info' : 'warning',
      metadata: { success },
    });
  }

  logRegistration(email: string, userId: string, req: Request) {
    this.log({
      eventType: AuditEventType.REGISTRATION,
      email,
      userId,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      severity: 'info',
    });
  }

  logLogout(userId: string, req: Request) {
    this.log({
      eventType: AuditEventType.LOGOUT,
      userId,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      severity: 'info',
    });
  }

  logRefreshTokenUsed(userId: string, email: string, req: Request) {
    this.log({
      eventType: AuditEventType.REFRESH_TOKEN_USED,
      userId,
      email,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      severity: 'info',
    });
  }

  logRateLimitViolation(userId: string | undefined, endpoint: string, req: Request) {
    this.log({
      eventType: AuditEventType.RATE_LIMIT_EXCEEDED,
      userId,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      severity: 'warning',
      metadata: { endpoint },
    });
  }

  logCsrfValidationFailed(userId: string | undefined, req: Request) {
    this.log({
      eventType: AuditEventType.CSRF_VALIDATION_FAILED,
      userId,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      severity: 'warning',
      metadata: {
        method: req.method,
        url: req.url,
      },
    });
  }

  logUnauthorizedAccess(userId: string | undefined, endpoint: string, req: Request) {
    this.log({
      eventType: AuditEventType.UNAUTHORIZED_ACCESS,
      userId,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      severity: 'warning',
      metadata: { endpoint },
    });
  }

  logPasswordChange(userId: string, req: Request) {
    this.log({
      eventType: AuditEventType.PASSWORD_CHANGED,
      userId,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      severity: 'info',
    });
  }

  logProfileUpdate(userId: string, req: Request, metadata?: Record<string, any>) {
    this.log({
      eventType: AuditEventType.PROFILE_UPDATED,
      userId,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      severity: 'info',
      metadata,
    });
  }

  logSecurityEvent(
    eventType: string,
    email: string,
    req: Request,
    userId?: string,
    metadata?: Record<string, any>,
  ) {
    // Map string event types to enum values
    const eventTypeEnum = AuditEventType[eventType as keyof typeof AuditEventType] || eventType;

    // Determine severity based on event type
    const failedEvents = [
      'PASSWORD_CHANGE_FAILED',
      'ACCOUNT_DELETE_FAILED',
      'REFRESH_TOKEN_REUSE_DETECTED',
    ];
    const severity = failedEvents.includes(eventType) ? 'warning' : 'info';

    this.log({
      eventType: eventTypeEnum,
      email,
      userId,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      severity,
      metadata,
    });
  }

  logAccountDeleted(userId: string, email: string, req: Request, metadata?: Record<string, any>) {
    this.log({
      eventType: AuditEventType.ACCOUNT_DELETED,
      userId,
      email,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      severity: 'info',
      metadata,
    });
  }

  /**
   * Admin issued one or more invite codes. We log the prefixes (first
   * 8 chars of the plaintext code) so audits can correlate "code XXXX
   * was issued at T1 and redeemed at T2" without ever persisting the
   * full plaintext.
   */
  logInviteCodesIssued(
    adminUserId: string,
    adminEmail: string,
    req: Request,
    metadata: { count: number; prefixes: string[]; note?: string },
  ) {
    this.log({
      eventType: AuditEventType.INVITE_CODE_ISSUED,
      userId: adminUserId,
      email: adminEmail,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      severity: 'info',
      metadata,
    });
  }

  /**
   * Successful invite-code redemption during registration. Logged on the
   * new user's behalf (the user did not exist before this call).
   */
  logInviteCodeRedeemed(
    userId: string,
    email: string,
    req: Request,
    metadata: { inviteCodeId: string; prefix: string },
  ) {
    this.log({
      eventType: AuditEventType.INVITE_CODE_REDEEMED,
      userId,
      email,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      severity: 'info',
      metadata,
    });
  }

  /**
   * Rejected invite-code attempt — wrong code, already used, expired, or
   * missing while the gate is enabled. Warning severity so a Sentry/SIEM
   * alert can fire if the rate spikes (signals brute-forcing).
   */
  logInviteCodeRejected(
    email: string | undefined,
    req: Request,
    metadata: { reason: 'missing' | 'invalid' | 'already_used' | 'expired'; prefix?: string },
  ) {
    this.log({
      eventType: AuditEventType.INVITE_CODE_REJECTED,
      email,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      severity: 'warning',
      metadata,
    });
  }

  /**
   * Brand-new OAuth signup blocked because the closed-beta gate is on.
   * Called from inside `AuthService.validateOAuthUser` which runs in the
   * passport verify callback — there is no Express `req` in scope there,
   * so IP/UA are intentionally omitted. The provider + email is enough
   * to correlate with web-server access logs if a deeper trace is needed.
   */
  logOAuthSignupBlocked(provider: string, email: string) {
    this.log({
      eventType: AuditEventType.OAUTH_SIGNUP_BLOCKED,
      email,
      ip: 'unknown',
      userAgent: 'oauth-callback',
      timestamp: new Date(),
      severity: 'warning',
      metadata: { provider },
    });
  }

  private getClientIp(req: any): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }
}
