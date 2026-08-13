import { JwtService } from '@nestjs/jwt';
import { CustomThrottlerGuard } from './custom-throttler.guard';

const JWT_SECRET = 'unit-test-secret';

/**
 * The guard's tracker is the security boundary of the whole rate-limiting
 * layer (audit 2026-08-13, F16): it must be derived from `req.ip` (trusted,
 * proxy-derived) or a *verified* JWT — never from client-supplied headers.
 */
describe('CustomThrottlerGuard.getTracker (Unit)', () => {
  let guard: CustomThrottlerGuard;
  let jwt: JwtService;

  const trackerFor = (req: Record<string, unknown>): Promise<string> =>
    (guard as unknown as { getTracker(r: Record<string, unknown>): Promise<string> }).getTracker(
      req,
    );

  beforeEach(() => {
    // The base ThrottlerGuard constructor args are irrelevant to getTracker.
    guard = new CustomThrottlerGuard(
      { throttlers: [] } as never,
      { increment: vi.fn() } as never,
      { getAllAndOverride: vi.fn() } as never,
    );
    jwt = new JwtService({ secret: JWT_SECRET });
    (guard as unknown as { jwtService: JwtService }).jwtService = jwt;
  });

  it('ignores forged CF-Connecting-IP and X-Forwarded-For headers', async () => {
    const tracker = await trackerFor({
      ip: '203.0.113.7',
      headers: {
        'cf-connecting-ip': '10.99.99.1',
        'x-forwarded-for': '10.99.99.2, 10.99.99.3',
      },
    });
    expect(tracker).toBe('203.0.113.7');
  });

  it('buckets per user for a valid access token cookie', async () => {
    const token = jwt.sign({ sub: 'user-abc', email: 'a@b.c' });
    const tracker = await trackerFor({
      ip: '203.0.113.7',
      headers: {},
      cookies: { access_token: token },
    });
    expect(tracker).toBe('user:user-abc');
  });

  it('buckets per user for a valid Authorization bearer token', async () => {
    const token = jwt.sign({ sub: 'user-def' });
    const tracker = await trackerFor({
      ip: '203.0.113.7',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(tracker).toBe('user:user-def');
  });

  it('falls back to IP for a token signed with the wrong secret', async () => {
    const forged = new JwtService({ secret: 'attacker-secret' }).sign({ sub: 'user-abc' });
    const tracker = await trackerFor({
      ip: '203.0.113.7',
      headers: {},
      cookies: { access_token: forged },
    });
    expect(tracker).toBe('203.0.113.7');
  });

  it('falls back to IP for an expired token', async () => {
    const expired = jwt.sign({ sub: 'user-abc' }, { expiresIn: -60 });
    const tracker = await trackerFor({
      ip: '203.0.113.7',
      headers: {},
      cookies: { access_token: expired },
    });
    expect(tracker).toBe('203.0.113.7');
  });

  it('does not let a refresh token buy its own bucket', async () => {
    const refresh = jwt.sign({ sub: 'user-abc', type: 'refresh' });
    const tracker = await trackerFor({
      ip: '203.0.113.7',
      headers: {},
      cookies: { access_token: refresh },
    });
    expect(tracker).toBe('203.0.113.7');
  });

  it('never throws on malformed input and reports unknown as last resort', async () => {
    const tracker = await trackerFor({ headers: { authorization: 'Bearer not-a-jwt' } });
    expect(tracker).toBe('unknown');
  });
});
