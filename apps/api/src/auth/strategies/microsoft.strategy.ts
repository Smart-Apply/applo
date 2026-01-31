import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-microsoft';
import { ConfigService } from '../../config/config.service';
import { AuthService } from '../auth.service';
import { OAuthProviderType } from '../dto/oauth.dto';

/**
 * Microsoft OAuth Strategy
 * Uses passport-microsoft to authenticate users with Microsoft/Azure AD
 * Similar flow to Google OAuth - redirects to Microsoft login, then callback handles the response
 */
@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
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
   * @param profile User profile from Microsoft
   * @param done Passport callback
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    try {
      console.log('Microsoft profile received:', JSON.stringify(profile, null, 2));
      
      // passport-microsoft profile structure:
      // { id, displayName, name: { familyName, givenName }, emails: [{ type, value }], _json: {...} }
      const id = profile.id;
      const displayName = profile.displayName;
      const firstName = profile.name?.givenName || profile._json?.givenName;
      const lastName = profile.name?.familyName || profile._json?.surname;
      
      // Email can be in emails array or in _json
      let email = profile.emails?.[0]?.value;
      if (!email && profile._json) {
        email = profile._json.mail || profile._json.userPrincipalName;
      }
      
      if (!email) {
        console.error('No email found in Microsoft profile:', profile);
        return done(new Error('Email not provided by Microsoft'), false);
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
      });

      return done(null, user);
    } catch (error) {
      console.error('Microsoft OAuth validation error:', error);
      return done(error as Error, false);
    }
  }
}
