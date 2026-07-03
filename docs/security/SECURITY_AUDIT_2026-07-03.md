# Security Audit — Applo (smart-apply) — 2026-07-03

Read-only static audit. No code modified, no live/dynamic testing, no traffic sent to prod. Scope: `apps/api/**`, `apps/web/**`, `packages/shared/**`, Prisma schema/migrations, infra/IaC, workflows, `.env.example` files, and dependency manifests.

## 1. Executive summary

Overall posture is **strong**. The auth core is well-built: constant CSRF `getSessionIdentifier` (`'smart-apply'`), argon2id password + refresh-token hashing, AES-256-GCM token cipher with per-call random IV and auth-tag verification, HttpOnly/Secure/SameSite=Lax cookies with matching clear-domains, AdminGuard that fails closed on empty `ADMIN_EMAILS`, SHA-256 hashed one-time password-reset/verify tokens with expiry, and signature-verified QStash + Graph webhooks. Ownership scoping is consistently applied across applications, job-postings, interviews, validation, sessions, and mailbox connections. No `$queryRawUnsafe`, no committed secrets, gitignore correctly covers `.env`, `*-secrets.env`, and `invite-codes-*.json`.

Two real gaps stand out: **SSRF on the job-posting URL fetch** and an **IDOR/path-traversal on the file-parse path**. One stored-XSS regression violates the repo's own `sanitizeHtml` convention.

Counts by severity: **High 2, Medium 2, Low 2, Info 2** (plus dependency CVEs).

**Top 5 risks**
1. SSRF via user-supplied job-posting URL (no allow-list, no metadata/link-local block, follows redirects) — both the axios and Playwright fetch paths.
2. IDOR + path traversal in `parseFromFile` — user-controlled base64 storage key downloaded with no ownership or path check.
3. Stored/self XSS: `profile/page.tsx` renders `exp.description` via `dangerouslySetInnerHTML` **without** `sanitizeHtml`, and the web CSP allows `'unsafe-inline'` so it isn't mitigated.
4. Dependency CVEs reachable in prod: Multer DoS, undici TLS-cert-validation bypass, form-data CRLF.
5. Insecure LLM output handling / prompt-injection surface (LLM01/LLM02), amplified by #3.

## 2. Findings table

| ID | Severity | OWASP | Title | Location | Confidence |
|----|----------|-------|-------|----------|------------|
| F1 | High | A10 (SSRF) / LLM06 | Unvalidated user URL fetched server-side | `apps/api/src/job-postings/parsers/url.parser.ts:190`; `agents/agent-url.parser.ts:183` | Confirmed |
| F2 | High | A01 (BOLA) | IDOR + path traversal on file-parse storage key | `apps/api/src/job-postings/job-postings.service.ts:131-137` | Confirmed |
| F3 | Medium | A03 / LLM02 | `exp.description` rendered as HTML without `sanitizeHtml` | `apps/web/src/app/(dashboard)/profile/page.tsx:1208` | Confirmed |
| F4 | Medium | A06 | Known-vuln dependencies (Multer/undici/form-data) | `pnpm-lock.yaml` | Confirmed |
| F5 | Low | A05 | Web CSP allows `'unsafe-inline'` + `'unsafe-eval'` in `script-src` | `apps/web/src/middleware.ts:90` | Confirmed |
| F6 | Low | A07 | No refresh-token replay/theft detection (rotation only) | `apps/api/src/auth/auth.service.ts:389-465` | Confirmed |
| F7 | Info | A02 | Non-constant-time `clientState` comparison | `apps/api/src/mailbox-sync/mailbox-sync.orchestrator.ts:64` | Confirmed |
| F8 | Info | LLM01 | Prompt guardrail is length-only (no injection filtering) | `apps/api/src/common/guardrails/prompt-guardrail.ts` | Confirmed |

## 3. Per-finding detail

### F1 — SSRF via user-supplied job-posting URL (High)
**Location:** `apps/api/src/job-postings/parsers/url.parser.ts:190` (`axios.get(url, { maxRedirects: 5 })`) and `apps/api/src/job-postings/agents/agent-url.parser.ts:183` (Playwright `navigateToUrl`).
**Data flow:** `POST /api/v1/job-postings/parse` → `ParseJobPostingDto.url` (validated only by `@IsUrl()`) → `JobPostingsService.parseJobPosting` (`job-postings.service.ts:47-49`) → `UrlParser.parse` → `axios.get`/Playwright `page.goto`.
**Why the DTO doesn't stop it:** `@IsUrl()` (validator.js default) accepts raw IP hosts, so `http://169.254.169.254/latest/meta-data/…`, `http://192.168.x.x`, `http://[::1]`, and internal hostnames all pass. `localhost` (no TLD) is rejected, but IP-literal and internal-DNS targets are not. `maxRedirects: 5` means even an allowed public URL can 302-redirect into the metadata endpoint.
**Impact:** Read cloud metadata / internal services, port-scan the Fly private network, hit `169.254.169.254`. The scraped body is returned to the user and fed to the LLM, so responses are exfiltrated (blind-SSRF becomes readable-SSRF). Rated High rather than Critical because the app runs on Fly.io (no AWS IMDSv1 by default) — verify what `169.254.169.254` exposes in your infra.
**Exploit scenario (reasoning only):** Authenticated user submits `url: "http://internal-service.flycast/…"` or a public URL that redirects to link-local; the parser fetches it and the content lands in the job posting the user can read.
**Remediation (Applo-idiomatic):** Add an SSRF guard before both fetches — resolve the hostname, reject non-`http(s)` schemes, reject private/loopback/link-local/ULA/metadata ranges (`10/8`, `172.16/12`, `192.168/16`, `127/8`, `169.254/16`, `::1`, `fc00::/7`, `fe80::/10`), and **re-validate on every redirect hop** (set `maxRedirects: 0` and follow manually, or use a pinned-IP agent). Apply the same check inside the Playwright `navigateToUrl`. Consider an outbound-domain allow-list for known job boards since `DYNAMIC_SITES` already enumerates the majors.

### F2 — IDOR + path traversal on file-parse storage key (High)
**Location:** `apps/api/src/job-postings/job-postings.service.ts:131-148` (`parseFromFile`), reached from `parseJobPosting` (`:65-67`).
**Data flow:** `POST /job-postings/parse` → `ParseJobPostingDto.fileId` (`@IsString()` only) → `Buffer.from(fileId, 'base64').toString('utf-8')` → `storageService.download(storageKey)`.
**Issue:** The upload flow mints IDs as `base64(userId/timestamp-filename)` (`uploads.service.ts:94-102`), but `parseFromFile` decodes an **arbitrary** attacker-supplied base64 and downloads it with **no check that the key is prefixed with the caller's `userId`** and **no path-traversal check**. On the disk provider, `download` does `path.join(this.storagePath, key)` (`disk.provider.ts:33-35`) — a `fileId` decoding to `../../etc/passwd` reads off-namespace files (LFI). On R2 it's an IDOR: any user's object is readable if the key is known/guessed (keys are `userId/timestamp-filename`, semi-predictable).
**Impact:** Cross-user document read (R2) or arbitrary local file read (disk/self-host). The file contents are returned as the parsed job posting.
**Exploit scenario:** Attacker crafts `fileId = base64("../../../proc/self/environ")` (disk) or `base64("<victimUserId>/<ts>-cv.pdf")` (R2) and reads it back through the created job posting.
**Remediation:** In `parseFromFile`, after decoding, assert `storageKey.startsWith(\`${userId}/\`)` and reject any key containing `..` or a leading `/`. Better: stop treating the opaque ID as a filesystem key — persist uploads in a DB row keyed by `(id, userId)` and look up the storage key by owned record (the DTO comment on `uploads.service.ts:100-101` already flags this as the intended design). Add a normalization/`realpath` containment check in `DiskStorageProvider.download`.

### F3 — `exp.description` rendered as HTML without sanitization (Medium)
**Location:** `apps/web/src/app/(dashboard)/profile/page.tsx:1208` — `dangerouslySetInnerHTML={{ __html: exp.description }}`.
**Data flow:** Profile experience description (user-entered and/or **LLM-generated from an uploaded CV** via the resume parser) → rendered raw. Every other rich-text sink in the app wraps with `sanitizeHtml()` (`resume-preview.tsx:40/82/111`, `cover-letter-preview.tsx:24`); this one does not.
**Not mitigated by CSP:** the web CSP (`middleware.ts:90`) sets `script-src 'self' 'unsafe-inline' 'unsafe-eval'`, so injected inline handlers (`<img onerror=…>`) and inline `<script>` execute.
**Impact:** Stored self-XSS. Because the description can be populated from LLM output parsed out of an uploaded document, a user can be XSS'd by content in a document they parse (LLM02 insecure output handling). No cross-user profile view exists today, which caps this at Medium.
**Remediation:** Wrap with the existing helper: `dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }}` (`apps/web/src/lib/sanitize.ts`). See `docs/security/XSS_PROTECTION.md`.

### F4 — Known-vulnerable dependencies (Medium)
`pnpm audit`: **6 high** / 7 moderate / 2 low. Reachable ones worth prioritizing:
- **Multer — DoS via deeply nested/malformed multipart** — directly on the upload path (`uploads.controller.ts` `FileInterceptor`).
- **undici — TLS certificate validation bypass** and **cross-origin routing via SOCKS5 pool reuse** — pulled via `cheerio` on the SSRF fetch path; compounds F1.
- **form-data — CRLF injection**, **picomatch — ReDoS** (build-time).
**Remediation:** Bump `undici`→≥7.28.0 and `multer` to the patched release; the rest are Dependabot-managed minor bumps. Surfaced here because two intersect live request paths.

### F5 — Web CSP permits `'unsafe-inline'`/`'unsafe-eval'` (Low)
`apps/web/src/middleware.ts:90`. Weakens defense-in-depth and is what lets F3 execute. The API-side CSP (`main.ts:84-86`) is correctly `'self'`-only in prod. **Remediation:** move to nonce-based `script-src` for the Next app; at minimum drop `'unsafe-eval'`. Tracked against `docs/security/CSP_BACKEND.md` (which covers the API, not the worker — note the gap).

### F6 — Refresh-token rotation without replay detection (Low)
`auth.service.ts:389-465` rotates correctly (matched token revoked, new pair issued) but does **not** treat presentation of an already-rotated/revoked token as theft (no token-family revocation). A replayed old token just 401s. This is consistent with `docs/security/REFRESH_TOKENS.md` (line 370 lists "suspicious refresh pattern detection" as a **future TODO**), so it's an accepted gap, not a regression. **Remediation (optional hardening):** on a refresh attempt whose token hashes to a **revoked** row, revoke all sessions/tokens for that user and alert.

### F7 — Non-constant-time `clientState` compare (Info)
`mailbox-sync.orchestrator.ts:64` uses `!==` on the per-connection webhook secret. Remote network timing side-channels on a string compare are impractical, but for consistency use `crypto.timingSafeEqual`. Low value; noted for completeness.

### F8 — Length-only prompt guardrail (Info, LLM01)
`prompt-guardrail.ts` enforces char/token caps only — no content-level injection filtering. Untrusted CV/job/email text flows into prompts (`email-classifier.service.ts`, interview flows). Worst realistic case is a manipulated application-status label on the user's *own* data (classifier gates on a confidence threshold and only acts ≥ `MIN_CONFIDENCE_FOR_STATUS_CHANGE`). Treat as inherent LLM risk; the real amplifier is the XSS sink in F3 (sanitize LLM HTML output before render).

## 4. Quick wins & manual-verify

**Quick wins (low effort, high impact)**
- F3: one-line `sanitizeHtml()` wrap at `profile/page.tsx:1208`.
- F2: add `storageKey.startsWith(\`${userId}/\`)` + `..` reject in `parseFromFile`.
- F4: `pnpm up undici multer` to patched versions.
- F1: drop-in `isPrivateAddress()` guard + `maxRedirects: 0` with manual per-hop revalidation.

**Verify manually**
- What `http://169.254.169.254` and `*.flycast` actually expose on your Fly network (sets F1's true severity).
- Whether any current/planned view renders another user's profile `exp.description` (would raise F3 to High).
- R2 object-key guessability / whether presigned-URL scope is namespace-bound (`r2-storage.provider.ts:122`) — generator read but not exercised.
- Confirm `CORS_ORIGINS` / `COOKIE_DOMAIN` Fly secrets in prod aren't wildcarded (operator-set, not in code).

## 5. Not covered
No dynamic/DAST testing, no pen-testing, no traffic to `api.smart-apply.io` / `smart-apply.io`, no exploitation, no credential use, no third-party/outbound calls. Prod infra (Fly machines, Cloudflare Worker runtime, R2 bucket policy, nginx real-IP config) reviewed only as represented in committed IaC/config — not against the live environment. `pnpm audit` reflects the current lockfile only.

**Ruled-out false positives:** `metric-tip.tsx` and `faq` `jsonLd` `dangerouslySetInnerHTML` (developer-controlled static content); resume/cover-letter previews (correctly `sanitizeHtml`-wrapped); CSRF `getSessionIdentifier` (correct constant); AdminGuard (fails closed); `TokenCipher` (correct GCM/IV/tag); QStash + Graph webhooks (signature/clientState verified); voice provider (standing Azure key never sent to browser); ownership scoping on applications/interviews/validation/sessions/mailbox.
