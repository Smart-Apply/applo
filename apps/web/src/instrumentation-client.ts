/**
 * Browser-side Sentry initialisation. Next.js auto-loads this file once,
 * on the client, before any user code runs.
 *
 * Why only client? The backend (NestJS on Fly) already runs its own
 * `@sentry/node` SDK from `apps/api`. The OpenNext Worker runtime that
 * serves the frontend is a Cloudflare Worker, which would need the
 * separate `@sentry/cloudflare` package (different runtime adapter) —
 * not worth wiring for the closed-beta cohort. What we *do* need is
 * visibility into bugs that only manifest in the user's browser
 * (React render crashes, PDF preview failures on iOS Safari, CAPTCHA
 * widget failing behind a tracking blocker, …).
 *
 * No-op when `NEXT_PUBLIC_SENTRY_DSN` is unset (local dev, contributors
 * without a DSN). The DSN gets injected at build time by GitHub Actions
 * (`deploy-staging.yml` / `deploy-prod.yml`) from the `SENTRY_DSN_WEB`
 * repo variable.
 *
 * Privacy posture for the closed beta:
 *   - No session replay (privacy noise + ingest cost — revisit post-beta)
 *   - No `sendDefaultPii` (Sentry won't auto-capture email, IP, cookies)
 *   - We tag the user-id manually elsewhere if/when we need to correlate
 *
 * Cost control: 10% trace sampling. With ~50–100 beta users, that's
 * comfortably inside the Sentry free tier's 5k events/month.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Bake the deploy SHA in so the Sentry UI shows "regressed in v3.2.0"
    // / "first seen in <sha>". Set by GitHub Actions at build time.
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    // Distinguish prod errors from staging noise in the same project.
    // Defaults to 'production' so a missing env var doesn't accidentally
    // pollute the prod inbox with staging traffic — staging deploy sets
    // this explicitly.
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV || 'production',

    // Performance traces — sample 10% to stay under the free-tier event
    // quota. Bump if you actually look at the perf tab.
    tracesSampleRate: 0.1,

    // Session replay disabled for closed beta — too much PII risk
    // (people's resumes, cover-letter drafts) and unnecessary cost.
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,

    // No PII auto-capture. We'll manually `Sentry.setUser({ id })` later
    // (post-login) when we want to correlate without storing emails.
    sendDefaultPii: false,
  });
}
