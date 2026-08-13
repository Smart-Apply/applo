# Security Audit — Applo (applo) — 2026-08-13

Delta audit against the 20-point checklist in issue #752, run after #522 (LLM usage
tracking) and #533 (warm-Chromium pool) merged. Static read + targeted live verification
(dependency scan, GitHub security settings via `gh api`, git-history scan, one migrated
local Postgres, one e2e test run against it). No traffic sent to prod, no exploitation,
no credential use.

> Supersedes the checklist coverage of [SECURITY_AUDIT_2026-07-03.md](SECURITY_AUDIT_2026-07-03.md)
> and [ARCHITECTURE_SECURITY_REVIEW_2026-07-27.md](../implementation/ARCHITECTURE_SECURITY_REVIEW_2026-07-27.md).
> Both remain the historical record for their findings; this doc records what changed
> since and adds the items neither covered.
>
> **Remediation status:** all 11 open findings (F9–F19) were fixed the same day —
> see the [remediation addendum](#11-remediation-addendum-2026-08-13) at the end.
> Sections 1–10 are the unmodified audit record and still describe the pre-fix code.

## 1. Executive summary

The auth core remains sound: all four actionable findings from the 2026-07-03 audit
(SSRF, IDOR/LFI on file-parse, unsanitized profile HTML, non-constant-time compare) are
confirmed **fixed** with evidence in §5, and password hashing, cookie flags, admin
fail-closed behaviour and webhook signature verification all re-verified clean.

**The rate-limiting layer does not hold, and that is the headline of this audit.** Item 5
was the checklist row most likely to be waved through on the strength of a well-organised
config block; on inspection the enforcement side is broken three ways at once — the
throttle key is attacker-controlled, per-user bucketing is dead code, and one advertised
bucket throttles nothing. See **F16 (High)**. This also changes the calculus on two other
findings: a rate-limit bypass is the amplifier that makes **F18** (public `/health`
triggering a real Azure OpenAI call) and **F12** (leaked browser pages) materially worse
than they look in isolation.

Two checklist rows also turned out to be enforceable-but-unenforced or unscoped: **F17**
(two cross-tenant reads that take a `userId` and then don't use it) and **F19** (the Graph
webhook accepts an unbounded, entirely unvalidated body).

**Item 18 fails, but not for the reason a first pass suggests.** `pnpm audit` reports 6
High advisories, and it is tempting to headline `pdfjs-dist` (arbitrary JS execution on a
malicious PDF) as reachable from the resume-upload path. It is not: there are two
`pdfjs-dist` copies installed, and the one on the upload path is *below* the advisory's
vulnerable range. The same applies to `undici` — the URL parser fetches with axios, not
cheerio. Both corrected in §7. **No High advisory is currently reachable at runtime**,
which lowers the urgency but does not clear the row.

**Secret scanning is disabled** — verified, not deferred. Issue #752's AC "Secret-Scanning
und Dependabot sind im Repository aktiviert" is half unmet (§2 row 18, §9).

On the AC "critical findings (secrets, auth, RLS, IDOR) are fixed and re-verified": the
named categories come back clean — nothing in them needed fixing, so that AC is satisfied
without code changes. F16/F17 are access-control and availability findings that sit
outside those four categories; they are documented rather than fixed here, per the
audit-first scope decision recorded in §8.

**Counts by severity — 11 open findings:** **High 1** (F16), **Medium-High 3** (F12, F14,
F18), **Medium 5** (F11, F13, F15, F17, F19), **Low 2** (F9, F10). Carried forward as
already fixed since 2026-07-03: **High 2, Medium 1, Info 1** (§5). Still-open prior
findings: F5, F6 (Low), F8 (Info). Open dependency advisories: High 6, Moderate 5 —
**none runtime-reachable** (§7).

## 2. Twenty-point checklist

Grep commands below use `grep -rE` so they are runnable as written (a `\|` inside a
markdown table cell renders as a literal `|`, which BRE would treat as a character, not
alternation).

| # | Item (translated) | Verdict | Evidence |
|---|---|---|---|
| 1 | `.env` not in repo, git history scanned, exposed keys rotated | **PASS** (rotation: operator-only) | Working tree: `git ls-files` returns only `apps/api/.env.example` and `apps/web/.env.example`; `.gitignore:25-35` covers `.env`, `.env.bak`, `*-secrets.env`. **History scanned** (`git log --all --diff-filter=A --name-only --pretty=format: \| grep -E '(^\|/)\.env($\|\.)'`): two non-example hits ever committed — `apps/api/.env.test` and `.env.production.template`. Retrieved the `.env.test` blob at its introducing commit `e994693f`: placeholders only (`postgres:testpass@localhost:5433/smartapply_test`, `JWT_SECRET=TEST_SECRET_DO_NOT_USE_IN_PRODUCTION_…`). `.env.production.template` is a template by name; its blob was **not** retrievable from any reachable ref, so its historical contents are unverified — flagged as an operator check in §9 rather than claimed clean. |
| 2 | No API keys in the frontend bundle; external calls only via backend routes | **PASS** | Every `NEXT_PUBLIC_*` var is non-secret by design: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_ENV`, `NEXT_PUBLIC_SENTRY_RELEASE`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Turnstile's *site* key is meant to be public (the secret key stays server-side); a Sentry DSN likewise. |
| 3 | RLS enabled per table, policies tested with a foreign token | **N/A — reinterpreted** | `grep -rE "ROW LEVEL SECURITY\|CREATE POLICY" apps/api/prisma/migrations/` → zero matches. This is Prisma + Neon (single owner DB role), not Supabase — RLS has no per-request session-user hook to key off without a schema-level redesign. Equivalent control is ownership scoping in the service layer. **Live-verified, but narrowly**: `apps/api/test/e2e/security/application-ownership.e2e-spec.ts` run against a migrated local Postgres on 2026-08-13, **5/5 passing** — covering exactly one model (`Application`) and three PATCH routes, with the owner-succeeds case asserted only for `/status`. The rest of the tenant-isolation claim rests on the static scoping argument in row 4, which is **not** clean — see F17. |
| 4 | Permissions checked server-side, not just hidden in the frontend | **PARTIAL** | `userId`-scoped Prisma queries are dense and correct in the main services (`applications.service.ts`, `job-postings.service.ts`, `interviews.service.ts` — 69/30/28 `userId` references), and every controller handling user data carries an auth guard. But two routes read cross-tenant data unscoped — see **F17**. Auth is enforced per-controller (`JwtAuthGuard` or `AuthGuard('jwt')`), **not** by a global `APP_GUARD`; only `CaptchaGuard` and `CustomThrottlerGuard` are global (`app.module.ts:144-150`), so "is this route protected?" must be answered per controller. |
| 5 | Rate limiting active globally, tightened on login and expensive endpoints | **FAIL** | Buckets are well-defined (`app.module.ts:60-110`: `default`, `auth`, `health-check`, `resume-parser`, `uploads`, `llm-actions`, `translation`, `email`) but enforcement is broken — see **F16**. Three concrete defects: the throttle key is read from client-supplied `CF-Connecting-IP`/`X-Forwarded-For` headers (`custom-throttler.guard.ts:168-184`), per-user bucketing keys off `req.user?.userId` which never exists (`validateUser` selects `id`, `auth.service.ts:462+`), and the `translation` bucket is defined but wired to no route (`grep -rn "'translation'" apps/api/src` → only its own definition). Additionally 8 controllers carry a class-level `@SkipThrottle()`, and `custom-throttler.guard.ts:56` returns `true` for any URL under `/api/v1/health`. Also note: the issue's Cloudflare hint ("rate limiting is better done at the edge, since Worker instances hold no state") applies here — this is in-process `@nestjs/throttler` on Fly, not Cloudflare; the committed defaults (`RATE_LIMIT_MAX=5000`) are dev-shaped and the real values are Fly secrets. |
| 6 | No SQL string concatenation, only parameterized queries / ORM | **PASS** | `grep -rE "queryRawUnsafe\|executeRawUnsafe" apps/api/src` matches only the generated Prisma client's own type declarations — zero call sites in application code. |
| 7 | Server-side input validation for body, query params, headers | **PASS, one nuance** | Global `ValidationPipe({ whitelist: true, ... })` (`main.ts:246-250`) strips unknown properties on every request — this is what blocks mass assignment (row 15). `forbidNonWhitelisted: false`, so unknown fields are dropped silently rather than 400ing; a UX choice, not a validation gap. **Exception**: a DTO must be a *class* for the pipe to engage — the Graph webhook types its body as a TypeScript `interface`, which erases at compile time and bypasses validation entirely. See **F19**. |
| 8 | No raw user HTML; sanitizing plus CSP header | **PASS** | 3 `dangerouslySetInnerHTML` render sites in `apps/web/src`, all audited: `profile/page.tsx:1355` wraps in `sanitizeHtml()` (fixed since 2026-07-03, §5); `faq/page.tsx:96` renders `JSON.stringify(jsonLd)` (developer-authored); `metric-tip.tsx:49` renders a `content` prop. `MetricTip` has 4 render sites — 3 pass static i18n keys directly (`activity-chart.tsx:115`, `funnel-card.tsx:47`, `score-buckets-chart.tsx:32`), and the 4th (`kpi-card.tsx:118`) forwards an arbitrary `tipHtml` prop resolved one hop up at `analytics/page.tsx:131,141,151,161` — also static i18n keys. `t()` cannot return attacker-influenced content: locale is allow-listed via `isLocale()` (`i18n/request.ts:18-27`), messages are statically-imported JSON, and no call passes interpolation values. Safe today, but **`KpiCard` is a reusable un-sanitized HTML sink** — a future consumer passing API data would introduce XSS silently. API CSP is `'self'`-only in prod (`main.ts:83-96`); web CSP retains `'unsafe-inline'`/`'unsafe-eval'` as a documented accepted risk (§5 F5). |
| 9 | Passwords hashed with bcrypt or argon2id; no plaintext in logs | **PASS** | `argon2.hash`/`argon2.verify` at every password site in `auth.service.ts`: registration (`:84`), login (`:178`), password change (`:551`), account deletion (`:594`), password reset (`:819`), refresh-token hashing (`:349`). No plaintext password in any logger call. Note argon2id is the **library default** — `argon2.hash()` is called with no options, so no `memoryCost`/`timeCost`/`parallelism` is pinned. True today, resting on a default the code doesn't state. |
| 10 | Auth token in httpOnly cookies, not localStorage | **PASS** | The auth cookies are set in `setAuthCookies`: `access_token` at `auth.controller.ts:546-547` and `refresh_token` at `:570-571`, both `httpOnly: true`, `secure` in production. (For precision: the file has 10 `httpOnly` occurrences — `:225,233,242,283,291,318,326` are `clearCookie` calls, `:127` is the `trusted_device` cookie, and `main.ts:191` is the CSRF cookie, not an auth token.) |
| 11 | Admin panel has auth + role check, even on direct URL | **PASS** | `admin/admin.guard.ts:32-44` — fail-closed on empty `ADMIN_EMAILS`, re-read and confirmed unchanged since 2026-07-03. |
| 12 | CORS restricted to concrete domains, no wildcard | **PASS in code; operator-set value** | `main.ts:231` — `origin: corsOrigins` sourced from `CORS_ORIGINS`, not a `*` literal. The production value is a Fly secret — see §9. |
| 13 | Email verification enforced at registration | **PASS, by design — not global** | `EmailVerifiedGuard` is deliberately scoped to expensive/abuse-prone endpoints (its own doc comment says so): `applications.controller.ts:70,105,169` and `validation.controller.ts:74`. Cheap reads stay open pre-verification so users can configure their account. OAuth emails are pre-verified (`auth.service.ts:1077,1107`). |
| 14 | No predictable IDs; IDOR test with a foreign ID passes | **PASS, one exception** | 30 `@default(cuid())` and **0** `@default(autoincrement())` in `schema.prisma`. The schema has 31 models: the exception is `BackgroundJob` (`schema.prisma:682`), `id String @id` with no default — it reuses the queue message ID. In production `JOBS_DRIVER=qstash` is enforced at startup (`env.schema.ts:324-329`) so the ID is an opaque QStash message ID; the in-memory dev driver mints `job-${Date.now()}-${Math.random()...}` (`in-memory-queue.provider.ts:13`), non-CSPRNG but dev/test-only. Relevant because this is the model exposed by the unscoped route in F17. IDOR test: §6. |
| 15 | No full request body stored; allowlist instead of spread | **PASS** | No mass-assignment sink exists. Widened the search beyond `...dto` to `Object.assign`, `...body`, `...req.body`, `...input`, `...payload`: the only spreads reaching a Prisma `data:` are `generation.service.ts:604` and `:611-616`, both spreading `applicationData` — a **server-built literal** enumerated at `:580-597`, never client input. (The narrower claim "every create/update explicitly enumerates fields" would be false; the accurate claim is that no client-controlled object is ever spread into a query.) Combined with global `whitelist: true`, unknown client fields are stripped before reaching a DTO. |
| 16 | Webhook signatures verified, timing-safe, with a timestamp check | **PASS** | **QStash** (`jobs/qstash-webhook.controller.ts`) — `verifySignature` delegates to `@upstash/qstash`'s `Receiver.verify()`, read directly at `node_modules/.pnpm/@upstash+qstash@2.11.3/node_modules/@upstash/qstash/index.js:1165-1210`: `jose.jwtVerify()` with `issuer: 'Upstash'` (which enforces `exp`/`nbf` **when those claims are present**; no `maxAge` is set), plus `verifyBodyAndUrl()` binding the signature to the exact URL via the `sub` claim and to a SHA-256 hash of the raw body. `qstash-queue.provider.ts:142-146` does pass `url`, so the `sub` binding is active — it is conditional in the library. **Microsoft Graph** — per-connection `clientState` compared with `crypto.timingSafeEqual` (`mailbox-sync.orchestrator.ts:314-325`; fixed since 2026-07-03, §5 F7), verified at `:67` before any token refresh, Graph fetch or LLM call. Replay is handled by an explicit pre-flight `findUnique` on `(mailboxConnectionId, providerMessageId)` at `:78-89` that short-circuits before any expensive work, backed by the DB constraint at `schema.prisma:1181`. Sufficient for sequential redelivery; it is check-then-act, so two *concurrent* deliveries of the same message would both pay for classification before the insert collides. |
| 17 | No stack traces in production; source maps not public | **PASS** | `all-exceptions.filter.ts:38-46` replaces non-`HttpException` throws with a generic coded message; the response body (`:101-112`) never carries `exception.stack`, which goes only to the logger (`:120`) and Sentry. Swagger is correctly gated off in production (`main.ts:297`). Two caveats the row's evidence should name rather than assume: Express-level middleware registered via `app.use()` sits *outside* Nest's exception filter, so an error there reaches Express's `finalhandler`, which embeds `err.stack` unless `NODE_ENV=production` — safe here, but by that env var rather than by the filter. Source maps: `apps/api/tsconfig.json:13` sets `sourceMap: true` and the Dockerfile copies all of `dist`, so `.js.map` files ship in the image — but nothing serves them (`useStaticAssets`/`express.static` appear nowhere in `apps/api/src`), and the web side deletes them after upload (`next.config.ts` `deleteSourcemapsAfterUpload: true`). |
| 18 | Dependencies current; `pnpm audit` clean of High/Critical; Dependabot active | **FAIL** | `pnpm audit --audit-level high` → **6 High, 5 Moderate**. **None is reachable at runtime** — see §7, which corrects the intuitive but wrong reading of the `pdfjs-dist` and `undici` paths. Dependabot: `.github/dependabot.yml` configures **3** ecosystems (`npm`, `github-actions`, `docker`) and Dependabot security updates are enabled. **Secret scanning is DISABLED** — verified via `gh api repos/Smart-Apply/applo -q '.security_and_analysis'`: `secret_scanning: disabled`, `secret_scanning_push_protection: disabled`. Issue #752's AC requiring both is therefore **half unmet**; this is a repo-settings toggle, see §9. |
| 19 | Password strength enforced server-side; checked against known leaks | **PARTIAL** | Strength: `MinLength(8)` + `MaxLength(128)` + `PASSWORD_REGEX` (`auth/dto/index.ts:45-47,111-113,148`) on every password-setting DTO. Leak check: `grep -rniE "haveibeenpwned\|hibp\|pwned\|breach" apps/api/src` → zero matches. **No compromised-password check exists** — §4 F10. |
| 20 | Uploads validated via magic bytes, size limit, UUID filenames | **PARTIAL** | Magic bytes: `FileTypeValidator` is constructed at `common/pipes/file-validation.pipe.ts:44` and `:59` with `skipMagicNumbersValidation` left unset (that option appears nowhere in the repo), so NestJS 11's default magic-number sniffing is active on all 4 multipart routes. Size limits enforced per route (`DOCUMENT_MAX_SIZE_MB=10`, `PHOTO_MAX_SIZE_MB=2`). Filenames: `uploads.service.ts:74-77` builds `${userId}/${timestamp}-${sanitizedFilename}`, keeping the original name. `sanitizeFilename` (`:60-72`) replaces every character outside `[a-zA-Z0-9._-]` with `_` — which is what actually blocks traversal (it removes `/`), rather than the single-pass `..` strip. Not a traversal or IDOR risk; it is a PII-in-key issue with a narrow collision edge — §4 F9. |

## 3. Findings

Ordered by severity, not by ID. F9/F10 are new from this audit; F11–F15 are carried
forward from the Phase-C reviews of PRs #781 (issue #522) and #783 (issue #533) — both
merged, both gaps still open — re-verified here rather than taken on trust; F16–F19 are
new from this audit. F1–F8 belong to the 2026-07-03 audit (§5).

| ID | Severity | OWASP | Title | Location | Confidence |
|----|----------|-------|-------|----------|------------|
| F16 | High | A04 / A07 | Rate limiting bypassable via forged header; per-user bucketing is dead code; one bucket wired to nothing | `apps/api/src/common/guards/custom-throttler.guard.ts:56,163-184`; `app.module.ts:97-101` | Confirmed |
| F12 | Medium-High | A01 | Agent-parser pages/contexts leak on error or timeout | `apps/api/src/job-postings/agents/agent-url.parser.ts` (`parseInternal`, `extractPageContent`) | Confirmed (pre-existing, from PR #783 review) |
| F14 | Medium-High | A10 (SSRF) | WebSocket connections bypass the SSRF `page.route` interceptor | `apps/api/src/job-postings/agents/agent-url.parser.ts:375-411` | Confirmed (pre-existing, from PR #783 review) |
| F18 | Medium-High | A04 | Public, throttle-exempt `/health` triggers a real Azure OpenAI call | `apps/api/src/health/health.controller.ts:89,126,175`; `custom-throttler.guard.ts:56` | Confirmed |
| F19 | Medium | A04 / A03 | Graph webhook body is unvalidated and unbounded (interface, not DTO class) | `apps/api/src/mailbox-sync/mailbox-webhook.controller.ts:26-28,60,80-99` | Confirmed |
| F11 | Medium | A01 / GDPR | `llm_usage_events` has no erasure hook or retention sweep; still labelled "Anonymous" in code | `apps/api/src/llm/usage/llm-usage.service.ts:38`; absent from `auth.service.ts` deletion path | Confirmed |
| F13 | Medium | A05 | `--no-sandbox` Chromium persists across users (warm pool) | `apps/api/src/job-postings/agents/agent-url.parser.ts:353-354` | Confirmed (pre-existing, from PR #783 review) |
| F15 | Medium | A10 (SSRF) | DNS-rebinding TOCTOU between the Node-side SSRF guard and Chromium's resolver | `apps/api/src/common/security/url-safety.util.ts`; `agent-url.parser.ts` route handler | Confirmed (pre-existing, from PR #783 review) |
| F17 | Medium | A01 (BOLA) | Two cross-tenant reads accept a `userId` and don't scope by it | `apps/api/src/keywords/keywords.service.ts:181-183`; `apps/api/src/jobs/jobs.controller.ts:56` | Confirmed |
| F9 | Low | A01 / privacy | Upload storage keys retain the original filename instead of a UUID | `apps/api/src/uploads/uploads.service.ts:74-77` | Confirmed |
| F10 | Low | A07 | No compromised-password (leak) check at signup or password change | `apps/api/src/auth/dto/index.ts:45-47`; `auth.service.ts:84,551,819` | Confirmed |

Prior-audit findings still open (F5, F6, F8) are carried forward in §5.

## 4. Per-finding detail

### F16 — Rate limiting is bypassable, and partly wired to nothing (High)
**Location:** `apps/api/src/common/guards/custom-throttler.guard.ts:56,163-184`;
`apps/api/src/app.module.ts:60-110`.

**Three independent defects, all in the enforcement layer rather than the config:**

1. **The throttle key is attacker-controlled.** `getTracker` (`:163-184`) prefers raw
   request headers over Express's derived `req.ip`:
   ```ts
   const cfIp = req.headers?.['cf-connecting-ip'];
   if (typeof cfIp === 'string' && cfIp.length > 0) return cfIp;
   const xff = req.headers?.['x-forwarded-for'];
   if (typeof xff === 'string' && xff.length > 0) { /* leftmost entry */ }
   return req.ip || ...;   // only as a last resort
   ```
   The method's own comment frames this as "defense in depth" against a `trust proxy`
   misconfiguration, but it inverts the trust model: `main.ts:66` already sets
   `app.set('trust proxy', 1)`, and `req.ip` is the value derived *under* that policy.
   Reading the header directly means a client that sets its own `CF-Connecting-IP` picks
   its own bucket. Rotating that header per request defeats **every** bucket, including
   `auth` (login brute-force / credential stuffing) and `email` (3/hour).
2. **Per-user bucketing never engages.** `:164-166` returns `user:${req.user.userId}`,
   but `validateUser` — what the JWT strategy returns (`jwt.strategy.ts:40,46`) — selects
   `id`, not `userId` (`auth.service.ts:462+`). `req.user.userId` is always `undefined`.
   Independently, `CustomThrottlerGuard` is registered as an `APP_GUARD`
   (`app.module.ts:147-150`) and so runs *before* the per-controller `JwtAuthGuard`,
   meaning `req.user` isn't populated yet regardless. Every request is IP-bucketed, and
   defect 1 makes that IP forgeable. The file contradicts itself on this:
   `:115` logs `user?.userId` while `:118` passes `user?.id`.
3. **The `translation` bucket throttles nothing.** Defined at `app.module.ts:97-101`
   (10 per 15 min); `grep -rn "'translation'" apps/api/src` returns only that definition.
   No route carries `@UseThrottler('translation')`. This is the exact failure mode
   `ARCHITECTURE_SECURITY_REVIEW_2026-07-27.md` §2 already documented once — a named
   bucket needs both the `throttlers[]` entry *and* the decorator, and `parse-resume`'s
   documented 10/h "was never enforced until #710."

**Impact:** The documented protections on login, email sending and LLM-cost endpoints are
not effective against an attacker who sets one header. This is also the amplifier for
F18 and F12.

**Remediation:** Drop the header-reading fallbacks and trust `req.ip` under the existing
`trust proxy` setting (or validate that the request actually arrived via Cloudflare, e.g.
an authenticated-origin-pull check or a shared-secret header, before honouring
`CF-Connecting-IP`). Fix the per-user key to `req.user?.id` **and** move the throttler
after authentication if per-user bucketing is wanted. Wire `translation` to its routes or
delete the bucket. Note also that 8 controllers carry a class-level `@SkipThrottle()` and
`:56` exempts everything under `/api/v1/health` (see F18).

### F18 — Public, throttle-exempt `/health` triggers a real Azure OpenAI call (Medium-High)
**Location:** `apps/api/src/health/health.controller.ts:89,126,175`;
`custom-throttler.guard.ts:56`.
**Detail:** `GET /api/v1/health` and `/health/details` are `@Public()` and additionally
exempt from throttling twice over — a class-level `@SkipThrottle()` and an unconditional
`return true` in the guard for any URL under `/api/v1/health`. Both invoke
`llmService.healthCheck()` (`:89`, `:248`), which reaches
`azure-openai.provider.ts:266-287` and issues a **real `POST` to Azure OpenAI
chat-completions** with the server's own key (`max_tokens: 1`, 5s timeout).
**Impact:** Anonymous outbound cost amplification, and — more importantly — consumption of
the same Azure TPM/RPM quota as the product's core generation path. `fly.prod.toml:99-108`
records that this has already caused an incident (an Azure 429 opened the LLM circuit
breaker and `/health` began returning 500), which is why the Fly check was pointed at
`/health/ready`; `/health` and `/health/details` remain publicly reachable. Secondary:
`/health/details` echoes raw dependency error messages to anonymous callers, leaking
internal hostnames and provider error text on failure.
**Remediation:** Remove the LLM probe from the anonymous aggregate (keep it behind
`AdminGuard` or a shared-secret header), cache the result for 30–60s, and narrow the
throttler's `/api/v1/health` exemption to `/live` and `/ready` only.

### F19 — Graph webhook body is unvalidated and unbounded (Medium)
**Location:** `apps/api/src/mailbox-sync/mailbox-webhook.controller.ts:26-28,60,80-99`.
**Detail:** `@Body() body: GraphWebhookBody | undefined` where `GraphWebhookBody` is a
TypeScript **interface** (`:26-28`). Interfaces erase at compile time, so Nest's global
`ValidationPipe` sees metatype `Object` and skips validation entirely — no `whitelist`,
no array-length cap. The endpoint is unauthenticated by design (no guard),
`@SkipThrottle()` (`:55`), and CSRF-exempt (`main.ts:280`). `res.status(202).send()` fires
at `:80` *before* the processing loop, detaching the work from the response and from the
request-timeout middleware. Critically, `findBySubscriptionId` runs per entry at
`orchestrator.ts:59` **before** the `clientState` check at `:67`, so no secret is needed
to trigger the DB work.
**Impact:** Within the default 100 kb Express JSON limit, one request carries on the order
of 1–2k notification entries, each causing a sequential indexed DB read, unthrottled. A
modest flood exhausts the Prisma connection pool.
**Remediation:** Convert `GraphWebhookBody` to a DTO **class** with `@ValidateNested()` +
`@ArrayMaxSize()`, or hard-cap `body.value.length` before the loop. Ideally also look up
the connection once per `subscriptionId` rather than per notification entry.

### F17 — Two cross-tenant reads accept a `userId` and don't scope by it (Medium)
**Location:** `apps/api/src/keywords/keywords.service.ts:181-183`;
`apps/api/src/jobs/jobs.controller.ts:56`.
**Detail:**
1. `analyzeMatch(userId, jobPostingId)` uses `userId` only for the profile lookup, then
   fetches the posting unscoped:
   ```ts
   const jobPosting = await this.prisma.jobPosting.findUnique({ where: { id: jobPostingId } });
   ```
   Reached via `POST /job-postings/:id/analyze` (`job-postings.controller.ts:232-240`).
   Any authenticated user passing another user's posting cuid gets an existence oracle
   plus an LLM-extracted keyword set derived from that posting's `fullText`/`rawText`,
   returned verbatim in `matchedKeywords`/`missingKeywords`. Also lacks a
   `deletedAt: null` filter, and burns LLM budget on someone else's data.
2. `GET /jobs/:id/status` (`jobs.controller.ts:56`) takes no `@CurrentUser` at all;
   `jobs.service.ts:64-70` does `findUnique({ where: { id: jobId } })`, exposing another
   user's job `status`/`error`/timestamps. Exploitability is low in production because
   the ID is an opaque QStash message ID (see row 14), but it is a missing authorization
   check rather than a scoped one.
**Remediation:** Add `userId` to the `where` clause in both (`findFirst({ where: { id, userId } })`)
and return 404 on miss, matching the pattern already used correctly across
`appointments.service.ts`, `validation.service.ts`, `job-postings.service.ts` and
`interviews.service.ts`.

### F11 — `llm_usage_events` has no erasure hook, and is still labelled "Anonymous" (Medium)
**Location:** `apps/api/src/llm/usage/llm-usage.service.ts:38` (the label) and `:90` (the
only writer); absent from `auth.service.ts`'s account-deletion path.
**Detail:** PR #781 (issue #522) added per-feature LLM token-usage tracking. Its own
review established that the dataset is **pseudonymous, not anonymous**: `actorHash` is a
stable HMAC-SHA256 keyed pseudonym, and the table sits in the same database as
`applications`/`validations`/`interview_sessions`, which carry `userId` and a millisecond
`createdAt` — a generation's ~8-row burst time-correlates back to the triggering row,
recovering the user **without** the HMAC salt. That makes it personal data under GDPR, not
anonymous data exempt from Art. 17.
Two consequences are still live:
- **The code still says otherwise.** `llm-usage.service.ts:38` reads "**Anonymous**
  per-feature LLM token-usage recorder" and describes `actorHash` as "salted,
  irreversible". The correction landed in the PR description and the docs, not in this
  file's header. `LlmUsageEvent.actorHash` also has no foreign key to `users`
  (`schema.prisma:1238-1241`), so there is no cascade delete.
- **No erasure hook and no retention policy.** Account deletion leaves the rows; nothing
  ages them out.
**Remediation:** Correct the `llm-usage.service.ts:38` header to match the schema comment
and the docs. Add a deletion hook in the account-deletion flow (deriving the hash from the
salt at deletion time, the same HMAC computation used to write it) plus a scheduled
retention sweep (e.g. 90 days).

### F12 — Agent-parser pages/contexts leak on error or timeout (Medium-High)
**Location:** `apps/api/src/job-postings/agents/agent-url.parser.ts` — `parseInternal`'s
work closure creates `page` and never closes it; `navigateToUrl` closes only on navigation
failure (`:453`); `extractPageContent` closes as its last statement (`:605`), after two
unguarded tail calls (`page.locator('body').innerText()` at `:589`, `page.title()` at
`:601`).
**Detail:** The reaping behaviour changed in commit `ca5c7231` (**PR #548**, the original
warm-browser change — *not* #533, which only made the idle window configurable). Before
#548 the per-parse `finally` called `closeBrowser()` unconditionally, which incidentally
reaped any leaked `Page`/`BrowserContext` along with the browser. It now arms an
idle-eviction timer instead, so a page that leaks — via an exception in those unguarded
tail calls, or the 90s `Promise.race` hard timeout firing mid-extraction — survives until
the browser itself is evicted.
**Impact:** A user can submit a URL engineered to wedge its renderer (e.g. a blocking loop
after load) to strand an orphaned Chromium renderer pinning a CPU core, and keep the
browser alive by submitting a benign parse inside each idle window so the whole browser is
never reaped. Prod is a 2GB VM (`fly.prod.toml:118`).
**Bounding factors (why Medium-High, not High, on its own evidence):** `inFlightParse`
(`:100`, `:162-190`) serialises every parse process-wide, so leaks accumulate at most one
per full parse cycle; and the operative idle window is the **60s default**
(`DEFAULT_BROWSER_IDLE_MS`, `:66`), not the 600s ceiling — `MAX_BROWSER_IDLE_MS` (`:69`) is
a typo guard, and `.env.example:146` ships 60000. It rises to High in combination with
**F16**, since the route's `llm-actions` throttle is the main thing limiting attempt rate.
**Remediation:** Hoist `page` out of the closure and `finally { await page?.close().catch(() => undefined) }`;
wrap `extractPageContent`'s tail in try/finally. Bound the warm browser by parse count or
absolute age, not idle time alone. Out of scope here for the same reason it was out of
scope in #783 — `parseInternal` is parsing-pipeline code, and this is an audit PR.
(Unrelated but adjacent: the comment near `:390` still says "1GB Fly VM"; prod is 2GB.)

### F14 — WebSocket connections bypass the SSRF `page.route` interceptor (Medium-High)
**Location:** `apps/api/src/job-postings/agents/agent-url.parser.ts:375-411`.
**Detail:** `page.route('**/*')` does not intercept WebSocket handshakes — Playwright ships
a separate `routeWebSocket` API precisely because `route()` cannot cover them (confirmed
present in the installed `playwright-core@1.62.1`, `types/types.d.ts:4458`). A parsed
page's JavaScript can open `new WebSocket('ws://127.0.0.1:6379/')` or target Fly 6PN
addresses without passing through `resolveAndAssertPublic()`.
**Impact:** A plain HTTP service won't complete the WS upgrade, so this is not arbitrary
body read — but it yields a reliable internal port scanner (accept vs. reject vs. timeout
are distinguishable) and full access to any internal WebSocket service, with results
written into the DOM where `extractPageContent` returns them in the parsed job-posting
text. Readable SSRF, **exploitable today with no CVE prerequisite** — which is why it is
ranked above F13.
**Remediation:** `await page.routeWebSocket('**/*', ws => ws.close())` alongside the
existing route, or run `resolveAndAssertPublic` on the WS target.

### F13 — Persistent `--no-sandbox` Chromium spans multiple users (Medium)
**Location:** `apps/api/src/job-postings/agents/agent-url.parser.ts:353-354` (inside the
`chromium.launch({` call at `:349`).
**Detail:** `--no-sandbox --disable-setuid-sandbox` predates the warm-browser work; what
changed with #548 is that one Chromium *process* now serves parses for many users in
sequence rather than dying with each request. Each parse does get an isolated
`BrowserContext` via `browser.newPage()` — **cookies, localStorage and cache genuinely do
not leak between users**, which closes the obvious cross-tenant vector — but that isolation
does not extend to the browser process. With the sandbox off, a renderer compromise
executes as the same OS user as the Node API process (both uid 1001 `nestjs`,
`infra/Dockerfile:160-161,207`), reaching `/proc/<node-pid>/environ` and the Fly private
network, bypassing every Node-level SSRF guard here since none are OS-level egress
controls.
**Why Medium rather than higher:** the pre-condition is a Chromium renderer 0-day/n-day,
and the incremental cross-tenant window over the old launch-per-parse model is the **60s**
default idle window (see F12), not the 600s ceiling — roughly a minute, not "minutes across
many users." This is a standing hardening gap, not a warm-pool regression.
**Remediation:** Re-enable the sandbox (the Alpine `chromium` package supports it;
`--no-sandbox` is usually a leftover from running as root, which this image does not do).
If it must stay off, bound the browser by parse count.

### F15 — DNS-rebinding TOCTOU on the SSRF guard (Medium)
**Location:** `apps/api/src/common/security/url-safety.util.ts` and the `page.route`
handler in `agent-url.parser.ts` that calls it.
**Detail:** The guard resolves the hostname in Node via `dns.promises.lookup`, then hands
the URL string to Chromium, which resolves it independently. An attacker-controlled
nameserver with TTL 0 can answer the Node lookup with a public IP and Chromium's with a
private/link-local one. The per-navigation `hostSafetyCache` makes this cheaper — one
"safe" verdict is memoised for the whole page load.
**Impact:** Bounded — a fresh `BrowserContext` per parse means no victim cookies to replay
against the API's own origin — but internal reads and port scanning remain reachable.
**Remediation:** `--host-resolver-rules` pinning the validated IP for the parse, or route
the browser through a proxy that enforces the allow-list at connect time.

### F9 — Upload storage keys retain the original filename (Low)
**Location:** `apps/api/src/uploads/uploads.service.ts:74-77` (`generateStorageKey`).
**Detail:** `` `${userId}/${timestamp}-${filename}` `` — `filename` is the sanitized but
otherwise original client-supplied name. Traversal is blocked, though by the allow-list
substitution at `:64` (which removes `/`) rather than the single-pass `..` strip at `:61`;
and the key is namespaced under the owning `userId`, so this is not an IDOR or LFI vector.
**Impact:** The original filename — which can itself carry PII
(`Lebenslauf_Max_Mustermann_1990.pdf`) — persists indefinitely in the storage key and any
URL derived from it, visible to anyone with storage-listing or log access. Narrow
secondary issue: the key has **no random component**, so the same user uploading the same
filename within the same millisecond silently overwrites.
**Remediation:** Use `crypto.randomUUID()` for the key component and keep the original
name only in the `fileName` field already present on `UploadResponseDto`
(`uploads.service.ts:46`). Incidentally closes the collision edge. Note this changes the
key format, and `job-postings.service.ts:183` derives the file extension from the key —
so the extension must be preserved or that call site updated.

### F10 — No compromised-password check (Low)
**Location:** `apps/api/src/auth/dto/index.ts:45-47` (registration); `auth.service.ts:551`
(password change), `:819` (password reset).
**Detail:** Strength is enforced, but nothing checks the chosen password against known
breach corpora.
**Impact:** A user can pick a password that satisfies the regex but appears in public
breach lists, leaving them exposed to credential stuffing — which F16 currently does
little to slow.
**Remediation:** HIBP Pwned-Passwords k-anonymity range query (no plaintext leaves the
server), fail-open if the API is unreachable so an outage can't block signups.

## 5. Resolved since the 2026-07-03 audit

All four re-verified directly against current code.

### F1 — SSRF via user-supplied job-posting URL — **FIXED**
Both fetch paths call `assertUrlIsPublic()` / `resolveAndAssertPublic()` before network
I/O: `url.parser.ts` (axios path, with manual per-hop redirect revalidation in
`fetchWithSsrfGuard`) and `agent-url.parser.ts` (Playwright path, re-applied inside the
`page.route('**/*')` interceptor). See §3 of `SECURITY_AUDIT_2026-07-03.md` for the
original data flow. Residual gaps in the Playwright path remain as F14/F15.

### F2 — IDOR + path traversal on file-parse storage key — **FIXED**
`job-postings.service.ts:160-173` rejects decoded keys containing `..`, a leading `/` or
`\`, a NUL byte, or lacking the `${userId}/` prefix.

### F3 — `exp.description` rendered as HTML without sanitization — **FIXED**
`apps/web/src/app/(dashboard)/profile/page.tsx:1355` wraps in `sanitizeHtml()`.

### F7 — Non-constant-time `clientState` comparison — **FIXED**
`mailbox-sync.orchestrator.ts:314-325` uses `crypto.timingSafeEqual` with a length
short-circuit (safe — length is not the secret).

### Not yet addressed (carried forward)

- **F4** (vulnerable dependencies) — superseded by §7; the flagged packages have changed.
- **F5** (web CSP `unsafe-inline`/`unsafe-eval`) — still present and **demonstrably
  deliberate**: `apps/web/src/middleware.ts:86-105` records that a prior removal broke
  Next.js's inline hydration bootstrap in production. Accepted risk. Low, unchanged.
- **F6** (refresh-token rotation without replay detection) — unchanged; accepted per
  `REFRESH_TOKENS.md`'s own TODO list.
- **F8** (length-only prompt guardrail) — unchanged; not re-audited in depth this round.

## 6. Reproduction

### IDOR — cross-user application mutation

```bash
# The local test DB had 21 unapplied migrations; bring it current first.
cd apps/api
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smartapply_test" \
  npx prisma migrate deploy

NODE_ENV=test npx vitest run test/e2e/security/application-ownership.e2e-spec.ts
```

**Result: 5/5 passing.** Two users are registered over real HTTP; user B gets `404` on
`PATCH /applications/:id/status`, `/title` and `/target-job-title` against user A's
application; user A gets `200` on `/status`; the row is confirmed unmutated after the
rejected request.

**Coverage limit, stated plainly:** this exercises one model (`Application`) and three
routes. It is not evidence for tenant isolation across the other 30 models — and F17
documents two places where that broader claim does not hold.

### Mass assignment

```bash
# No client-controlled object is spread into a Prisma call:
grep -rnE '\.\.\.(dto|body|input|payload|req\.body|[a-zA-Z]*Dto)\b' apps/api/src --include='*.ts'
#   mailbox-connection.controller.ts:183  -> JSON.stringify for an HMAC state blob
#   pdf-v2/template-data.ts:186           -> PDF template data
#   applications/generation.service.ts:604,611 -> spreads `applicationData`,
#                                            a server-built literal (:580-597)
grep -n "whitelist" apps/api/src/main.ts
#   247:      whitelist: true,
```

Unknown properties are stripped globally by `ValidationPipe` before reaching a controller,
and no client-controlled object reaches a Prisma `data:`. **Caveat:** the pipe only
engages for DTO *classes* — see F19 for an endpoint that types its body as an interface
and is therefore unvalidated.

## 7. Dependency audit (item 18)

`pnpm audit --audit-level high` → **6 High, 5 Moderate** (run twice, stable).

**The intuitive reading of the two `apps/api` paths is wrong, and both were corrected
during review.** Tracing them:

- **`pdfjs-dist` — NOT on the upload path.** Two copies are installed: `6.1.200` (the
  direct `apps/api` dependency, `apps/api/package.json:91`, which is the copy `pnpm audit`
  flags) and `5.4.296` (pinned by `pdf-parse@2.4.5`). The **resume/document upload path
  uses `pdf-parse`** (`job-postings/parsers/pdf.parser.ts:7`,
  `jobs/processors/application.processor.ts:2`), i.e. the `5.4.296` copy. The advisory's
  vulnerable range is `>=5.6.83 <6.2.108` — **5.4.296 is below the floor and not
  vulnerable**. The flagged `6.1.200` is used only by `pdf-v2/preview-renderer.service.ts`,
  which rasterises a PDF the server itself just generated from sample data, with
  `isEvalSupported: false`. No user-supplied bytes reach it.
- **`undici` — NOT on the URL-parse path.** `url.parser.ts:2-3` imports only `load` from
  cheerio (HTML parsing) and performs every HTTP request with **axios** (`:218`). Cheerio
  reaches its bundled undici only via remote-fetch entry points (`fromURL`), which are
  never called anywhere in `apps/api/src`. The dependency edge is real; the code path is
  not.

| Package | Severity | Patched | Path | Runtime-reachable? |
|---|---|---|---|---|
| `pdfjs-dist` | High | ≥6.2.108 | `apps/api` (direct) | **No** — preview renderer only, server-generated input |
| `undici` | High + 4 Moderate | ≥7.29.0 | `apps/api → cheerio` | **No** — cheerio never fetches; axios is used |
| `fast-uri` | High | ≥3.1.5 | `@nestjs/cli → ajv` | No — build-time |
| `brace-expansion` | High | ≥5.0.9 | `@nestjs/cli`, Sentry bundler | No — build-time |
| `js-yaml` | High | ≥4.3.1 | `@nestjs/cli`, eslint | No — build-time |
| `nanoid` | High | ≥3.3.18 | `sanitize-html → postcss` | No — build-time |
| `postcss` | Moderate | ≥8.5.23 | `sanitize-html → postcss`, Tailwind | No — build-time |

**So the row still fails the AC as written ("no High/Critical"), but no High advisory is
currently exploitable through application code.** That reframes this from urgent to
hygiene.

**Constraints for whoever does the bumps — read before touching `pdfjs-dist`:**
`.github/dependabot.yml:133-141` deliberately ignores it, with the note that it must match
the exact version `react-pdf` pins or the pdf.js worker and API diverge and every PDF
preview fails — *"Dependabot has broken production this way twice."* Bump it only together
with `react-pdf`, and let `pnpm --filter @applo/web run check:pdfjs` confirm the pair.
Separately, `ARCHITECTURE_SECURITY_REVIEW_2026-07-27.md` §3 already recorded
`brace-expansion` as a **deliberately accepted** alert (the patched v5 is a named-export
rewrite that breaks CJS `minimatch@3` consumers), and #712 added a `pnpm-workspace.yaml`
override for `fast-uri ^3.1.4` that this ≥3.1.5 advisory now outdates.

**Why nothing was bumped here:** every path resolves through `pnpm-lock.yaml`, outside
this PR's write fence.

## 8. Proposed sub-issues (not filed — pending approval)

Issue #752's AC asks for each finding to be a linked sub-issue. None have been created —
filing GitHub issues is outward-facing, so this list is staged for review first.

| Title | Severity | Pointer |
|---|---|---|
| Fix rate-limit key (forged `CF-Connecting-IP`), dead per-user bucketing, unwired `translation` bucket | High | §4 F16 |
| Enable GitHub secret scanning + push protection | High (AC blocker) | §2 row 18, §9 |
| Remove the LLM probe from public `/health`; narrow the throttler exemption | Medium-High | §4 F18 |
| Close leaked pages/contexts in the agent URL parser | Medium-High | §4 F12 |
| Block WebSocket SSRF in the agent URL parser (`page.routeWebSocket`) | Medium-High | §4 F14 |
| Scope `analyzeMatch` and `GET /jobs/:id/status` by `userId` | Medium | §4 F17 |
| Cap and validate the Graph webhook body (DTO class + `@ArrayMaxSize`) | Medium | §4 F19 |
| Account-deletion hook + retention sweep for `llm_usage_events`; fix the "Anonymous" label | Medium | §4 F11 |
| Re-enable the Chromium sandbox, or bound the browser by parse count | Medium | §4 F13 |
| Mitigate DNS-rebinding TOCTOU on the SSRF guard | Medium | §4 F15 |
| HIBP-style compromised-password check at signup/password-change | Low | §4 F10 |
| UUID upload storage keys | Low | §4 F9 |
| Dependency hygiene: `pdfjs-dist` (**with `react-pdf`**), `undici`, and the build-toolchain set | Low (none runtime-reachable) | §7 |

## 9. Operator actions (cannot be done from this branch)

1. **Enable secret scanning + push protection** — Settings → Code security. Verified
   currently `disabled` via `gh api repos/Smart-Apply/applo -q '.security_and_analysis'`.
   Required by issue #752's ACs. Dependabot security updates are already `enabled`.
2. **Key rotation** — cannot be verified from the repo. History contains no plaintext
   secrets in `apps/api/.env.test` (checked at `e994693f`: placeholders only), but the
   `.env.production.template` blob was not retrievable from any reachable ref, so its
   historical contents are unverified.
3. **Confirm the live `CORS_ORIGINS` and `COOKIE_DOMAIN` Fly secrets** are not wildcarded
   (row 12 verifies the code, not the value).
4. **Confirm the real rate-limit env values** — the committed defaults
   (`RATE_LIMIT_MAX=5000`) are dev-shaped. Note this only matters once F16 is fixed;
   until then the limits are bypassable regardless of their values.
5. **`apps/web` items** — the `KpiCard` un-sanitized sink hardening (row 8) and the CSP
   posture (§5 F5) belong to the web app, which another agent owns.

## 10. Not covered

No dynamic/DAST testing, no penetration testing, no traffic to any production or staging
host, no exploitation beyond the local e2e IDOR reproduction (local-only Postgres,
throwaway accounts), no credential use. Production infra (Fly machines, Cloudflare Worker
runtime, R2 bucket policy) reviewed only as represented in committed IaC/config.
`apps/web` was read for the checklist items that name it but not modified. F16, F18 and
F19 were identified by code reading and are rated on that basis — none was exercised
against a running server.

**Ruled out (re-confirmed, not re-litigated):** `AdminGuard` fail-closed behaviour,
`TokenCipher` AES-256-GCM construction, resume/cover-letter preview `sanitizeHtml`
wrapping. CSRF `getSessionIdentifier` returns a constant (`main.ts:185`), which is sound
here for a reason worth writing down rather than carrying forward: `cookieName:
'__Host-csrf'` (`main.ts:189`) blocks the cookie-tossing attack a non-session-bound
double-submit token would otherwise permit from a sibling subdomain.

**False leads recorded so they aren't rediscovered:** (a) three controllers (`sessions`,
`two-factor`, `user-preferences`) look unguarded when grepping for `JwtAuthGuard` — all
three use `AuthGuard('jwt')` directly and are protected; `JwtAuthGuard` only adds
`@Public()` support. (b) `mailbox-connection.controller.ts` has no class-level guard and
one genuinely unguarded route, `@Get('microsoft/callback')` (`:105`) — it is safe, using
an HMAC-signed state with a 10-minute expiry and a `timingSafeEqual` check (`:182-211`).
(c) `pdfjs-dist` and `undici` look runtime-reachable from the `pnpm audit` paths alone;
§7 shows they are not.

## 11. Remediation addendum (2026-08-13)

All 11 open findings were remediated in one change set (branch
`fix/security-audit-2026-08-13-findings`), planned in
[docs/plans/11-security-audit-remediation.md](../plans/11-security-audit-remediation.md).
Sections 1–10 above describe the **pre-fix** code and remain unmodified.

| ID | Status | What shipped | Where |
|----|--------|--------------|-------|
| F16 | **Fixed** | Tracker = verified JWT sub (real per-user bucketing) else proxy-derived `req.ip`; forged-header reads deleted; health exemption narrowed to `/live`+`/ready`; dead `translation` bucket removed; logging contradiction fixed | `custom-throttler.guard.ts` (+ unit spec), `app.module.ts` |
| F18 | **Fixed** | LLM probe removed from public `GET /health`; `GET /health/details` now `JwtAuthGuard`+`AdminGuard` with a 60s-cached probe; health routes throttle under `health-check` | `health.controller.ts`, `fly.prod.toml` comment |
| F19 | **Fixed** | Body is a validated DTO class (`@ArrayMaxSize(100)`, length caps); one connection lookup + one timing-safe `clientState` check per subscription instead of per entry | `mailbox-webhook.controller.ts`, `dto/graph-webhook.dto.ts`, `mailbox-sync.orchestrator.ts` |
| F17 | **Fixed** | `analyzeMatch` scoped `{ id, userId, deletedAt: null }`; `GET /jobs/:id/status` takes the current user and 404s on payload-owner mismatch (fail closed) | `keywords.service.ts`, `jobs.controller.ts`, `jobs.service.ts` |
| F11 | **Fixed** | Header corrected to pseudonymous; `deleteEventsForActor` called from both account-deletion paths before `user.delete`; daily retention cron (`LLM_USAGE_RETENTION_DAYS`, default 90) | `llm-usage.service.ts`, `llm-usage-retention.cron.ts`, `auth.service.ts`, `admin.controller.ts`, `schema.prisma` comment |
| F12 | **Fixed** | Page owned + closed by `parseInternal` on every settled path; hard-timeout path recycles the whole browser (only reliable reaper for a wedged renderer) | `agent-url.parser.ts` |
| F13 | **Fixed** | Sandboxed launch first with loud `--no-sandbox` fallback (`AGENT_CHROMIUM_NO_SANDBOX` escape hatch); warm browser recycled after 25 parses / 15 min | `agent-url.parser.ts` |
| F14 | **Fixed** | `page.routeWebSocket('**/*', ws => ws.close())`; egress proxy additionally polices WS handshakes at connect time | `agent-url.parser.ts`, `ssrf-egress-proxy.ts` |
| F15 | **Fixed** | Loopback egress proxy resolves + validates + dials every browser connection itself (no second lookup to rebind); axios path pins DNS to the vetted addresses per hop | `ssrf-egress-proxy.ts` (+ unit spec), `agent-url.parser.ts`, `url.parser.ts` |
| F9 | **Fixed** | Storage key = `userId/timestamp-UUID.ext`; original name only in the `fileName` response field; same-millisecond collision closed | `uploads.service.ts` (+ unit spec) |
| F10 | **Fixed** | HIBP Pwned-Passwords k-anonymity check (fail-open, `PWNED_PASSWORD_CHECK_ENABLED`) on register/change/reset; `PASSWORD_COMPROMISED` error code localized in all six web locales | `pwned-password.service.ts` (+ unit spec), `auth.service.ts`, `error-codes.ts`, `apps/web/src/lib/error-messages.ts` |

Still open from §8/§9, deliberately not in this change set:

- **Secret scanning + push protection** — repo-settings toggle (§9.1); attempted via
  `gh api` alongside this change set, result recorded in the PR.
- **Dependency hygiene (§7)** — separate PR per the one-PR-per-concern rule and the
  `pdfjs-dist`/`react-pdf` pairing constraint; no High advisory is runtime-reachable.
- **`apps/web` items** — `KpiCard` sink hardening and CSP posture (§9.5), owned by the
  web agent.
- **Prior-audit carry-overs** F5, F6, F8 — unchanged, accepted/tracked as before.
