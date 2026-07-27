# Architecture & Security Review — Remediation Record — 2026-07-27

Follow-up to the [2026-07-03 security audit](../security/SECURITY_AUDIT_2026-07-03.md). A combined architecture + security review of the monorepo (parallel read-only exploration of `apps/api`, `apps/web`, `packages/shared`, infra, and CI) produced a prioritized backlog; this document records what shipped, what was found along the way, the verdicts on suspected problems that turned out **not** to be problems, and the open follow-ups.

Everything below merged to `main` on 2026-07-27 (releases v4.11.1 → v4.11.2). One PR per concern, per repo convention.

## 1. Shipped changes

| PR | Type | Change |
|----|------|--------|
| [#710](https://github.com/Smart-Apply/applo/pull/710) | fix | Swagger UI (`/docs`) no longer mounted when `NODE_ENV=production`; `POST /profile/photo` moved onto a new `uploads` throttler bucket (20/h) |
| [#711](https://github.com/Smart-Apply/applo/pull/711) | fix | All LLM-backed application endpoints throttled via new `llm-actions` bucket (30/15 min); `POST /:id/regenerate-single-pipeline` now metered (`@CheckUsage` + post-success `recordUsage`) — it was previously uncapped **and** free. `POST /:id/cover-letter` deliberately exempt (doubles as the editor autosave) |
| [#712](https://github.com/Smart-Apply/applo/pull/712) | fix | Dependabot transitive overrides in `pnpm-workspace.yaml`: `fast-uri ^3.1.4`, `next>sharp ^0.35.2`, `node-jose>uuid ^11.1.1` (alerts 4 → 1) |
| [#713](https://github.com/Smart-Apply/applo/pull/713) | chore | `jobs.controller.ts` reads the jobs driver via `ConfigService` instead of raw `process.env` |
| [#714](https://github.com/Smart-Apply/applo/pull/714) | fix | Generation progress persisted to `Application.generationProgress`/`generationMessage` (migration `20260727095147`) so SSE serves correct progress from **either** prod machine — the old in-process callback `Map` only worked when the SSE stream and the pipeline landed on the same Fly machine. Monotonic `lt`-guarded writes; export processor emits real milestones. Details: [SSE_IMPLEMENTATION.md](./SSE_IMPLEMENTATION.md), [PROGRESS_INDICATOR.md](../features/PROGRESS_INDICATOR.md) |
| [#716](https://github.com/Smart-Apply/applo/pull/716) | fix | **IDOR**: `generateWithSinglePipeline` loaded the application by id **without `userId` scoping** — `POST /applications/:id/regenerate-single-pipeline` could reset, overwrite, and read back another user's application; both create paths loaded the job posting unscoped (foreign posting content readable via the response include). All three now ownership-scoped `findFirst`; the ownership check runs **before** any write |
| [#717](https://github.com/Smart-Apply/applo/pull/717) | refactor | **`GenerationService` extracted** from the 4,010-line `ApplicationsService` god service (first cut of the split): create paths + the entire LLM pass pipeline (2,144 lines) move; CRUD/export/files/SSE/keyword analysis stay (1,799 lines). Shared helpers became pure utils (`application-response.util.ts`, `cover-letter-html.util.ts`). Pure move — reviewer confirmed byte-identical orchestrator bodies |
| [#718](https://github.com/Smart-Apply/applo/pull/718) | chore | Dead bare `THROTTLER:SKIP` metadata check removed from `CustomThrottlerGuard.canActivate` — the key is never written by `@SkipThrottle()` (verified in the installed library source); skipping always worked via the base guard's per-name keys |
| [#719](https://github.com/Smart-Apply/applo/pull/719) | chore | All 3 `forwardRef` wrappers removed — the claimed Auth↔Session cycle doesn't exist (no back-edges); boot-verified. See §3 |
| [#720](https://github.com/Smart-Apply/applo/pull/720) | refactor | Upload validation deduplicated: **4** drifted inline `ParseFilePipe` blocks → shared factories in `common/pipes/file-validation.pipe.ts`. Review-driven hardening: the **claimed** multipart mimetype no longer flows into the stored object content-type (derived known type or `application/octet-stream` — pre-empts a stored-XSS primitive). One deliberate delta: a single German du-form size message replaces three divergent strings (English / Sie-form / du-form) |

**Ops change (no PR):** `ENABLE_CSRF=true` set on staging and prod Fly secrets and verified end-to-end by probe (no-token POST → 403 `EBADCSRFTOKEN`; token pair passes through to auth). Note for future toggles: `flyctl secrets set` restarts the machine — on staging (`min_machines_running = 0`) the first request can 500 with a pg-pool connection timeout while the suspended Neon branch wakes. Transient; not an app bug.

## 2. Key findings & verdicts

### Confirmed and fixed

- **Throttler landmine** (root cause behind #710/#711): `CustomThrottlerGuard` only counts the bucket selected via the repo's custom `@UseThrottler('name')` decorator. The library's `@Throttle({ name: {...} })` metadata for **named** buckets is dead with this guard — `parse-resume`'s documented 10/h was never enforced until #710. Rule of thumb: a named bucket needs `@UseThrottler('<bucket>')` **and** a bucket entry in `app.module.ts` `throttlers[]`. Class-level `@SkipThrottle()` only skips the `default` bucket.
- **IDOR in the generation paths** (#716) — the only unscoped lookups in the service; found while mapping seams for the #717 split. A useful reminder that big refactors should start with a read of exactly the code being moved.
- **Client-controlled stored content-type** (#720 review): `FileTypeValidator` validates the *detected* (magic-byte) type; the *claimed* multipart mimetype stayed attacker-controlled and was persisted as the R2 object content-type. Fixed by deriving the stored type.
- **MAX_FILE_SIZE_MB caveat** (#720): decorator arguments evaluate at class-definition time, before dotenv/ConfigModule — the override only works as a **real process env var at boot** (Fly secrets, `MAX_FILE_SIZE_MB=5 pnpm start:dev`). A value set solely in `apps/api/.env` is never applied to the pipe.

### Investigated — not a problem (leave alone)

- **Auth↔Session "circular dependency"**: fiction. `SessionService` injects only `PrismaService`; `TwoFactorService` only Prisma/Config/AuditLogger. The dependency is strictly one-way; the `forwardRef`s (and their misleading comment) were removed in #719 and the DI graph boot-verified.
- **`TranslationModule` placement** (`applications/translation/`, consumed by `JobsModule`): audited and **correct** — it's the minimal acyclic solution to the Applications→Jobs→Translation chain. Its file comment explains why. Do not "clean this up".
- **Magic-byte validation** (retraction from the original audit): NestJS 11's `FileTypeValidator` does magic-number sniffing **by default** — resume-parser and photo uploads were already covered. The earlier "no magic-byte check" finding was wrong.
- **SSE 5s poll**: deliberate Neon-egress trade-off, not a bug. The actual cross-machine bug was the in-process progress `Map` (#714).

## 3. Current state after the batch

- **Dependabot**: one open alert — `brace-expansion` (#74, high, dev-only). Accepted: the patched v5 is a named-export rewrite that breaks CJS `minimatch@3` consumers. Revisit when the minimatch tree moves. The `sharp` override stays until `next` bumps past `^0.34.x`; the `uuid` override until `node-jose` moves.
- **Test suite (measured 2026-07-27, `npx vitest run` in `apps/api`)**: 45 files → 26 pass / 19 fail; 527 tests → 320 pass / 64 fail / 143 skipped. The failures are **drift, not rot** — predominantly mock/DI-shape decay after service refactors. Critically, **neither historical prod regression has test coverage**: the pdfjs API/worker pairing is guarded only by a build script, and the CSRF `getSessionIdentifier` stability only by an e2e that never runs in CI.
- **ApplicationsService split**: 1 of 3 cuts done (#717). `GenerationService` carries four documented *transitional publics* (`getProfileWithRelations`, `detectLanguage`, `extractJobFacts`, `runLengthGovernorPass`) that the edit-mode cover-letter regenerate still needs — they move again when `EditorService` exists.

## 4. Open follow-ups (prioritized)

1. **`ExportService` extraction** — next cut of the ApplicationsService split (`requestExport` / `regenerate` / files / `cleanupGeneratedFiles`), then **`EditorService`** (editor AI actions + `upsertCoverLetter`; absorbs the transitional publics).
2. **Test hardening trio** — (a) unit test pinning `getSessionIdentifier` to a constant across auth lifecycle contexts, (b) pdfjs API/worker version-parity unit test in `apps/web`, (c) fix the 64 DI-shape failures so CI's `unit-tests` job can drop `continue-on-error: true` and become a real gate.
3. **`LLMService` split** (scoped, not started, ~1,750 lines): keep protocol/infra (`callText`/`callJson`/parsing/token tracking/templates) in `LLMService`; extract `LLMContentService` (the five `modify*` methods + `categorizeSkills`) into the applications module; optionally `LLMUtilService` (`detectContentLanguage`, `translateSummary`). Leaf provider — no cycle risk.
4. **Monitor**: brace-expansion upstream; drop the `sharp`/`uuid` overrides when `next`/`node-jose` bump their ranges.

## 5. Conventions reinforced by this batch (for future contributors)

- Named throttler buckets require the custom `@UseThrottler` decorator — library `@Throttle({ named: ... })` does nothing under `CustomThrottlerGuard` (route-level **default**-bucket overrides do work).
- `@SkipThrottle()` handling lives entirely in the base guard (per-name `THROTTLER:SKIP<name>` metadata keys) — don't re-add a skip check to `CustomThrottlerGuard`.
- Upload validation lives in `common/pipes/file-validation.pipe.ts` — new multipart routes use `createDocumentUploadPipe()` / `createPhotoUploadPipe()`, never a hand-rolled inline pipe.
- Never persist the claimed multipart mimetype; derive the stored content-type from the validated type set.
- Stacked-PR flow with squash-merge: after the base PR merges, `git rebase --onto main <base-branch> <stacked-branch>` + force-push the feature branch **before** merging the stacked PR — otherwise the base PR's changes reappear in its diff.
