import { z } from 'zod';

const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  /**
   * Logical deployment stage. Independent of NODE_ENV (which only switches
   * dev/prod build behaviour). Use this to select the correct downstream
   * services (DB, blob, queue, OpenAI, etc.). The value is also used by
   * `ConfigModule` to layer `.env.${APP_ENV}` on top of the shared `.env`.
   */
  APP_ENV: z.enum(['local', 'dev', 'int', 'prod']).default('local'),
  PORT: z.string().default('3000'),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // Direct (non-pooled) database URL — required for Prisma CLI / migrations
  // when DATABASE_URL points at a transaction-mode pooler (e.g. Neon pgbouncer,
  // Supabase Supavisor). Optional for plain Postgres connections.
  DIRECT_URL: z.string().optional(),

  // JWT
  JWT_SECRET: z
    .string()
    .min(64, 'JWT_SECRET must be at least 64 characters for security')
    .refine(
      (val) => !val.includes('change') && !val.includes('REPLACE') && !val.includes('example'),
      'JWT_SECRET cannot contain placeholder text - generate with: openssl rand -base64 64',
    ),
  JWT_REFRESH_SECRET: z
    .string()
    .min(64, 'JWT_REFRESH_SECRET must be at least 64 characters for security')
    .refine(
      (val) => !val.includes('change') && !val.includes('REPLACE') && !val.includes('example'),
      'JWT_REFRESH_SECRET cannot contain placeholder text - generate with: openssl rand -base64 64',
    ),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'), // Short-lived access tokens
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'), // Long-lived refresh tokens
  // Legacy support
  JWT_EXPIRES_IN: z.string().default('15m'),

  // Storage
  STORAGE_DRIVER: z.enum(['disk', 'r2']).default('disk'),

  // Cloudflare R2 (S3-compatible) — used when STORAGE_DRIVER=r2
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().default('smart-apply-prod'),
  // Optional explicit endpoint override; otherwise built from R2_ACCOUNT_ID.
  R2_ENDPOINT: z.string().optional(),

  // Throttler storage backend (in-memory by default; "upstash" for distributed)
  THROTTLER_STORAGE: z.enum(['memory', 'upstash']).default('memory'),

  // Upstash Redis (REST) — used by THROTTLER_STORAGE=upstash and other features
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Jobs / Queue
  JOBS_DRIVER: z.enum(['in-memory', 'qstash']).default('in-memory'),

  // Upstash QStash — used when JOBS_DRIVER=qstash
  // Get values at https://console.upstash.com/qstash
  QSTASH_URL: z.string().optional(),
  QSTASH_TOKEN: z.string().optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().optional(),
  // Public URL the QStash service should POST job webhooks to.
  // Falls back to API_BASE_URL + '/api/v1/jobs/qstash-webhook' when unset.
  QSTASH_WEBHOOK_URL: z.string().optional(),

  // Azure OpenAI
  AZURE_OPENAI_ENDPOINT: z.string().optional(),
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_DEPLOYMENT_NAME: z.string().default('gpt-4o'),
  // v1 Foundry API channel: 'preview' (always-latest, incl. structured outputs)
  // or 'v1' (latest GA). Legacy dated values (e.g. 2025-01-01-preview) are
  // auto-mapped to 'preview' at call time (see llm/providers/azure-v1-url.util.ts).
  AZURE_OPENAI_API_VERSION: z.string().default('preview'),
  // Reasoning effort for GPT-5-family/o-series deployments (ignored for classic
  // models like gpt-4.1). 'minimal' behaves closest to a non-reasoning model —
  // lowest latency/cost for the generation pipeline.
  AZURE_OPENAI_REASONING_EFFORT: z
    .enum(['minimal', 'low', 'medium', 'high'])
    .default('minimal'),
  // 'fake' = deterministic v1-chain-aware offline provider (eval/CI/dev; no
  // network, no cost). Unlike 'mock' it satisfies the callJson steps, so the
  // FULL generation chain runs. See llm/providers/fake-v1.provider.ts.
  LLM_PROVIDER: z
    .enum(['azure-openai', 'azure-ai-foundry', 'mistral', 'mock', 'fake'])
    .default('mock'),

  // Voice Interview (Azure OpenAI Realtime API via WebRTC)
  VOICE_PROVIDER: z.enum(['azure-realtime', 'mock']).default('mock'),
  // Realtime endpoint/key. Fall back to AZURE_OPENAI_* when unset. Realtime
  // models are only available in East US 2 and Sweden Central — use a Sweden
  // Central resource for EU/GDPR data residency.
  AZURE_OPENAI_REALTIME_ENDPOINT: z.string().optional(),
  AZURE_OPENAI_REALTIME_API_KEY: z.string().optional(),
  // Deployment name, not model name — one per environment
  // (gpt-realtime-2.1-mini / -staging / -local).
  AZURE_OPENAI_REALTIME_DEPLOYMENT: z.string().default('gpt-realtime-2.1-mini'),
  AZURE_OPENAI_REALTIME_VOICE: z.string().default('alloy'),
  // Per-session hard ceiling (minutes). Azure caps a realtime session at 60.
  VOICE_INTERVIEW_MAX_SESSION_MINUTES: z.string().default('15'),
  // Emergency GLOBAL clamp on monthly voice minutes; the per-user cap comes
  // from TIER_LIMITS.voiceMinutesPerMonth. -1 = no clamp (tier value applies).
  VOICE_INTERVIEW_MINUTES_PER_MONTH: z.string().default('-1'),

  // LLM Configuration (reuses AZURE_OPENAI_DEPLOYMENT_NAME for model)
  LLM_TEMPERATURE_DEFAULT: z.string().optional(),
  LLM_MAX_TOKENS_DEFAULT: z.string().optional(),
  LOG_LLM_CALLS: z.string().optional(),
  // Optional cheaper model for the mechanical extraction/classification steps
  // (per-task routing). Provider-agnostic value passed straight through as the
  // request `model` (a Mistral model name on La Plateforme, or an Azure
  // deployment name). Unset = every task uses the default model. Gate a switch
  // on the json_schema/German-prose A/B eval — see docs/guides/LLM_MODEL_SELECTION.md.
  LLM_FAST_MODEL: z.string().optional(),
  // Optional provider for LLM_FAST_MODEL when it lives on a DIFFERENT provider
  // than LLM_PROVIDER (e.g. main prose on azure-openai, extraction on Mistral
  // La Plateforme). Unset = fast model runs on the main provider.
  LLM_FAST_PROVIDER: z.enum(['azure-openai', 'mistral']).optional(),

  // Optional Azure deployment for the "mid" lane — cheaper than the flagship
  // but with native strict json_schema support (e.g. gpt-5.4-mini / -staging /
  // -local). Unset = no mid lane; every caller keeps the default model.
  LLM_MID_MODEL: z.string().optional(),
  // Azure resource ROOT hosting LLM_MID_MODEL, e.g.
  // https://foundry-applo-prod.services.ai.azure.com — NOT a project-scoped URL
  // (.../api/projects/<name>), which is the Agents SDK form and 404s on
  // /openai/v1. Unset = the mid model lives in the AZURE_OPENAI_* resource.
  AZURE_OPENAI_MID_ENDPOINT: z.string().optional(),
  AZURE_OPENAI_MID_API_KEY: z.string().optional(),

  // Mistral (used when LLM_PROVIDER=mistral) — La Plateforme or Azure Foundry.
  MISTRAL_ENDPOINT: z.string().default('https://api.mistral.ai/v1'),
  MISTRAL_API_KEY: z.string().optional(),
  MISTRAL_MODEL: z.string().default('mistral-large-latest'),
  // Set ONLY for Azure AI Foundry (Mistral sold by Azure) — La Plateforme
  // rejects the ?api-version= query param, so leave it unset for direct API use.
  MISTRAL_API_VERSION: z.string().optional(),

  // Azure AI Foundry Agents
  AZURE_AI_FOUNDRY_CV_WRITER_ENDPOINT: z.string().optional(),
  AZURE_AI_FOUNDRY_CL_WRITER_ENDPOINT: z.string().optional(),
  AZURE_AI_FOUNDRY_API_KEY: z.string().optional(),

  // Azure AI Foundry Agent IDs
  PROJECT_ENDPOINT: z.string().optional(),
  ATS_AGENT_ID: z.string().optional(),
  CV_WRITER_AGENT_ID: z.string().optional(),
  CL_WRITER_AGENT_ID: z.string().optional(),

  // PDF Generation
  // Renderer is `@react-pdf/renderer` (TSX templates under src/pdf-v2/templates).
  // Previews are produced by pdf-v2/preview-renderer.service.ts via
  // pdfjs-dist + @napi-rs/canvas. No env tuning surface remains.

  // File Upload
  MAX_FILE_SIZE_MB: z.string().default('10'),
  MAX_PROFILE_PHOTO_SIZE_MB: z.string().default('5'),

  // OAuth (Optional)
  AZURE_AD_CLIENT_ID: z.string().optional(),
  AZURE_AD_CLIENT_SECRET: z.string().optional(),
  AZURE_AD_TENANT_ID: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Security
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),
  ENABLE_CSRF: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  CSP_REPORT_ONLY: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),

  // Rate Limiting - Default (general API endpoints)
  // PRODUCTION RECOMMENDATION: set RATE_LIMIT_TTL=900 (15min) and RATE_LIMIT_MAX=300
  // The dev defaults below are intentionally permissive to avoid blocking during local testing.
  RATE_LIMIT_TTL: z.string().default('60'), // 1 minute in seconds (shorter window for development)
  RATE_LIMIT_MAX: z.string().default('5000'), // Very high for development to avoid blocking during testing (lower in production)

  // Rate Limiting - Auth endpoints (stricter)
  // PRODUCTION RECOMMENDATION: keep TTL=900 and set MAX=15
  // NOTE: 5 was too aggressive — legitimate users on Firefox/Safari with
  // strict tracking protection sometimes need to retry the registration
  // form a few times before Cloudflare Turnstile produces a valid token.
  // CAPTCHA failures themselves no longer consume the budget (they're
  // rejected by `CaptchaGuard` before the throttler runs), but typos in
  // password / 2FA / forgot-password flows still do, and 5/15min was
  // tripping real users.
  RATE_LIMIT_AUTH_TTL: z.string().default('900'), // 15 minutes in seconds
  RATE_LIMIT_AUTH_MAX: z.string().default('15'),

  // Compromised-password check (HIBP k-anonymity range API) on registration,
  // password change and password reset. Fail-open on outages; this flag only
  // exists for air-gapped/dev environments. Audit 2026-08-13, F10.
  PWNED_PASSWORD_CHECK_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),

  // Cron Jobs
  ENABLE_CRON_JOBS: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),

  // Compression
  ENABLE_COMPRESSION: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),

  // Pagination
  DEFAULT_PAGE_SIZE: z.string().default('20'),
  MAX_PAGE_SIZE: z.string().default('100'),

  // Caching
  CACHE_TTL_SECONDS: z.string().default('3600'), // 1 hour TTL for static data (templates)

  // Circuit Breaker - LLM Service Protection
  LLM_CIRCUIT_BREAKER_TIMEOUT: z.string().default('60000'), // 60s timeout for LLM calls
  LLM_CIRCUIT_BREAKER_ERROR_THRESHOLD: z.string().default('50'), // Open circuit if 50% fail
  LLM_CIRCUIT_BREAKER_RESET_TIMEOUT: z.string().default('30000'), // Try again after 30s
  LLM_CIRCUIT_BREAKER_ROLLING_COUNT_TIMEOUT: z.string().default('10000'), // 10s window for rolling count
  LLM_CIRCUIT_BREAKER_ROLLING_COUNT_BUCKETS: z.string().default('10'), // 10 buckets for rolling count

  // Global Request Timeout
  REQUEST_TIMEOUT_MS: z.string().default('30000'), // 30s global timeout for all requests

  // Two-Factor Authentication
  TWO_FACTOR_ENCRYPTION_KEY: z
    .string()
    .length(64, 'TWO_FACTOR_ENCRYPTION_KEY must be 64 hex characters (32 bytes) for AES-256')
    .regex(/^[a-fA-F0-9]+$/, 'TWO_FACTOR_ENCRYPTION_KEY must be a valid hex string')
    .optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@example.com'),
  APP_URL: z.string().default('http://localhost:3001'), // Frontend URL for email links

  // Inbox the public contact form forwards to. Defaults to EMAIL_FROM
  // when not explicitly set so misconfiguration never silently drops
  // user messages.
  SUPPORT_EMAIL: z.string().optional(),

  // Cloudflare Turnstile (invisible CAPTCHA) — protects /auth/register
  // against bot signups that would drain the LLM budget.
  // Get keys from https://dash.cloudflare.com/?to=/:account/turnstile
  // When TURNSTILE_SECRET_KEY is unset, the backend skips verification
  // and just logs a warning — useful for local dev without keys.
  TURNSTILE_SECRET_KEY: z.string().optional(),

  // Public base URL of the API (used for OAuth callback URLs in production)
  // In dev, defaults to http://localhost:${PORT}; in prod, set to https://api.<your-domain>
  API_BASE_URL: z.string().optional(),

  // Parent domain shared by frontend (applo.ai) and API
  // (api.applo.ai). When set, auth cookies are issued with
  // `Domain=<value>` so they're treated as first-party for all subdomains
  // — fixes Chrome's tracking-protection silently dropping cross-subdomain
  // cookies. Leave UNSET locally (cookies stay host-only on localhost).
  // Example for prod: COOKIE_DOMAIN=.applo.ai
  COOKIE_DOMAIN: z.string().optional(),

  // Sentry error tracking (optional — if unset, Sentry stays disabled)
  SENTRY_DSN: z.string().optional(),
  SENTRY_RELEASE: z.string().optional(), // commit SHA from CI for source-map matching

  // Admin allow-list (comma-separated emails). Users whose `email` matches
  // one of these (case-insensitive) can call the /admin/* endpoints. When
  // unset, all /admin/* routes return 403.
  ADMIN_EMAILS: z.string().optional(),

  // -------------------------------------------------------------------------
  // Anonymous LLM usage tracking (issue #522)
  // -------------------------------------------------------------------------
  // Salt for the irreversible per-actor hash in `llm_usage_events`.
  // Generate with: openssl rand -hex 32
  // UNSET = usage tracking is OFF (no rows are written at all).
  // Changing it re-anonymises every future row — old and new rows will no
  // longer correlate to the same actor. Treat as append-only in practice.
  LLM_USAGE_HASH_SALT: z.string().min(32).optional(),

  // Retention (days) for `llm_usage_events`. A daily cron hard-deletes rows
  // older than this. The table is pseudonymous personal data under GDPR (see
  // prisma/schema.prisma), so it must not grow unbounded; 0 disables the
  // sweep (not recommended). Audit 2026-08-13, F11.
  LLM_USAGE_RETENTION_DAYS: z.string().default('90'),

  // Retention (days) for uploaded originals that never became a JobPosting.
  // `POST /uploads` stores the raw file under `<userId>/` and nothing records
  // that key until it is parsed, so an abandoned upload used to live forever
  // (Art. 5(1)(e) DSGVO). A daily cron deletes unreferenced objects older
  // than this; 0 disables the sweep.
  UPLOAD_RETENTION_DAYS: z.string().default('7'),

  // Retention (days) for `application_email_events`. The rows hold sender,
  // sender name and subject of mail in the user's private inbox; they explain
  // an automatic status change and dedupe Graph replays, and neither purpose
  // outlives the notification window (Art. 5(1)(e) DSGVO). 0 disables the
  // sweep (not recommended).
  MAILBOX_EVENT_RETENTION_DAYS: z.string().default('180'),

  // -------------------------------------------------------------------------
  // Email Tracking (Premium feature) — OAuth Inbox Sync
  // -------------------------------------------------------------------------
  // Encrypts the OAuth refresh tokens we persist in `mailbox_connections`.
  // Same format as TWO_FACTOR_ENCRYPTION_KEY (32 bytes, hex). Generate with:
  //   openssl rand -hex 32
  // When unset, the mailbox-sync module refuses to connect new mailboxes.
  MAILBOX_TOKEN_ENCRYPTION_KEY: z
    .string()
    .length(64, 'MAILBOX_TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes) for AES-256')
    .regex(/^[a-fA-F0-9]+$/, 'MAILBOX_TOKEN_ENCRYPTION_KEY must be a valid hex string')
    .optional(),

  // Microsoft 365 / Outlook OAuth app for the inbox sync.
  // Reuses the AZURE_AD_TENANT_ID from social-login above. We use a separate
  // client ID/secret because this app needs `Mail.Read offline_access`,
  // which is a different consent surface from the sign-in flow.
  MS_GRAPH_CLIENT_ID: z.string().optional(),
  MS_GRAPH_CLIENT_SECRET: z.string().optional(),
  // Tenant for the OAuth flow. Default `common` allows both work and personal
  // accounts (Outlook.com + Microsoft 365). Override to a specific tenant id
  // for single-tenant deployments.
  MS_GRAPH_TENANT: z.string().default('common'),

  // Public URL the inbox sync redirects to after a successful OAuth
  // round-trip. Defaults to APP_URL + '/settings?email_tracking=connected'.
  MS_GRAPH_POST_CONNECT_REDIRECT: z.string().optional(),

  // Lifetime of a Microsoft Graph mail-folder push subscription is capped
  // at 4230 minutes (~70.5 h). We renew on a daily cron with a comfortable
  // safety margin. Override only for testing.
  MAILBOX_SUBSCRIPTION_RENEWAL_MARGIN_MINUTES: z.string().default('360'), // 6h

  // -------------------------------------------------------------------------
  // Payments (Stripe)
  // -------------------------------------------------------------------------
  // Master switch. The module always loads (so /payments/config can answer
  // "billing is off"), but every money-moving endpoint 503s unless this is
  // true AND the secrets below are present. Keeping it separate from
  // "are the keys set" means a half-configured deploy fails closed rather
  // than charging someone with the wrong price id.
  PAYMENTS_ENABLED: z.enum(['true', 'false']).default('false'),

  // Restricted or standard secret key. `sk_test_…` in dev/staging,
  // `sk_live_…` only in prod. Never ships to the frontend.
  STRIPE_SECRET_KEY: z.string().optional(),

  // Signing secret for POST /payments/webhook (`whsec_…`). Each endpoint in
  // the Stripe dashboard has its own; `stripe listen` prints a different one
  // for local forwarding.
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Price ids (price_…, NOT product ids) for the recurring tiers. These are
  // the single source of truth for what a customer is charged — TIER_LIMITS
  // only describes what they get. A mismatch between the two is a silent
  // billing bug, so `PaymentsService` refuses to start a checkout for a tier
  // whose price id is unset rather than falling back to anything.
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_PREMIUM: z.string().optional(),

  // One-off price ids for the persistent add-on credit packs. Keys mirror
  // ADDON_PACKAGES in subscription.service.ts.
  STRIPE_PRICE_ADDON_SMALL: z.string().optional(),
  STRIPE_PRICE_ADDON_MEDIUM: z.string().optional(),
  STRIPE_PRICE_ADDON_LARGE: z.string().optional(),

  // Kleinunternehmerregelung (§ 19 UStG). Defaults to TRUE because that is the
  // safe side of this fork: a small business that wrongly displays "inkl. 19 %
  // MwSt." is claiming to collect a tax it never remits, which is a far worse
  // failure than a VAT-registered seller temporarily under-advertising.
  //
  // When true we must NOT show or charge VAT anywhere: Stripe Tax stays off,
  // no USt-IdNr is collected (reverse charge is meaningless without VAT), and
  // every invoice carries the § 19 UStG notice instead of a tax line.
  // Flip to false only once the Finanzamt has you on Regelbesteuerung AND
  // Stripe Dashboard → Tax → Locations shows Germany as "Collecting".
  PAYMENTS_SMALL_BUSINESS: z.enum(['true', 'false']).default('true'),
}).superRefine((env, ctx) => {
  // Payments completeness — checked in EVERY environment, deliberately above
  // the production-only early return below. A half-configured billing setup
  // is dangerous locally too: without the price ids a checkout silently has
  // nothing to charge for, and without the webhook secret we accept payment
  // and never grant the tier.
  if (env.PAYMENTS_ENABLED === 'true') {
    const required = [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'STRIPE_PRICE_PRO',
      'STRIPE_PRICE_PREMIUM',
      'STRIPE_PRICE_ADDON_SMALL',
      'STRIPE_PRICE_ADDON_MEDIUM',
      'STRIPE_PRICE_ADDON_LARGE',
    ] as const;

    for (const key of required) {
      if (!env[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when PAYMENTS_ENABLED=true. Set PAYMENTS_ENABLED=false to run without billing.`,
        });
      }
    }
  }

  // Prod hardening: the `disk` and `in-memory` drivers exist for local dev
  // only — they silently lose data when the Fly machine restarts. Refuse
  // to boot if a production build is configured to use them. Override
  // (e.g. for a one-off forensic image) by setting NODE_ENV=development.
  if (env.NODE_ENV !== 'production') return;

  // A test-mode key in prod takes real checkout attempts and silently never
  // charges anyone; a live key outside prod charges real cards from staging.
  // Both are quiet failures, so make them loud at boot.
  if (env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['STRIPE_SECRET_KEY'],
      message:
        'STRIPE_SECRET_KEY is a TEST key (sk_test_…) but NODE_ENV=production. Test keys never move real money — checkouts would appear to succeed and never pay out.',
    });
  }

  if (env.STORAGE_DRIVER !== 'r2') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['STORAGE_DRIVER'],
      message: `STORAGE_DRIVER must be 'r2' when NODE_ENV=production (got '${env.STORAGE_DRIVER}'). The 'disk' driver writes to ephemeral Fly volumes and loses files on redeploy.`,
    });
  }

  if (env.JOBS_DRIVER !== 'qstash') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JOBS_DRIVER'],
      message: `JOBS_DRIVER must be 'qstash' when NODE_ENV=production (got '${env.JOBS_DRIVER}'). The 'in-memory' driver drops queued jobs on machine restart.`,
    });
  }

  if (!env.TURNSTILE_SECRET_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['TURNSTILE_SECRET_KEY'],
      message:
        "TURNSTILE_SECRET_KEY is required when NODE_ENV=production to prevent bot signup abuse.",
    });
  }

  if (!env.ENABLE_CSRF) {
    // Downgraded from a hard schema error to a runtime warning on
    // 2026-05-28 during the prod register-403 incident
    // (docs/incidents/2026-05-27-register-403.md): a hard refusal to
    // boot meant we couldn't use `flyctl secrets set ENABLE_CSRF=false`
    // as the documented emergency unblock — the new machine crash-looped
    // in release. The guardrail's intent is "don't accidentally ship
    // prod without CSRF", not "make incident response impossible". A
    // loud warning at boot + the existing log line from main.ts
    // ("⚠️  CSRF protection disabled") still surfaces the risk; an
    // operator who runs `flyctl secrets set ENABLE_CSRF=false` has
    // already made an intentional, audit-logged decision.
     
    console.warn(
      '⚠️  ENABLE_CSRF is not "true" in production — CSRF middleware will be DISABLED. ' +
        'This should only happen during an authorised incident response. ' +
        'Re-enable as soon as the incident is resolved.',
    );
  }
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  // Debug logging only in development (before Pino is available)
  if (process.env.NODE_ENV === 'development') {
    console.log('[EnvSchema] Validating environment config:', {
      configKeys: config ? Object.keys(config).length : 0,
      hasDatabase: !!config?.DATABASE_URL,
      hasJwtSecret: !!config?.JWT_SECRET,
      hasJwtRefreshSecret: !!config?.JWT_REFRESH_SECRET,
    });
  }

  try {
    return envSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        ? error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n')
        : 'Unknown validation error';
      throw new Error(`❌ Environment validation failed:\n${missingVars}`);
    }
    // Errors should always be logged regardless of environment

    console.error('[EnvSchema] Environment validation error (not ZodError):', error);
    throw error;
  }
}
