# Applo — System Architecture

## 🏗️ High-Level Architecture

```text
                                  ┌─────────────────────────────┐
         Browser  ───────────────▶│   Cloudflare Edge / DNS     │
                                  │   (WAF · CDN · Proxy 🟧)    │
                                  └─────┬──────────────┬────────┘
                                        │              │
                  applo.ai        │              │  api.applo.ai
                  www.applo.ai    │              │
                                        ▼              ▼
┌──────────────────────────────────────────────┐  ┌─────────────────────────────────┐
│        Next.js 16 Frontend (Worker)          │  │     NestJS 11 API (Fly.io)      │
│  React 19 · Tailwind v4 · shadcn/ui          │  │  Region: fra · auto-scale 1..N  │
│  Cloudflare Workers (OpenNext)               │  │  Let's Encrypt cert via Fly     │
│  Runtime API URL via /api/config             │  │                                 │
└──────────────────────┬───────────────────────┘  │  ┌──────┬───────┬──────┬─────┐  │
                       │ HTTPS · HttpOnly cookies │  │ Auth │Profile│ Jobs │ LLM │  │
                       │   (CSRF Double-Submit)   │  └──────┴───────┴──────┴─────┘  │
                       └─────────────────────────▶│  ┌──────┬───────┬──────┬─────┐  │
                                                  │  │ PDF  │Resume │Inter │Email│  │
                                                  │  │ pool │parser │views │     │  │
                                                  │  └──────┴───────┴──────┴─────┘  │
                                                  └────┬────┬────┬────┬────┬───┬───┘
                                                       │    │    │    │    │   │
                                                       ▼    ▼    ▼    ▼    ▼   ▼
                                            ┌─────────┐ ┌────────┐ ┌─────────┐ ┌────────┐ ┌──────┐ ┌────────┐
                                            │  Neon   │ │  CF R2 │ │ Upstash │ │ Azure  │ │Sentry│ │Resend  │
                                            │Postgres │ │ (EU)   │ │ QStash /│ │   AI   │ │      │ │ (mail) │
                                            │ EU/Frkft│ │        │ │  Redis  │ │Foundry │ │(APM) │ │        │
                                            │ pooled+ │ │        │ │         │ │+OpenAI │ │      │ │        │
                                            │ direct  │ │        │ │         │ │        │ │      │ │        │
                                            └─────────┘ └────────┘ └─────────┘ └────────┘ └──────┘ └────────┘
```

> **Pluggable providers:** Storage (Cloudflare R2 / disk), Queue (QStash / in-memory),
> LLM (Azure OpenAI / Azure AI Foundry / Mistral / mock / fake), and Cache (Upstash Redis / node-cache) are all selected via env.
> **Three routing lanes**, each with its own circuit breaker and its own fallback to the main lane (precedence: explicit `model` → mid → fast → main):
> - **main** (`LLM_PROVIDER` + `AZURE_OPENAI_*`, `gpt-4.1`) — candidate-facing writing, and always the floor. A side-lane failure re-dispatches here *without* the model override.
> - **fast** (`LLM_FAST_MODEL` + optional `LLM_FAST_PROVIDER`) — per-**task** routing that sends the mechanical extraction steps (`ats-keywords`, `job-facts`, `skill-selector`, `interview-*`) to a cheaper model, optionally on a different provider (second instance + own breaker). The 2026-08-02 A/B eval rejected Mistral Small/Large for prose (fabricated metrics, half-length letters) while clearing them for extraction ([details](docs/guides/LLM_MODEL_SELECTION.md)).
> - **mid** (`LLM_MID_MODEL` + optional `AZURE_OPENAI_MID_ENDPOINT`/`_API_KEY`, today `gpt-5.4-mini` in a second Azure Foundry resource) — opt-in **per call** via `{ midLane: true }` rather than by template list, because it is tier-dependent rather than task-dependent. Today: Free-tier Bewerbungs-Checks, which need native strict `json_schema` support.
>
> Each lane is a no-op when its model env var is unset, and a misconfigured side lane degrades to the main provider instead of crashing boot.
> `LLM_PROVIDER=fake` selects a deterministic, chain-aware offline provider (no network, no cost) and **forces the fast and mid lanes off** — otherwise an "offline" run keeps billing real side-lane calls and stops being reproducible.

### Headless generation seam (#797)

`apps/api/src/applications/headless/generate.ts` is the v1 chain as a pure
function — plain objects in, plain objects out, no persistence, auth, storage or
metering. The eval platform ([`applo-eval`](https://github.com/Smart-Apply/applo-eval))
drives it through a single process seam, `pnpm generate:headless` (JSON on
stdin, one JSON document on stdout; `--score` embeds the product's own
deterministic validators so the scorer version always equals the generator
version). No product TypeScript is imported across the repo boundary.

Both generation entrypoints — `GenerationService.createWithGeneration` (the
wizard) and `generateWithSinglePipeline` (regenerate) — run this exact function
and add only what they own: persistence, SSE progress, metering and the
deterministic grounding/style reports. There is no second copy of the chain. An
offline harness holds that line: `LLM_PROVIDER=fake pnpm --filter @applo/api run
chain:equivalence -- --path create|single` records every LLM call the service
and the seam make and fails on any difference in template, rendered variables or
generation params.

### Production hostnames

| Hostname                | Origin                                                     | Notes                                             |
| ----------------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| `applo.ai` (apex) | Cloudflare Worker `smart-apply-web` (Custom Domain)        | Universal Edge Cert (Cloudflare)                  |
| `www.applo.ai`    | Cloudflare Worker `smart-apply-web` (Custom Domain)        | Same Worker; redirect rule TBD for canonical host |
| `api.applo.ai`    | CNAME → `93ke51y.smart-apply-api.fly.dev` (Proxied 🟧)     | Let's Encrypt cert issued by Fly via DNS-01       |
| `_acme-challenge.api.…` | CNAME → `api.applo.ai.93ke51y.flydns.net` (DNS-only) | Required for Fly cert renewal behind CF proxy     |
| `_fly-ownership.api.…`  | TXT `app-93ke51y`                                          | Required when traffic is proxied via Cloudflare   |

## 📦 Monorepo Structure (pnpm Workspaces + Turborepo)

```text
applo/
├── package.json              # Workspace root
├── turbo.json                # Turborepo pipeline
├── apps/
│   ├── api/                  # @applo/api (NestJS 11)
│   │   ├── src/
│   │   │   ├── admin/             # Allow-listed admin endpoints (ADMIN_EMAILS)
│   │   │   ├── agents/            # Azure AI Foundry agents
│   │   │   ├── applications/      # Generation pipeline
│   │   │   ├── appointments/      # Interview-calendar CRUD (date/time, note)
│   │   │   ├── auth/              # JWT, OAuth, 2FA, sessions, refresh tokens
│   │   │   ├── common/            # Guards, filters, decorators (@Sanitize)
│   │   │   ├── config/            # Zod env schema
│   │   │   ├── contact/           # Contact form
│   │   │   ├── email/             # Resend transactional email
│   │   │   ├── health/            # Terminus health checks
│   │   │   ├── interviews/        # AI mock interviews (text + voice/WebRTC)
│   │   │   ├── job-postings/      # Text/URL/file parsers
│   │   │   ├── jobs/              # Queue providers (QStash / mem)
│   │   │   ├── keywords/          # ATS keyword extraction & matching
│   │   │   ├── llm/               # LLM provider abstraction
│   │   │   ├── logger/            # Pino + Winston audit
│   │   │   ├── mailbox-sync/      # Email Tracking (Premium): MS Graph OAuth + classifier
│   │   │   ├── pdf/               # Thin façade over pdf-v2 (kept for caller API stability)
│   │   │   ├── pdf-v2/            # @react-pdf/renderer (TSX templates) + PNG previews
│   │   │   ├── prisma/            # PrismaService (pg adapter)
│   │   │   ├── profile/           # Profile CRUD (differential updates)
│   │   │   ├── resume-parser/     # PDF/DOCX → Profile bootstrap
│   │   │   ├── storage/           # Cloudflare R2 / disk providers
│   │   │   ├── subscription/      # Plans & usage limits
│   │   │   ├── templates/         # Template catalog
│   │   │   ├── uploads/           # Upload endpoints
│   │   │   ├── user-preferences/  # Per-user settings (incl. onboarding-tour flag)
│   │   │   └── validation/        # Bewerbungs-Check (review external applications)
│   │   ├── prisma/                # Schema, migrations, seeds
│   │   └── test/                  # Unit / integration / e2e
│   │
│   └── web/                  # @applo/web (Next.js 16)
│       ├── messages/              # next-intl catalogs (de/en/fr/es/pt/it, one JSON per namespace)
│       ├── src/
│       │   ├── app/               # App Router (route groups)
│       │   ├── components/        # UI + shadcn/ui + landing (server sections) + pdf + analytics (recharts) + i18n + onboarding tour
│       │   ├── hooks/             # Custom React hooks
│       │   ├── i18n/              # next-intl config (cookie-based de/en/fr/es/pt/it, no URL prefixes)
│       │   ├── lib/               # api-client, providers, i18n-runtime, utils
│       │   ├── stores/            # Zustand
│       │   └── types/             # Shared TS types
│       └── public/                # Static assets
│
├── packages/shared/          # Shared types/utils (+ AI prompt guardrail config)
├── docs/                     # Feature, guide, security, implementation docs
├── infra/                    # Dockerfiles, docker-compose, nginx
└── scripts/                  # Deploy & maintenance
```

## 🔄 Application Generation Pipeline

```text
User → Frontend (Next.js)
        │
        │ POST /api/v1/applications
        ▼
┌──────────────────────────────────────┐
│ GenerationService                    │
│ (applications module — owns the      │
│  create paths + LLM pass pipeline;   │
│  CRUD/export/keywords stay in        │
│  ApplicationsService)                │
│ 1. Validate job posting              │
│ 2. Enforce subscription limits       │
│ 3. Create record (PENDING)           │
│ 4. Publish to queue                  │
└──────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────┐
│ Queue (QStash / in-memory)           │
└──────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────┐
│ Job Processor                        │
│ 1. Status → GENERATING (SSE push)    │
│ 2. Load Profile + JobPosting         │
│ 3. Detect language (DE/EN)           │
│ 4. Select template (lang × design)   │
│ 5. Extract ATS keywords              │
└──────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────┐
│ LLM Service                          │
│ Provider: Azure OpenAI / Mistral /   │
│           Azure AI Foundry / mock    │
│ Circuit-breaker + retries (opossum)  │
│ Structured outputs: json_schema /    │
│   json_object (schema-valid JSON)     │
│ 0. Job facts: contact + company       │
│    specifics + salary/start asks (#5)  │
│ 1. Generate cover letter             │
│ 2. Generate resume                   │
│ 3. Editor pass: critique + revise    │
│    the cover letter AND resume        │
│ 4. Keyword weave: add missing        │
│    profile-supported ATS keywords    │
│ 5. Style rewrite: fix flagged AI     │
│    clichés/hedging (guarded, teeth)  │
│ 6. Length governor: shorten pass     │
│    when over word budget (guarded)   │
│ 7. Grounding repair: guarded local   │
│    fixes for unsupported figures in  │
│    the cover letter AND résumé       │
│ 8. Grounding + style/length checks:  │
│    flag any residual unsupported #s, │
│    clichés, hedging, word-budget     │
│    overruns; log-only                │
└──────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────┐
│ PDF Service (@react-pdf/renderer)    │
│ 1. Resolve template via              │
│    pdf-v2/template-registry.ts       │
│ 2. Apply per-application design      │
│    settings (font scale, density,    │
│    accent override, bundled OFL      │
│    font families) via                │
│    pdf-v2/design-tokens.ts           │
│ 3. Render TSX → PDF buffer           │
│ 4. Page-count backstop: warn when a  │
│    cover letter renders > 1 page     │
│ Throws if no react-pdf factory is    │
│ registered for the template (no      │
│ fallback path — puppeteer removed    │
│ in v1.16).                           │
└───────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────┐
│ Storage (Cloudflare R2 / disk)       │
│ 1. Upload PDFs                       │
│ 2. Generate pre-signed URLs          │
│ 3. Persist keys in Application       │
│ 4. Status → READY (SSE push)         │
└──────────────────────────────────────┘
```

> **Edit-mode regenerate (single cover-letter path).** The editor's "regenerate
> cover letter" action (`upsertCoverLetter`) reuses the same `v1/cover-letter.md`
> prompt as the create pipeline: the saved editor resume is mapped back into the
> skill-selector `TailoredProfileDto` shape by `stored-resume.util.ts`, then runs
> through job-facts extraction + the deterministic salutation. The legacy `*-ats.md`
> prompts and their `generate*ATS` methods were retired (#2), so there is one
> cover-letter generation path.

> **Cross-language export (translation-on-export).** `POST /applications/:id/export`
> accepts `language: 'de' | 'en' | 'fr' | 'es' | 'pt' | 'it'` — generation itself
> stays de/en (job-posting driven), the other four are export-time translation
> targets. When the target differs from the content's source language
> (`Application.sourceLanguage`, LLM-detected on legacy rows), the export job
> translates the stored content instead of shipping a mixed-language PDF:
> the résumé's display strings are extracted as flat `{ id, text }` segments
> (`applications/translation/translation-segments.util.ts`), translated in one
> strict-`json_schema` call (`v1/translate-resume.md`) and merged back
> deterministically — ids, dates, URLs and contact data never pass through the
> LLM; the cover letter goes through `v1/translate-cover-letter.md` (HTML→HTML).
> Both passes are guarded (segment-complete check / not-gutted + structure
> checks) with all-or-nothing acceptance; on failure the PDFs render fully in
> the **source** language (labels included) and the API surfaces
> `exportWarning: 'TRANSLATION_FALLBACK'`. Successful translations are cached
> per language in `Application.translations` (Json), invalidated by an xxhash
> of the source content (`utils/translation.util.ts`). Date labels are never
> LLM-translated: `resume-date-localizer.util.ts` re-derives `dateRange`/`year`/
> `date` from raw ISO dates stored in the résumé JSON (token-mapping month names
> on legacy rows), which also fixes natively-English exports that used to ship
> German date strings ("Okt. 2023 – Heute").

> **Section order (edit mode).** The résumé JSON (`ResumeTemplateData` /
> shared `ResumeData`) carries an optional `sectionOrder?: string[]`
> (keys: `profile`, `experience`, `education`, `projects`, `skills`,
> `languages`, `certs`). The edit-mode editor writes it when the user
> reorders sections; all three react-pdf resume templates emit their
> section blocks in that order (`pdf-v2/template-data.ts`
> `resolveSectionOrder` — unknown keys dropped, omitted sections appended
> in the template default order; `elegant-sidebar` applies the flat list
> within each of its two columns). Absent — i.e. every pre-existing
> record — templates keep their hardcoded default order.

### Output-quality measurement (offline eval harness)

Generation quality is the product's main driver, so it is measured rather than
assumed. `apps/api/scripts/eval/` runs the **real v1 prompt chain** over ~24
profession-diverse German + English golden fixtures, scores each output with an
**LLM-as-judge** rubric (action-verb bullets, quantified achievements, targeted
summary, cover-letter personalization, no clichés/Konjunktiv, language
correctness) and the deterministic **grounding validator**, and writes a
timestamped report. Unsupported claims are pooled across fixtures and reported
with a descriptive Wilson 95% interval over distinct checked values; runs with
no checked values report `n/a`, and fixture pass-rate remains a secondary
historical metric. `--repeat=N` pools stochastic repeats while retaining their
spread. `pnpm --filter @applo/api eval:compare path/to/a.json path/to/b.json`
matches generated observations and clusters repeats by fixture for inference
(exact McNemar for all-repeats-clean grounding plus paired continuous intervals
over per-fixture means). Run `pnpm --filter @applo/api eval:llm` to capture a baseline before
a prompt change and re-run after to prove the lift. The roadmap + recorded
baselines live in [docs/implementation/LLM_OUTPUT_QUALITY.md](docs/implementation/LLM_OUTPUT_QUALITY.md);
grounding-specific decisions live in
[docs/implementation/GROUNDING_HARDENING.md](docs/implementation/GROUNDING_HARDENING.md).

## 🗄️ Database Schema (Prisma 6)

### Core Models

| Model              | Description                                    |
| ------------------ | ---------------------------------------------- |
| **User**           | Auth, OAuth identities, 2FA secrets            |
| **Profile**        | Personal info, contact, summary, Bewerbungsfoto (storage key) |
| **Skill**          | Skills with level & user-defined category (categories group the skills section of the generated CV; uncategorized skills render last without a header — the legacy `'General'` default counts as uncategorized) |
| **Experience**     | Work history                                   |
| **Education**      | Education history                              |
| **Certificate**    | Certifications                                 |
| **Project**        | Portfolio projects                             |
| **Language**       | Language proficiency                           |
| **JobPosting**     | Parsed job listings                            |
| **Application**    | Generated applications + PDFs (+ per-language translation cache in `translations` Json) |
| **Validation**     | Standalone AI check of an external application (+ `contentHash` dedupe cache — an exact re-submit replays the stored result with no LLM call and no quota spend) |
| **Appointment**    | Dashboard interview-calendar entry (date + optional time, note, email-reminder flag) |
| **ResumeTemplate** | PDF templates (6 designs × colors × 2 types)   |
| **Interview**      | AI-generated interview Q&A                     |
| **RefreshToken**   | Rotated refresh tokens                         |
| **Session**        | Device/IP/UA tracking                          |
| **UserPreferences**| Per-user settings — notifications, language, theme, privacy, and `onboardingCompleted` (guides the first-login product tour; set once the user finishes or skips it) |
| **InviteCode**     | RETIRED — beta gate removed; schema row kept until a follow-up release drops it (expand→contract) |
| **Subscription**   | Plan, usage counters & persistent add-on credits (`addonCreditsRemaining`) |
| **AuditLog**       | Security event log                             |
| **LlmUsageEvent**  | Per-feature LLM token-usage event — NO `User` FK, keyed by an HMAC-SHA256 `actorHash`; no prompt/response content ever stored. **Pseudonymous, not anonymous**: a row burst is time-correlatable to the `Application`/`Validation`/`InterviewSession` that triggered it, so GDPR erasure applies — both account-deletion paths erase by recomputed hash, and a daily cron deletes rows older than `LLM_USAGE_RETENTION_DAYS` (default 90) |

### Key Relations

```text
User 1:1 Profile
Profile 1:N Skills, Experiences, Education, Certificates, Projects, Languages
User 1:N JobPostings, Applications, RefreshTokens, Sessions, Interviews, Appointments
Application N:1 JobPosting
Application N:1 ResumeTemplate
User 1:1 Subscription
```

## 🔐 Security Architecture

### Authentication Flow

```text
1. Login (email/password OR OAuth: Google / Microsoft / Azure AD)
   → Optional 2FA challenge (TOTP via speakeasy)
   → Access token (HttpOnly cookie, ~15 min)
   → Refresh token (HttpOnly cookie, 7 days, rotated)
2. Access token expires → silent refresh via /auth/refresh
3. Refresh token rotation on every use; reuse triggers session revoke
4. Max 5 concurrent sessions/user (oldest evicted)
5. Remote logout per session (cron cleanup of expired)
```

### Security Layers

| Layer             | Implementation                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| **Transport**     | HTTPS, HSTS                                                                                                   |
| **Headers**       | Helmet, CSP, X-Frame-Options, X-Content-Type-Opts                                                             |
| **Auth**          | JWT (HttpOnly cookies) + refresh rotation + 2FA                                                               |
| **OAuth**         | Google, Microsoft, Azure AD (passport) — email-match auto-linking & signup only for provider-verified emails (nOAuth guard: Google `email_verified`, Microsoft MSA tenant or `xms_edov`) |
| **Rate Limit**    | 5/15min auth · 100/15min standard (`@nestjs/throttler`) — tracker = verified JWT subject, else proxy-derived `req.ip`; `CF-Connecting-IP`/`X-Forwarded-For` are never read (forgeable). Only `/health/live` + `/health/ready` are exempt |
| **Input**         | class-validator DTOs, `@Sanitize()` + DOMPurify                                                               |
| **SSRF**          | URL parsing: public-address allow-list (`url-safety.util`), DNS pinning on the axios path, loopback egress proxy at connect time for the Playwright path (`ssrf-egress-proxy`), WebSockets refused (`routeWebSocket`) |
| **AI Guardrails** | per-surface char + token limits on AI prompt inputs (`@applo/shared` + `gpt-tokenizer` model `gpt-4.1`) |
| **CSRF**          | csrf-csrf (Double Submit Cookie, optional)                                                                    |
| **Passwords**     | argon2id, strength regex, HIBP Pwned-Passwords check (k-anonymity, fail-open, `PWNED_PASSWORD_CHECK_ENABLED`) |
| **Audit**         | Winston daily-rotated logs (90-day retention)                                                                 |
| **Monitoring**    | Sentry (errors + performance)                                                                                 |

## 🔧 Technology Stack

### Backend (NestJS 11)

| Category      | Technology                                                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Runtime       | Node.js 24 (>= 20.19)                                                                                                               |
| Framework     | NestJS 11                                                                                                                           |
| Database      | Neon Postgres (serverless, EU/Frankfurt; pooled + direct URLs)                                                                      |
| ORM           | Prisma 6.19 (`@prisma/adapter-pg` + connection pool)                                                                                |
| Auth          | passport-jwt · passport-google · passport-microsoft · passport-azure-ad · argon2 · speakeasy (2FA)                                     |
| Queue         | Upstash QStash · in-memory                                                                                                          |
| Cache         | Upstash Redis · node-cache                                                                                                          |
| Storage       | Cloudflare R2 (S3-compatible) · local disk                                                                                          |
| LLM           | Azure AI Foundry · Azure OpenAI · Mistral · mock                                                                                    |
| PDF           | `@react-pdf/renderer` 4.5 (TSX templates, bundled OFL fonts: Lato · Source Sans 3 · Merriweather) · `pdfjs-dist` + `@napi-rs/canvas` (PNG previews) · `pdf-parse` · `mammoth` (DOCX intake) |
| Email         | Resend                                                                                                                              |
| Logging       | Pino (req logs) + Winston (audit, daily rotation)                                                                                   |
| Monitoring    | Sentry (`@sentry/node` + profiling). Frontend uses `@sentry/nextjs`, client-side only — see the web Tech Stack                        |
| Validation    | class-validator · Zod · sanitize-html                                                                                               |
| AI guardrails | `@applo/shared` (limits) · `gpt-tokenizer` (model `gpt-4.1`)                                                                  |
| Resilience    | opossum (circuit breaker)                                                                                                           |
| Scheduling    | `@nestjs/schedule` (cron jobs)                                                                                                      |
| Health        | `@nestjs/terminus`                                                                                                                  |

### Frontend (Next.js 16)

| Category   | Technology                                              |
| ---------- | ------------------------------------------------------- |
| Framework  | Next.js 16.1 (App Router, React Compiler enabled)       |
| Rendering  | Server Components by default; the public landing page (`/`) is fully server-rendered (localized metadata, OG/Twitter, JSON-LD, no-JS readable) with only the mascot + scroll-reveal drivers as client components |
| Language   | TypeScript (strict)                                     |
| i18n       | next-intl 4 (cookie-based de/en/fr/es/pt/it, no URL routing) |
| UI         | React 19.2 · shadcn/ui (Radix) · Tailwind v4            |
| State      | Zustand 5 · TanStack Query 5                            |
| Forms      | react-hook-form 7 · Zod (`@hookform/resolvers`)         |
| PDF Viewer | react-pdf · pdfjs-dist (pinned to react-pdf's exact version — worker/API lockstep, enforced by `check:pdfjs`) |
| Charts     | recharts (Analytics activity chart)                     |
| Editor     | Tiptap 3 (StarterKit + TextStyle)                       |
| Toast      | Sonner                                                  |
| Files      | react-dropzone · jszip                                  |
| Sanitize   | isomorphic-dompurify                                    |
| Markdown   | marked · turndown                                       |
| Bundle     | Cloudflare Workers (OpenNext) · `@next/bundle-analyzer` |

### Infrastructure

| Category   | Technology                                                                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Container  | Docker (multi-stage, `infra/Dockerfile`)                                                                                                                              |
| API host   | **Fly.io** (`smart-apply-api`, region `fra`, shared-cpu-1x / 1 GB)                                                                                                    |
| Web host   | Cloudflare Workers via `@opennextjs/cloudflare` (`smart-apply-web`)                                                                                                   |
| CI/CD      | GitHub Actions — `ci.yml` (PR checks) + `deploy-staging.yml` (auto on `main`) + `deploy-prod.yml` (gated on `v*.*.*` tag) + `release-please.yml` (SemVer + CHANGELOG). API image is **built once on the runner** (`type=gha` cache) → `registry.fly.io` → promoted to both envs via `flyctl deploy --image` |
| Secrets    | Fly Secrets (API) · Cloudflare Worker vars/secrets (Web) · `.env` (dev)                                                                                               |
| Database   | Neon Postgres (serverless, EU/Frankfurt; `DATABASE_URL` pooled, `DIRECT_URL` for migrations)                                                                          |
| DNS/CDN    | Cloudflare (proxied for all hostnames; ACME challenge DNS-only)                                                                                                       |
| Migrations | `prisma migrate deploy` runs as a Fly **release command** before machines start serving traffic, followed by the idempotent react-pdf template-catalog seed (`prisma/seed-react-pdf-templates.ts`) |

## 📊 API Endpoints (selection)

All routes are prefixed `/api/v1` and documented at <http://localhost:3000/docs> (Swagger UI is mounted only when `NODE_ENV` ≠ `production` — Fly prod/staging don't expose `/docs`).

### Public

| Method | Endpoint                | Description                                                                  |
| ------ | ----------------------- | ---------------------------------------------------------------------------- |
| POST   | `/auth/register`        | Register (email/password)                                                    |
| POST   | `/auth/login`           | Email/password login                                                         |
| POST   | `/auth/refresh`         | Rotate access token                                                          |
| GET    | `/auth/oauth/google`    | OAuth (Google)                                                               |
| GET    | `/auth/oauth/microsoft` | OAuth (Microsoft)                                                            |
| GET    | `/auth/csrf-token`      | CSRF token (optional)                                                        |
| GET    | `/health`               | Health check (infra deps only — DB, storage, queue, templates; no LLM probe) |
| GET    | `/health/live` · `/health/ready` | Liveness/readiness probes (throttle-exempt; used by Fly checks)     |
| POST   | `/contact`              | Contact form                                                                 |

### Protected

| Method   | Endpoint                           | Description                                                                 |
| -------- | ---------------------------------- | --------------------------------------------------------------------------- |
| GET      | `/auth/me`                         | Current user                                                                |
| GET      | `/auth/logout`                     | Logout                                                                      |
| POST     | `/auth/2fa/setup`                  | TOTP enrollment                                                             |
| POST     | `/auth/2fa/verify`                 | TOTP verification                                                           |
| GET/PUT  | `/profile`                         | Profile (differential)                                                      |
| POST/GET/DELETE | `/profile/photo`            | Bewerbungsfoto (JPEG/PNG ≤ 2 MB; only rendered when `showPhoto` is enabled) |
| POST     | `/resume-parser/parse`             | Resume → profile                                                            |
| GET/POST | `/job-postings`                    | Job CRUD                                                                    |
| POST     | `/job-postings/parse`              | Parse text/URL/file                                                         |
| GET/POST | `/applications`                    | Application pipeline                                                        |
| POST     | `/applications/cancel-generation`  | Cancel in-flight generation (soft-deletes the PENDING/GENERATING row)       |
| GET      | `/applications/:id/files`          | SAS download URLs                                                           |
| PATCH    | `/applications/:id/template-settings` | Per-application design tuning (font scale, density, accent override)    |
| GET      | `/applications/:id/stream`         | SSE status stream                                                           |
| POST     | `/validation`                      | Check an external application (AI quality + ATS; Free 3/mo, Pro 15/mo, Premium 35/mo; identical re-submit served from cache, no quota) |
| GET      | `/validation`                      | Validation history                                                          |
| POST     | `/interviews`                      | Generate mock interview                                                     |
| POST     | `/interviews/:id/voice/session`    | Mint voice session (Pro 5/mo, Premium 20/mo; 5/10/15 min, persona-led, CV-grounded) |
| POST     | `/interviews/:id/voice/transcript` | Finalize + score voice interview (Pro/Premium)                              |
| GET/POST | `/appointments`                    | List / create interview-calendar appointments                              |
| PATCH/DELETE | `/appointments/:id`            | Update / delete an appointment (user-scoped)                               |
| GET      | `/mailbox-sync/connections`        | List connected mailboxes (Premium)                                          |
| GET      | `/mailbox-sync/microsoft/connect`  | Start MS Graph OAuth (Premium)                                              |
| GET      | `/mailbox-sync/microsoft/callback` | OAuth redirect target (public)                                              |
| POST     | `/mailbox-sync/microsoft/webhook`  | MS Graph push notifications (public)                                        |
| DELETE   | `/mailbox-sync/connections/:id`    | Disconnect mailbox (Premium)                                                |
| GET      | `/templates`                       | Template catalog (registry-filtered: only designs with a react-pdf factory) |
| GET      | `/sessions`                        | Active sessions                                                             |
| DELETE   | `/sessions/:id`                    | Remote logout                                                               |
| GET      | `/subscription`                    | Plan & usage (incl. monthly application hard limit + add-on credit balance) |
| GET      | `/subscription/tiers`              | Public tiers + prices, hard limits, and persistent add-on packages          |
| GET      | `/admin/users?email=`              | Admin: search users (allow-listed)                                          |
| POST     | `/admin/users/:email/tier`         | Admin: set subscription tier (allow-listed)                                 |
| DELETE   | `/admin/users/:email`              | Admin: permanently delete user (allow-listed)                               |
| GET/PUT  | `/user-preferences`                | Settings (incl. `onboardingCompleted` — the first-login product tour flag)  |

## 🚀 Deployment

### Development

```bash
pnpm dev          # API + Web in parallel (Turborepo)
pnpm api:dev      # NestJS on :3000
pnpm web:dev      # Next.js on :3001
```

### Production

We run **two independent environments** (staging + prod) on sister Fly
apps + Cloudflare Workers + Neon branches. Each environment has its own
secrets, scoped Fly tokens, and Worker namespace. Promotion happens via
Git tags created by release-please when its Release PR is merged.

```text
PR opened   → ci.yml runs (lint, tests, lockfile, migration dry-run)
Merge to main → deploy-staging.yml fires (auto, no approval)
                + release-please opens / updates a Release PR
Merge Release PR → PAT pushes tag v1.x.y → deploy-prod.yml fires
                 → blocks at `production` GitHub Environment gate
                 → you click "Approve and deploy" → prod ships
```

| Environment | API (Fly app)             | Web (Worker)                                | DB (Neon branch) | R2 bucket             |
| ----------- | ------------------------- | ------------------------------------------- | ---------------- | --------------------- |
| **Staging** | `smart-apply-api-staging` | `smart-apply-web-staging` (`*.workers.dev`) | `staging`        | `smart-apply-staging` |
| **Prod**    | `smart-apply-api`         | `smart-apply-web` (`applo.ai`)        | `main`           | `smart-apply-prod`    |

Fly config files split per env: [`fly.prod.toml`](./fly.prod.toml) and
[`fly.staging.toml`](./fly.staging.toml). Both use the same `infra/Dockerfile`;
staging uses a smaller VM (1x/1GB) with `min_machines_running = 0` (suspend
on idle) to minimise cost.

```text
GitHub Actions
  ├── ci.yml (PR-triggered)
  │     ├─ lint + lockfile sync check
  │     ├─ unit tests (currently non-blocking, see CONTRIBUTING.md)
  │     └─ migration-check (per-PR Neon branch + prisma migrate deploy dry-run)
  │
  ├── deploy-staging.yml (push to main)
  │     ├─ API → build image once on runner (type=gha cache) → push
  │     │        registry.fly.io/smart-apply-api:sha-<gitsha> → flyctl deploy
  │     │        --image → Fly (smart-apply-api-staging, fly.staging.toml)
  │     └─ Web → Cloudflare Worker (smart-apply-web-staging, env.staging block)
  │
  ├── release-please.yml (push to main)
  │     └─ Maintains Release PR + creates v*.*.* tags via PAT
  │
  └── deploy-prod.yml (tag v*.*.* push)
        ├─ Blocks at `production` GitHub Environment (manual approval)
        ├─ API → promote SAME sha-<gitsha> image staging built (flyctl deploy
        │   │    --image; no rebuild; race-guard rebuilds only if missing) →
        │   │    Fly (smart-apply-api, fly.prod.toml)
        │   ├─ Release command: prisma migrate deploy (Neon DIRECT_URL)
        │   │    → then seed-react-pdf-templates (idempotent catalog sync)
        │   ├─ Secrets via `flyctl secrets set` (CORS_ORIGINS, JWT_*, R2_*, ...)
        │   ├─ HTTPS terminated by Fly (Let's Encrypt for api.applo.ai)
        │   └─ Backed by Neon Postgres · Cloudflare R2 · Upstash QStash/Redis
        └─ Web → Cloudflare Worker (smart-apply-web, OpenNext)
            ├─ Build with NEXT_PUBLIC_API_URL injected from PUBLIC_API_URL env
            ├─ Runtime config served at /api/config (single source of truth)
            └─ wrangler deploy
```

> ⚠️ **PUBLIC_API_URL trap:** the GitHub Actions workflow honours the
> `PUBLIC_API_URL` repo Variable as an override. Leave it **unset** in
> production so the workflow default (`https://api.applo.ai/api/v1`)
> wins. Setting it to a `*.fly.dev` URL bakes the wrong origin into the
> Worker and breaks CORS / cookies. See [docs/guides/DOMAIN_CLOUDFLARE_SETUP.md](docs/guides/DOMAIN_CLOUDFLARE_SETUP.md).

## 📈 Performance & Resilience

| Feature             | Implementation                                           |
| ------------------- | -------------------------------------------------------- |
| **Template cache**  | In-memory cache (TTL)                                    |
| **Browser pool**    | (removed in v1.16 — react-pdf has no browser dependency) |
| **Circuit breaker** | `opossum` around LLM calls                               |
| **DB indexes**      | Targeted indexes; cursor-based pagination                |
| **Compression**     | gzip middleware                                          |
| **Soft delete**     | Logical deletion across user data                        |
| **SSE**             | Real-time pipeline status                                |
| **N+1 prevention**  | Prisma `include`/select tuning                           |
| **CDN**             | Cloudflare in front of Workers                           |

---

See [docs/](docs/) for feature specs, security notes, and implementation guides.
