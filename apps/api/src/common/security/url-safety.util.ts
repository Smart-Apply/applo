import * as dns from 'dns';
import { BadRequestException } from '@nestjs/common';
import ipaddr from 'ipaddr.js';

/**
 * SSRF guard for user-supplied URLs (job-posting URL parsing).
 *
 * Security audit finding F1 (High): the job-posting URL parser fetched
 * whatever URL the user submitted (validator.js `@IsUrl()` only checks
 * shape, not target) via both axios (Cheerio path) and Playwright (agent
 * path), following redirects. That allows reading cloud metadata endpoints
 * (`169.254.169.254`), internal services, and port-scanning the private
 * network — with the response text returned to the user (readable SSRF).
 *
 * These helpers are pure/synchronous where possible so they're cheap to
 * call on every redirect hop, not just the initial URL.
 */

const SAFE_SCHEMES = new Set(['http:', 'https:']);

/**
 * Validate URL syntax before any network I/O: scheme allow-list + reject
 * embedded credentials (`user:pass@host`), which are a common SSRF/phishing
 * vector and serve no legitimate purpose for a job-posting URL.
 */
export function assertUrlSyntaxSafe(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BadRequestException('Invalid URL');
  }

  if (!SAFE_SCHEMES.has(url.protocol)) {
    throw new BadRequestException('Only http:// and https:// URLs are supported');
  }

  if (url.username || url.password) {
    throw new BadRequestException('URLs with embedded credentials are not supported');
  }

  return url;
}

/**
 * Reject an IP address that falls in any non-public range: loopback,
 * private (RFC1918), link-local (incl. the 169.254.169.254 cloud metadata
 * address), unique-local (fc00::/7), carrier-grade NAT, reserved, or
 * unspecified/broadcast. IPv4-mapped IPv6 addresses are unwrapped first so
 * `::ffff:169.254.169.254` can't bypass the check.
 */
export function isBlockedIp(ip: string): boolean {
  if (!ipaddr.isValid(ip)) {
    // Unparseable address — fail closed.
    return true;
  }

  let addr = ipaddr.parse(ip);
  if (addr.kind() === 'ipv6') {
    const v6 = addr as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) {
      addr = v6.toIPv4Address();
    }
  }

  const range = addr.range();
  return range !== 'unicast';
}

/**
 * Resolve a hostname and assert every returned address is public. Blocks
 * both a directly-blocked-IP URL and DNS-based SSRF (a public-looking
 * hostname that resolves to a private/link-local address).
 */
export async function resolveAndAssertPublic(hostname: string): Promise<string[]> {
  // An IP literal in the hostname position — check it directly, no DNS needed.
  if (ipaddr.isValid(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new BadRequestException(
        'This URL points to a private or internal network address and cannot be fetched',
      );
    }
    return [hostname];
  }

  let records: dns.LookupAddress[];
  try {
    records = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new BadRequestException('Could not resolve the host for this URL');
  }

  if (records.length === 0) {
    throw new BadRequestException('Could not resolve the host for this URL');
  }

  const addresses = records.map((r) => r.address);
  if (addresses.some((addr) => isBlockedIp(addr))) {
    throw new BadRequestException(
      'This URL points to a private or internal network address and cannot be fetched',
    );
  }

  return addresses;
}

/**
 * Full guard: validate syntax, then resolve + assert every hop is public.
 * Call this on the initial URL AND on every redirect `Location` header
 * before following it (see url.parser.ts) — a request can pass this check
 * on the entry URL and still redirect to a private target.
 */
export async function assertUrlIsPublic(raw: string): Promise<{ url: URL; addresses: string[] }> {
  const url = assertUrlSyntaxSafe(raw);
  const addresses = await resolveAndAssertPublic(url.hostname);
  return { url, addresses };
}
