import { ExecutionContext, Injectable, Type } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { CodedHttpException } from '../../common/exceptions/coded-http.exception';

/**
 * Metadata stashed on the request by the OAuth callback guards when the
 * strategy's verify callback rejects authentication. The controller reads
 * this to redirect the browser to the login page with a tailored error
 * message instead of returning a raw JSON 401.
 */
export interface OAuthCallbackError {
  /** Structured error code (e.g. `INVITE_CODE_REQUIRED`) when available. */
  code?: string;
  /** Human-readable reason — falls back to `'authentication_failed'`. */
  message: string;
}

/**
 * Internal request augmentation so the controller can pull the failure
 * metadata typed instead of via `(req as any)`.
 */
export type OAuthRequest = Request & { oauthCallbackError?: OAuthCallbackError };

/**
 * Build an OAuth callback guard that does NOT throw `UnauthorizedException`
 * when the verify callback rejects auth. Instead it leaves `req.user`
 * unset and attaches a structured `oauthCallbackError` to the request so
 * the controller can redirect the browser to a friendly login page.
 *
 * Without this, throwing `ForbiddenWithCode(INVITE_CODE_REQUIRED)` inside
 * the strategy would surface as raw JSON 401 to a user mid-OAuth-redirect —
 * the controller's handler would never run.
 *
 * Strategy contract: when `done(err)` is called, the `err` lands here as
 * the `err` argument. We surface `err.code` so the controller can branch
 * (e.g. show `oauth=error&message=invite_required` for a closed-beta
 * block vs the generic `authentication_failed`).
 */
function createOAuthCallbackGuard(strategy: 'google' | 'microsoft'): Type<unknown> {
  @Injectable()
  class OAuthCallbackGuard extends AuthGuard(strategy) {
    handleRequest<TUser = unknown>(
      err: unknown,
      user: TUser,
      info: unknown,
      context: ExecutionContext,
    ): TUser {
      if (err || !user) {
        const req = context.switchToHttp().getRequest<OAuthRequest>();
        req.oauthCallbackError = {
          code: err instanceof CodedHttpException ? err.code : undefined,
          message:
            err instanceof Error
              ? err.message
              : typeof info === 'object' && info && 'message' in info
                ? String((info as { message: unknown }).message)
                : 'authentication_failed',
        };
        // Returning `null as TUser` lets `@CurrentUser()` resolve to null
        // so the handler's `if (!user) { redirect }` branch runs.
        return null as TUser;
      }
      return user;
    }
  }
  return OAuthCallbackGuard;
}

export const GoogleOAuthCallbackGuard = createOAuthCallbackGuard('google');
export const MicrosoftOAuthCallbackGuard = createOAuthCallbackGuard('microsoft');
