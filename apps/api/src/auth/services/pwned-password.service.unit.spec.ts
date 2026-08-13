import { createHash } from 'crypto';
import { PwnedPasswordService } from './pwned-password.service';
import type { ConfigService } from '../../config/config.service';

const PASSWORD = 'Password123!';
const SHA1 = createHash('sha1').update(PASSWORD).digest('hex').toUpperCase();
const PREFIX = SHA1.slice(0, 5);
const SUFFIX = SHA1.slice(5);

function serviceWith(enabled: boolean): PwnedPasswordService {
  return new PwnedPasswordService({
    pwnedPasswordCheckEnabled: enabled,
  } as unknown as ConfigService);
}

function mockFetchResponse(body: string, ok = true, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok, status, text: () => Promise.resolve(body) }),
  );
}

describe('PwnedPasswordService (Unit)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('flags a password whose hash suffix appears with a positive count', async () => {
    mockFetchResponse(`0018A45C4D1DEF81644B54AB7F969B88D65:3\r\n${SUFFIX}:1523\r\nFFFFF:2`);

    await expect(serviceWith(true).isCompromised(PASSWORD)).resolves.toBe(true);

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    // k-anonymity: only the 5-char prefix leaves the server.
    expect(url).toBe(`https://api.pwnedpasswords.com/range/${PREFIX}`);
    expect(url).not.toContain(SUFFIX);
    expect((init.headers as Record<string, string>)['Add-Padding']).toBe('true');
  });

  it('does not flag a padded zero-count entry', async () => {
    mockFetchResponse(`${SUFFIX}:0`);
    await expect(serviceWith(true).isCompromised(PASSWORD)).resolves.toBe(false);
  });

  it('passes a password absent from the range', async () => {
    mockFetchResponse('0018A45C4D1DEF81644B54AB7F969B88D65:3');
    await expect(serviceWith(true).isCompromised(PASSWORD)).resolves.toBe(false);
  });

  it('fails open on network errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));
    await expect(serviceWith(true).isCompromised(PASSWORD)).resolves.toBe(false);
  });

  it('fails open on a non-200 response', async () => {
    mockFetchResponse('', false, 503);
    await expect(serviceWith(true).isCompromised(PASSWORD)).resolves.toBe(false);
  });

  it('does not call out at all when disabled', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(serviceWith(false).isCompromised(PASSWORD)).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
