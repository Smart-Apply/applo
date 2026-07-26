/**
 * OAuth email-trust evaluation (nOAuth mitigation).
 *
 * An email address asserted by an OAuth provider may only drive account
 * LINKING (attach the OAuth identity to an existing local account that
 * matches by email) or account CREATION when the provider actually
 * vouches for ownership of that address. Otherwise an attacker who
 * controls the asserted email value — e.g. the freely-editable `mail`
 * attribute of a user in their own Microsoft Entra tenant ("nOAuth",
 * Descope 2023) — could take over any existing account by email match.
 *
 * Trust rules:
 * - Google: the OIDC `email_verified` claim must be `true`
 *   (passport-google-oauth20 surfaces it as `profile.emails[].verified`).
 * - Microsoft: personal accounts (MSA consumer tenant) use the login
 *   email itself, which Microsoft verifies → trusted. Organizational
 *   tenants are only trusted when the id_token asserts
 *   `xms_edov === true` ("email domain owner verified" — an optional
 *   claim that must be enabled on the Entra app registration) or an
 *   explicit `email_verified === true`. Everything else — including a
 *   missing or undecodable id_token — is untrusted (fail closed).
 *
 * Already-linked identities (matched by provider + providerId) are NOT
 * affected by this gate; it only guards the email-match auto-link and
 * first-time account creation in `AuthService.validateOAuthUser`.
 */

/** Tenant id of the Microsoft consumer (personal / MSA) tenant. */
export const MSA_TENANT_ID = '9188040d-6c67-4c5b-b112-36a304b66dad';

/** Claims of interest from a Microsoft Entra / MSA id_token payload. */
export interface MicrosoftIdTokenClaims {
  /** Tenant id the authenticating user belongs to. */
  tid?: string;
  /** Asserted email (same mutable source as the Graph `mail` attribute). */
  email?: string;
  /** "Email domain owner verified" — optional claim, must be enabled on the app registration. */
  xms_edov?: boolean | string;
  /** OIDC-standard verified flag (not emitted by Entra today; checked for forward-compat). */
  email_verified?: boolean | string;
}

/**
 * Decode the payload of a JWT WITHOUT verifying its signature.
 *
 * Safe in this context only because the token is received directly from
 * the provider's token endpoint over TLS in a confidential-client code
 * exchange — the transport, not the signature, establishes authenticity.
 * Never use this for tokens that arrive from a browser or any other
 * untrusted channel.
 */
export function decodeJwtPayload(token: string | undefined): Record<string, unknown> | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    const parsed: unknown = JSON.parse(payload);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Coerce a claim that may arrive as boolean or the string "true". */
function claimIsTrue(value: boolean | string | undefined): boolean {
  return value === true || value === 'true';
}

/**
 * Decide whether a Microsoft-asserted email may be used for account
 * linking / creation. Fail-closed: no claims → untrusted.
 */
export function isMicrosoftEmailTrusted(claims: MicrosoftIdTokenClaims | null): boolean {
  if (!claims) return false;
  // Personal Microsoft accounts: the email IS the verified login identifier.
  if (claims.tid === MSA_TENANT_ID) return true;
  // Organizational tenants: only when Microsoft vouches for domain ownership.
  return claimIsTrue(claims.xms_edov) || claimIsTrue(claims.email_verified);
}
