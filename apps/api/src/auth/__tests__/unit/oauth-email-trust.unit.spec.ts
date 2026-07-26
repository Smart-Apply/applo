import {
  decodeJwtPayload,
  isMicrosoftEmailTrusted,
  MSA_TENANT_ID,
  MicrosoftIdTokenClaims,
} from '../../utils/oauth-email-trust.util';

function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (obj: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64(payload)}.signature`;
}

describe('oauth-email-trust.util (Unit)', () => {
  describe('decodeJwtPayload', () => {
    it('decodes a well-formed JWT payload', () => {
      expect(decodeJwtPayload(fakeJwt({ tid: 'abc', email: 'a@b.c' }))).toEqual({
        tid: 'abc',
        email: 'a@b.c',
      });
    });

    it('returns null for undefined, malformed, or non-object payloads', () => {
      expect(decodeJwtPayload(undefined)).toBeNull();
      expect(decodeJwtPayload('')).toBeNull();
      expect(decodeJwtPayload('not-a-jwt')).toBeNull();
      expect(decodeJwtPayload('a.b')).toBeNull();
      expect(decodeJwtPayload('a.!!!not-base64-json!!!.c')).toBeNull();
      const arrayPayload = `x.${Buffer.from('[1,2]').toString('base64url')}.y`;
      expect(decodeJwtPayload(arrayPayload)).toBeNull();
    });
  });

  describe('isMicrosoftEmailTrusted', () => {
    it('fails closed when claims are missing', () => {
      expect(isMicrosoftEmailTrusted(null)).toBe(false);
      expect(isMicrosoftEmailTrusted({})).toBe(false);
    });

    it('trusts personal Microsoft accounts (MSA consumer tenant)', () => {
      expect(isMicrosoftEmailTrusted({ tid: MSA_TENANT_ID })).toBe(true);
    });

    it('rejects org tenants without domain-ownership proof (nOAuth)', () => {
      const attackerTenant: MicrosoftIdTokenClaims = {
        tid: '11111111-2222-3333-4444-555555555555',
        email: 'victim@applo.ai',
      };
      expect(isMicrosoftEmailTrusted(attackerTenant)).toBe(false);
      expect(isMicrosoftEmailTrusted({ ...attackerTenant, xms_edov: false })).toBe(false);
      expect(isMicrosoftEmailTrusted({ ...attackerTenant, xms_edov: 'false' })).toBe(false);
    });

    it('trusts org tenants asserting xms_edov or email_verified', () => {
      const tid = '11111111-2222-3333-4444-555555555555';
      expect(isMicrosoftEmailTrusted({ tid, xms_edov: true })).toBe(true);
      expect(isMicrosoftEmailTrusted({ tid, xms_edov: 'true' })).toBe(true);
      expect(isMicrosoftEmailTrusted({ tid, email_verified: true })).toBe(true);
      expect(isMicrosoftEmailTrusted({ tid, email_verified: 'true' })).toBe(true);
    });
  });
});
