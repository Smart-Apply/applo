# Plan 11 — Remediate the open findings of SECURITY_AUDIT_2026-08-13

> **Created:** 13 Aug 2026 · **Issue:** #752 (audit sub-issues staged in the audit's §8)
> · **Scope:** all 11 open findings (F9–F19) from
> [docs/security/SECURITY_AUDIT_2026-08-13.md](../security/SECURITY_AUDIT_2026-08-13.md),
> all in `apps/api`. Every "current state" claim below was re-verified against the
> code on `main` (commit `6ff1533f`) before writing, not read from the audit.
>
> **Deliberately out of scope, and why:**
> - **Dependency bumps (§7)** — separate PR. "One PR per concern" +
>   `pdfjs-dist`/`react-pdf` pairing needs its own hand-tested change; the audit
>   confirms no High advisory is runtime-reachable, so it is hygiene, not urgent.
> - **`apps/web` items** (KpiCard sink, CSP posture) — owned by the web agent per
>   the audit's §9.5.
> - **Secret scanning + push protection** — a repo-settings toggle, not a code
>   change; attempted via `gh api` alongside this plan and reported either way.

---

## F16 (High) — Rate limiting bypassable; per-user bucketing dead; `translation` bucket unwired

**Verified current state:** `custom-throttler.guard.ts#getTracker` prefers the raw
`CF-Connecting-IP` / `X-Forwarded-For` request headers over `req.ip`, although
`main.ts:66` already sets `app.set('trust proxy', 1)` — so any client picks its own
bucket by setting one header. The `user:` branch keys off `req.user?.userId`, which
never exists (`validateUser` selects `id`) and could never be populated anyway: the
guard is a global `APP_GUARD` and runs before every per-controller auth guard.
`app.module.ts:97-101` defines a `translation` throttler that no route references —
translation-on-export runs under the `llm-actions` bucket on `POST /applications/:id/export`.
`canActivate` exempts every URL under `/api/v1/health`.

**Fix:**
1. `getTracker` returns, in order: `user:<sub>` from a **verified** JWT (the
   `access_token` cookie or Bearer header, verified with the same secret the auth
   stack uses — `JwtService` is resolvable because `AuthModule` exports `JwtModule`
   and `AppModule` imports `AuthModule`), else `req.ip` (correct under the existing
   `trust proxy` policy), else `'unknown'`. The forged-header reads are deleted.
   Verification failure of any kind falls through to IP — never a 500.
2. This makes per-user bucketing real for authenticated traffic (a NAT'd office
   no longer shares one LLM budget) while unauthenticated traffic is keyed by an
   IP the client cannot choose. Rotating `CF-Connecting-IP` no longer defeats
   `auth` (5/15 min) or `email` (3/h).
3. Delete the `translation` throttler entry with a comment pointing at
   `llm-actions` (wiring it instead would double-throttle a bucket no route asks
   for — the export route already carries `@UseThrottler('llm-actions')`).
4. Narrow the health exemption to exactly `/api/v1/health/live` and
   `/api/v1/health/ready` (query string ignored) — these must stay independent of
   throttler storage so a Fly health probe can never fail because Upstash is down.
   The rest of `/health/*` now throttles under the existing `health-check` bucket
   (600/min) — see F18.
5. Fix the self-contradictory violation logging (`user?.userId` vs `user?.id`) by
   deriving the user id from the tracker.

**Acceptance:** unit spec `custom-throttler.guard.unit.spec.ts` passes: forged
`CF-Connecting-IP`/`X-Forwarded-For` do not change the tracker; a valid JWT yields
`user:<sub>`; a garbage/expired JWT falls back to `req.ip`. `grep -rn "'translation'" apps/api/src`
returns nothing.

## F18 (Medium-High) — Public, throttle-exempt `/health` triggers a real Azure OpenAI call

**Verified current state:** `GET /health` (and `/health/details`) are `@Public()`,
class-level `@SkipThrottle()`, URL-exempted in the guard, and both invoke
`llmService.healthCheck()` → a real Azure chat-completions POST. `fly.prod.toml`
already records the incident this caused; its checks use `/health/ready`.

**Fix:** remove the LLM indicator from the anonymous `GET /health` aggregate
(database/storage/queue/templates stay). Gate `GET /health/details` behind
`JwtAuthGuard + AdminGuard` (the admin allow-list is fail-closed) — it keeps the
LLM probe and the raw dependency error strings, which anonymous callers can no
longer read. Wrap the LLM probe in a 60s in-process cache so even admin polling
cannot burn Azure TPM. Remove `@SkipThrottle()`; class-level
`@UseThrottler('health-check')` applies the 600/min bucket to `/health` and
`/health/details`; `/live` + `/ready` stay guard-exempt (F16.4). Update the
`fly.prod.toml` comment that still points humans at anonymous `/health/details`.

**Acceptance:** `GET /api/v1/health` response contains no `llm` key and issues no
Azure call (no `llmService.healthCheck` reference left in the public aggregate);
`GET /api/v1/health/details` without an admin JWT → 401/403.

## F19 (Medium) — Graph webhook body unvalidated and unbounded

**Verified current state:** `@Body() body: GraphWebhookBody | undefined` — an
interface plus a union, so the global `ValidationPipe` sees metatype `Object` and
skips entirely. No array cap. The orchestrator does one
`findBySubscriptionId` DB read **per entry** before any secret check.

**Fix:** DTO classes (`GraphWebhookBodyDto` / `GraphChangeNotificationDto`) with
`@ValidateNested({ each: true })`, `@ArrayMaxSize(100)`, and length caps
(subscriptionId ≤64, clientState ≤256, resource ≤2048). `value` stays optional so
the empty-body validation handshake still passes the pipe. The controller groups
notifications by `(subscriptionId, clientState)`; the orchestrator gains
`processMicrosoftNotifications(subscriptionId, clientState, resources[])` that
resolves the connection **once**, checks `clientState` **once** (timing-safe, as
today), then processes messages sequentially. Graph's contract is unchanged: 202
first, work after; `@SkipThrottle()` stays (Graph retry/renewal traffic must not
depend on prod rate-limit env values) — the cap + single lookup are the defense.

**Acceptance:** a 1,000-entry body is rejected with 400 by the pipe; ≤100 entries
sharing one subscription cause exactly one `findBySubscriptionId` call
(observable in the unit spec via a mocked service); the validation handshake
(`?validationToken=x`, empty body) still echoes plain text.

## F17 (Medium) — Two cross-tenant reads

**Verified current state:** `keywords.service.ts#analyzeMatch` fetches the posting
`findUnique({ where: { id } })` — no `userId`, no `deletedAt` filter; reached via
`POST /job-postings/:id/analyze`. `GET /jobs/:id/status` takes no user at all and
`jobs.service.getJobStatus` reads `backgroundJob.findUnique({ id })`.
`BackgroundJob` has **no `userId` column**, but both publish sites store
`{ applicationId, userId, jobPostingId }` as the payload.

**Fix:** `analyzeMatch` → `findFirst({ where: { id, userId, deletedAt: null } })`,
404 on miss (matches the pattern in `applications`/`interviews`/`appointments`).
`getJobStatus(jobId, userId)` compares the payload's `userId` and returns null
(→ existing 404) on mismatch or when the payload carries none — fail closed, no
migration needed. Controller passes `@CurrentUser('id')`.

**Acceptance:** e2e-style assertion or unit spec: user B requesting user A's
posting id / job id gets 404; owner path unchanged.

## F11 (Medium) — `llm_usage_events`: no erasure, no retention, mislabelled "Anonymous"

**Verified current state:** `llm-usage.service.ts:38` header still says
"Anonymous … salted, irreversible". No deletion hook in
`AuthService.deleteAccount` (or the admin `deleteUser`); no retention sweep. The
schema comment already documents both gaps as open.

**Fix:** correct the header to pseudonymous (matching the schema comment and
`copilot-instructions.md`). Add `LlmUsageService.deleteEventsForActor(userId)`
(recomputes the HMAC with the live salt, `deleteMany` by `actorHash`) and call it
from both deletion paths **before** the `user.delete` — a failure aborts deletion
loudly rather than silently orphaning personal data. Add
`llm-usage-retention.cron.ts` (daily at 04:00, gated on `ENABLE_CRON_JOBS` like
the existing crons) deleting rows older than `LLM_USAGE_RETENTION_DAYS`
(default 90, `0` disables). Update the schema comment, env schema, `.env.example`.
Erasure limitation stated in code: rows written while the salt was unset/rotated
have an unmatchable `actorHash` — those age out via the sweep.

**Acceptance:** unit spec: `deleteEventsForActor` issues `deleteMany` with the
HMAC of the userId; account-deletion path calls it; retention cron deletes only
rows older than the cutoff. `grep -n "Anonymous" llm-usage.service.ts` → nothing.

## F12 (Medium-High) + F13 (Medium) — leaked pages/contexts; `--no-sandbox` warm browser

**Verified current state:** `parseInternal`'s work closure never closes the page
it creates via `navigateToUrl`; `extractPageContent` closes only as its final
statement after two unguarded tail calls; the 90s `Promise.race` timeout abandons
the work closure with the page open. Since #548, eviction is idle-based, so a
wedged renderer survives. Launch always passes `--no-sandbox
--disable-setuid-sandbox`; one browser process serves many users' parses.

**Fix (one coherent rework of the browser lifecycle):**
1. `parseInternal` owns the page: created after `initBrowser`, closed in an inner
   `try/finally` that runs on every non-timeout path (covers the unguarded tail
   calls). `extractPageContent` and `navigateToUrl` no longer close pages.
2. The hard-timeout path closes the **whole browser** (fire-and-forget): the
   renderer is wedged by definition, and a browser close is the only reliable
   reaper — restoring pre-#548 semantics exactly and only for the pathological
   case. Relaunch costs ~1–2s on the next parse.
3. Recycle the warm browser by **parse count (25) and absolute age (15 min)**,
   not idle time alone — bounds any residual accumulation and shrinks the
   cross-user window of a compromised renderer (F13's second remediation arm).
4. Sandbox: launch **with** the Chromium sandbox first; on launch failure, retry
   with `--no-sandbox` and log a prominent warning naming the security
   consequence. `AGENT_CHROMIUM_NO_SANDBOX=true` skips the first attempt
   (documented escape hatch; local Docker's default seccomp profile blocks
   unprivileged user namespaces — Fly machines are full VMs and are expected to
   sandbox). Fail-open is deliberate: job parsing must not go down platform-wide
   on a kernel that can't sandbox; the fallback is exactly today's behavior, now
   logged and bounded by (3).
5. Fix the stale "1GB Fly VM" comment (prod is 2GB, staging 1GB).

**Acceptance:** the existing `agent-url.parser.unit.spec.ts` still passes; a new
case asserts pages don't survive a failed extraction (page count on the warm
browser returns to 0 after an induced throw). Launch-arg selection is unit-tested
via the exported helper.

## F14 (Medium-High) + F15 (Medium) — WebSocket SSRF bypass; DNS-rebinding TOCTOU

**Verified current state:** `page.route('**/*')` cannot intercept WebSocket
handshakes (Playwright ships `routeWebSocket` for exactly that; present in
`playwright-core@1.62.1`). And every HTTP request the interceptor approves is
re-resolved by Chromium's own resolver — a TTL-0 attacker answers Node's lookup
with a public IP and Chromium's with a private one. The axios path
(`fetchWithSsrfGuard`) has the same two-lookup gap in miniature.

**Fix (connect-time enforcement, compatible with the warm browser):**
1. `await page.routeWebSocket('**/*', ws => ws.close())` — job postings don't
   need live sockets; kill them all (F14).
2. New `common/security/ssrf-egress-proxy.ts`: a loopback HTTP forward proxy the
   warm Chromium is launched through (`proxy: { server: 'http://127.0.0.1:<port>',
   bypass: '<-loopback>' }`). For CONNECT (https/wss) and absolute-form (http/ws)
   requests it resolves the hostname **itself** via the existing
   `resolveAndAssertPublic` and dials the validated IP directly — the browser
   never resolves DNS, so there is no second lookup to rebind (F15). Port
   allow-list {80, 443, 8080, 8443}; 10s connect timeout; bound to 127.0.0.1;
   started lazily with the browser, closed in `shutdown()` (already invoked by
   `UrlParser.onModuleDestroy`). This is the audit's "proxy that enforces the
   allow-list at connect time" option — `--host-resolver-rules` cannot work here
   because launch flags are fixed while the browser is warm.
3. The existing `page.route` interceptor stays as defense-in-depth (fast-fail,
   resource blocking, logging).
4. Axios path: `fetchWithSsrfGuard` resolves each hop once and pins the result
   via the axios `lookup` option, so the request dials the exact addresses that
   passed the check.

**Acceptance:** unit spec for the proxy: CONNECT to a loopback/private target →
403 and no upstream socket; disallowed port → 403; absolute-form GET to a private
IP → 403. Parser spec keeps passing (launch through the proxy works end-to-end in
the existing warm-browser tests).

## F9 (Low) — upload keys retain the original filename

**Fix:** `generateStorageKey` → `${userId}/${Date.now()}-${randomUUID()}${ext}`
(extension preserved from the sanitized original name — `parseFromFile` derives
the parser from the key's extension). Original filename continues to be returned
only in `fileName`. Also closes the same-millisecond overwrite edge.
**Acceptance:** unit spec: key matches
`^${userId}/\d+-[0-9a-f-]{36}\.(pdf|docx)$` and two uploads of the same file
yield distinct keys.

## F10 (Low) — no compromised-password check

**Fix:** `PwnedPasswordService` (auth module): SHA-1 → HIBP range API
(`GET https://api.pwnedpasswords.com/range/<5-char prefix>`, `Add-Padding: true`)
— k-anonymity, the password never leaves the server. 2.5s timeout, **fail-open**
on any error (an HIBP outage must not block signups), disable switch
`PWNED_PASSWORD_CHECK_ENABLED=false`. Enforced in `register`, `changePassword`,
`resetPassword` after the existing strength checks. New
`ErrorCode.PASSWORD_COMPROMISED` with the German server message plus entries in
`apps/web/src/lib/error-messages.ts` for all six locales. The auth unit specs
gain the new provider mock (they build `AuthService` via `TestingModule`).
**Acceptance:** unit spec with mocked fetch: breached suffix → rejection with
`PASSWORD_COMPROMISED`; network error → allowed; disabled flag → no fetch.

---

## Verification (whole plan)

- `pnpm --filter @applo/api lint` → 0 errors, 0 warnings
- `pnpm --filter @applo/api build` (tsc via nest) → exit 0
- `pnpm --filter @applo/api test:unit` → new specs pass; pre-existing failures
  unchanged (unit suite is `continue-on-error` in CI; don't regress it further)
- `test/e2e/security/application-ownership.e2e-spec.ts` against local Postgres →
  still 5/5 (guards the F17 edit didn't break the ownership pattern)
- Doc-sync: README + ARCHITECTURE + copilot-instructions + `.env.example`
  updated in the same change set; audit doc gets a remediation addendum.

## Landmines that apply here (from the repo rules)

- CSRF `getSessionIdentifier` must stay constant — the throttler change must not
  touch it.
- The throttler guard change must keep `CaptchaGuard` ordering (registration
  order in `app.module.ts` providers).
- No new envs without `.env.example` + env-schema + copilot-instructions rows.
- `whitelist: true` is global; the new webhook DTO must include **every** field
  the orchestrator reads, or they'd be stripped.
- Schema comment edits are migration-free; anything structural would not be.
