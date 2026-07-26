import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-microsoft';
import { ConfigService } from '../../config/config.service';
import { AuthService } from '../auth.service';
import { OAuthProviderType } from '../dto/oauth.dto';
import {
  decodeJwtPayload,
  isMicrosoftEmailTrusted,
  MicrosoftIdTokenClaims,
} from '../utils/oauth-email-trust.util';

/**
 * Token-endpoint response params surfaced by passport-oauth2 when the
 * verify callback is registered with arity 5. `id_token` is present
 * because the strategy requests the `openid` scope.
 */
interface MicrosoftTokenParams {
  id_token?: string;
}

/**
 * Microsoft OAuth Strategy
 * Uses passport-microsoft to authenticate users with Microsoft/Azure AD
 * Similar flow to Google OAuth - redirects to Microsoft login, then callback handles the response
 *
 * SECURITY (nOAuth): the Graph `mail` attribute — and therefore the email
 * this strategy extracts — is freely editable by admins of ANY Entra
 * tenant, and `tenant: 'common'` accepts sign-ins from all of them. The
 * asserted email is therefore attacker-controlled and MUST NOT drive
 * account linking on its own. We decode the id_token (3rd `callbackArity`
 * argument → passport-oauth2 passes the token-endpoint params) and only
 * mark the email as trusted for MSA personal accounts or org tenants
 * asserting `xms_edov` / `email_verified`. `AuthService.validateOAuthUser`
 * refuses email-match auto-linking and account creation when untrusted.
 */
@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft', 5) {
  private readonly logger = new Logger(MicrosoftStrategy.name);

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    super({
      clientID: configService.azureAdClientId || '',
      clientSecret: configService.azureAdClientSecret || '',
      callbackURL: configService.microsoftCallbackUrl,
      scope: ['user.read', 'openid', 'profile', 'email'],
      tenant: configService.azureAdTenantId || 'common',
      authorizationURL: `https://login.microsoftonline.com/${configService.azureAdTenantId || 'common'}/oauth2/v2.0/authorize`,
      tokenURL: `https://login.microsoftonline.com/${configService.azureAdTenantId || 'common'}/oauth2/v2.0/token`,
    });
  }

  /**
   * Validate OAuth callback from Microsoft
   * @param accessToken OAuth access token
   * @param refreshToken OAuth refresh token
   * @param params Raw token-endpoint response (carries the id_token)
   * @param profile User profile from Microsoft
   * @param done Passport callback
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    params: MicrosoftTokenParams,
    profile: any,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    try {
      this.logger.debug(`Microsoft profile received: id=${profile?.id}`);

      // passport-microsoft profile structure:
      // { id, displayName, name: { familyName, givenName }, emails: [{ type, value }], _json: {...} }
      const id = profile.id;
      const firstName = profile.name?.givenName || profile._json?.givenName;
      const lastName = profile.name?.familyName || profile._json?.surname;

      // Email can be in emails array or in _json
      let email = profile.emails?.[0]?.value;
      if (!email && profile._json) {
        email = profile._json.mail || profile._json.userPrincipalName;
      }

      if (!email) {
        this.logger.error(`No email found in Microsoft profile (id=${profile?.id})`);
        return done(new Error('Email not provided by Microsoft'), false);
      }

      // nOAuth mitigation: decide whether Microsoft actually vouches for
      // this email before it may match/link/create a local account.
      const claims = decodeJwtPayload(params?.id_token) as MicrosoftIdTokenClaims | null;
      const emailTrusted = isMicrosoftEmailTrusted(claims);
      if (!emailTrusted) {
        this.logger.warn(
          `Microsoft-asserted email is NOT domain-verified (tid=${claims?.tid ?? 'unknown'}); ` +
            'auto-linking/creation will be refused for first-time sign-ins',
        );
      }

      // Validate OAuth user with our auth service
      const user = await this.authService.validateOAuthUser({
        provider: OAuthProviderType.MICROSOFT,
        providerId: id,
        email,
        firstName,
        lastName,
        accessToken,
        refreshToken,
        emailTrusted,
      });

      return done(null, user);
    } catch (error) {
      this.logger.error('Microsoft OAuth validation error', error as Error);
      return done(error as Error, false);
    }
  }
}
