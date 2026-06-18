import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Safely extract origin from a URL string. Returns null if invalid.
 */
function safeOrigin(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// Edge Middleware (runs on Cloudflare Workers via OpenNext, and on the
// Next.js Edge runtime when self-hosted).
//
// Why `middleware.ts` and not `proxy.ts`?
//   Next.js 16 introduced `proxy.ts` which always runs on Node.js. The
//   Cloudflare Workers runtime is V8-only and cannot run Node middleware,
//   so we keep the legacy `middleware.ts` (Edge runtime) for portability.
//   This file does no Node-specific work — just response header writes.
export function middleware(_request: NextRequest) {
  const response = NextResponse.next();

  // ---- Build the list of allowed API origins for CSP ----
  //
  // IMPORTANT: `NEXT_PUBLIC_*` env vars are inlined at BUILD time (even in
  // middleware/proxy bundles). To allow CSP to be reconfigured at runtime
  // — e.g. after switching domains or running on multiple hostnames (legacy
  // Azure FQDN + new custom domain) — we ALSO read a non-public env var
  // `CSP_API_ORIGINS` which is a comma-separated list of allowed origins.
  // This one IS resolved at request time on the server.
  const isDevelopment = process.env.NODE_ENV === 'development';

  const buildTimeOrigin = safeOrigin(process.env.NEXT_PUBLIC_API_URL);
  const runtimeOrigins = (process.env.CSP_API_ORIGINS || '')
    .split(',')
    .map((s) => safeOrigin(s.trim()))
    .filter((o): o is string => Boolean(o));

  const apiOrigins = new Set<string>();
  if (buildTimeOrigin) apiOrigins.add(buildTimeOrigin);
  for (const o of runtimeOrigins) apiOrigins.add(o);
  if (apiOrigins.size === 0) {
    apiOrigins.add('http://localhost:3000');
  }

  const apiOriginList = Array.from(apiOrigins).join(' ');

  const connectSrc = isDevelopment
    ? `'self' ${apiOriginList} ws://localhost:3001 ws://localhost:3000`
    : `'self' ${apiOriginList}`;

  // Cloudflare Turnstile (CAPTCHA on /register) loads its widget script
  // and iframe from challenges.cloudflare.com. Without these allow-lists
  // the CSP blocks both.
  const turnstileOrigin = 'https://challenges.cloudflare.com';

  // Cloudflare Web Analytics (auto-injected by Workers when enabled in
  // the dashboard) loads a beacon from static.cloudflareinsights.com.
  // Without this allow-list the script is blocked and the CSP report
  // floods the console — purely a noise issue, but worth fixing.
  const cloudflareInsightsOrigin = 'https://static.cloudflareinsights.com';

  // Sentry ingest endpoints. DSNs have the shape
  // `https://<key>@<org>.ingest.<region>.sentry.io/<project>` where
  // `<region>` is missing for US-region orgs and `de` for EU-region
  // orgs. We allow both so the frontend SDK from PR #480 can actually
  // transmit events — otherwise CSP silently drops every error report
  // and Sentry stays empty no matter what crashes in the browser.
  // Wildcards on the leftmost label match the org-specific subdomain.
  const sentryIngestOrigins =
    'https://*.ingest.sentry.io https://*.ingest.de.sentry.io';

  // Azure OpenAI Realtime API (voice interview). The browser POSTs its WebRTC
  // SDP offer directly to the Azure resource host (`<resource>.openai.azure.com`)
  // using a short-lived ephemeral token. A wildcard keeps the exact resource
  // name out of the build so it can change without a redeploy.
  const azureRealtimeOrigin = 'https://*.openai.azure.com';

  // Set CSP header dynamically based on runtime environment
  // Note: 'unsafe-eval' is required for Handlebars template compilation in the browser
  // This is needed for the template preview feature which renders Handlebars templates client-side
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-eval' 'unsafe-inline' ${turnstileOrigin} ${cloudflareInsightsOrigin}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: https: ${apiOriginList}`,
    "font-src 'self' data:",
    // blob:/MediaStream playback for the voice interview's remote audio track.
    "media-src 'self' blob:",
    `connect-src ${connectSrc} ${turnstileOrigin} ${cloudflareInsightsOrigin} ${sentryIngestOrigins} ${azureRealtimeOrigin}`,
    `frame-src ${turnstileOrigin}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  return response;
}

// Apply middleware to all routes. Edge runtime is the default for
// `middleware.ts`, so no explicit `runtime` export is needed.
export const config = {
  matcher: '/:path*',
};
