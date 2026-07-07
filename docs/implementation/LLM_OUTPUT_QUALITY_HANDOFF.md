# Hand-off — LLM Output Quality, Phases 3 & 4

> **For the next agent (fresh context).** This file is a self-contained brief to finish the
> LLM output-quality roadmap. Phases 1 & 2 are **done and committed**; this covers the
> remaining **Phase 3** and **Phase 4**, plus a few open sub-items from the earlier phases.
>
> **Read these two files FIRST, in order:**
> 1. [`docs/implementation/LLM_OUTPUT_QUALITY.md`](./LLM_OUTPUT_QUALITY.md) — the living
>    tracker (status table, per-item specs, acceptance criteria, changelog). **This is the
>    source of truth. Keep it updated on every change** (status table + changelog + tick
>    acceptance boxes).
> 2. [`.github/copilot-instructions.md`](../../.github/copilot-instructions.md) — repo
>    conventions (trunk-based git, Conventional Commits, doc-sync rule, lint policy, the
>    CSRF/`form.watch` landmines). Non-negotiable.

---

## 0. Current repo state (as of 2026-06-15)

Two **uncommitted-to-`main`** feature branches exist, both off `main`. **Do NOT build on
top of them** unless told to — they're awaiting their own PRs.

| Branch | Commits | Scope |
|---|---|---|
| `feat/llm-output-quality` | `f006416` (Phase 1), `62b3fe6` (Phase 2) | Prompts, editor pass, grounding validator, wizard UX, docs |
| `fix/shared-dual-esm-build` | `c92be15` | Unrelated build fix (CJS/ESM for `@applo/shared`) |

**Start your work on a NEW branch off `main`** (e.g. `feat/llm-eval-harness`). Branch
BEFORE editing. Never commit to `main`, never `git push origin main`.

> ⚠️ The two branches above are not yet merged. If your Phase 3/4 work depends on Phase 2
> code (the grounding validator, the v1 pipeline shape), branch off `feat/llm-output-quality`
> instead of `main` and say so in the PR — but prefer `main` if the work is independent.

---

## 1. How generation actually works (the live path)

The **live** pipeline is the v1 "single-LLM pipeline" inside
[`apps/api/src/applications/applications.service.ts`](../../apps/api/src/applications/applications.service.ts).
Two entry points run it:
- `createWithGeneration()` — **main** path (synchronous; wizard calls it). Stores resume as
  **JSON** (`resumeText`) for the editor.
- `generateWithSinglePipeline()` — secondary path behind a 🧪 test endpoint
  (`POST /applications/:id/regenerate-single-pipeline`). Uses **SSE** progress
  (`emitProgress`). Stores resume as Markdown.

Pipeline steps (both paths):
1. `v1/skill-selector.md` (`llmService.callJson`, temp 0.2) → `tailoredProfile`
2. **parallel**: `v1/cover-letter.md` (`callText`) + `v1/resume-rewrite.md` (`callJson`, temp
   0.35, via `callResumeRewrite`) + `v1/ats-keywords.md` (`callJson`) →
   `matchKeywordsAgainstProfile` (deterministic)
3. **Editor pass (#1, Phase 2):** `runCoverLetterEditorPass` → `v1/editor-cover-letter.md`
4. **Grounding check (#7, Phase 2):** `runGroundingCheck` → `GroundingValidatorService` (log-only)
5. `convertTailoredProfileToResumeJson` → persist

**LLM plumbing:** `LLMService.callJson<T>(templatePath, vars, opts)` and `callText(...)` load
a prompt from `apps/api/prompts/**`, render `{{var}}` / `{{json var}}`, call the provider
through an **opossum circuit breaker**, and (for `callJson`) parse via `parseJsonResponse`
(strips ``` fences, regex-extracts the object, repairs trailing commas). Provider chosen by
`LLM_PROVIDER` (`azure-openai` | `azure-ai-foundry` | `mock`).

> ⚠️ **`mock` provider ignores the prompt** — it returns canned text. To test prompt/quality
> changes you MUST set `LLM_PROVIDER=azure-openai` with real Azure creds in `apps/api/.env`,
> and `LOG_LLM_CALLS=true` to log each template call.

**Dead code — don't confuse with the live path:** `apps/api/src/agents/**`
(`ApplicationPipelineService`, `CVWriterAgent`, `CLWriterAgent`) is declared but never
invoked. The legacy `prompts/resume-ats.md` / `cover-letter-ats.md` (+
`generateResumeATS`/`generateCoverLetterATS`) are only used by the **edit-mode regenerate**
flow (`upsertCoverLetter`), not the create pipeline.

---

## 2. Repo guardrails you MUST follow

- **Branch off `main`**, short-lived, named `feat/…` `fix/…` `chore/…` `docs/…` `test/…`.
- **Conventional Commits** (`feat(llm): …`). One concern per PR/branch.
- **Lint policy: 0 errors AND 0 warnings on code you author.** Run
  `pnpm exec eslint <files>` from the affected workspace. No `any` (use `unknown` + guard);
  the big `applications.service.ts` already has ~67 pre-existing `any` warnings — don't add
  to them and don't be alarmed by them.
- **Doc-sync (mandatory):** items #6 and #8 change the pipeline/a provider → update
  `README.md` + `ARCHITECTURE.md` + `.github/copilot-instructions.md` in the same PR.
  #9 and #10 are lower-touch but still update the tracker.
- **Backend tests:** vitest. Unit = `*.unit.spec.ts` (`pnpm test:unit`), run a single file
  with `pnpm vitest run <pattern>`. The existing suite is partially out of sync; CI marks
  unit tests `continue-on-error`, so a clean, focused new test is enough. Prisma client:
  always `pnpm --filter @applo/api prisma:generate` (never bare `prisma generate`).
- **Frontend:** App Router, server components by default; **never** `form.watch()` (use
  `useWatch`); TanStack Query via the existing `apiClient` (no raw `fetch`); German-first,
  profession-neutral copy.
- **Profession-neutral, no fabrication** in all prompt work (nurse/CNC/sales, not just IT;
  never invent metrics/employers/dates).

---

## 3. PHASE 3 — ATS intelligence

### Item #6 — Coverage-driven keyword loop  🔴  (Med risk; pipeline change → doc-sync)

**Problem.** We extract keywords and *measure* match after the fact, but never close the
loop: high-priority keywords the profile genuinely supports can still be missing from the
generated text.

**What to build.** After generation (after the editor pass), compute coverage of
**priority-1** keywords. For any priority-1 keyword that is **missing from the output but
supported by the profile** (`matchKeywordsAgainstProfile` marks it `source: 'both'`), run
**one** targeted weave-in pass — guarded against keyword stuffing (natural density, must fit
a real sentence). **Never** weave a keyword the profile doesn't support (that's fabrication,
and would also defeat the grounding validator).

**Where.**
- Orchestration in `applications.service.ts` — add a step after `runCoverLetterEditorPass`
  in both `createWithGeneration` and `generateWithSinglePipeline`. Mirror the existing
  graceful-degradation pattern (`runCoverLetterEditorPass` is the template to copy).
- Keyword matching already exists: `matchKeywordsAgainstProfile(extractedKeywords, profile)`
  and `countMatchedKeywords` in `applications.service.ts`; keyword extraction lives in
  `apps/api/src/keywords/keywords.service.ts`.
- Likely a new prompt `apps/api/prompts/v1/keyword-weave.md` (input: draft + the specific
  missing-but-supported keywords + their profile evidence; output: minimally-edited draft).

**Acceptance (copy into tracker, tick as you go):**
- [ ] Priority-1 coverage computed post-generation.
- [ ] Single guarded weave-in pass for profile-supported gaps only; no stuffing (readability
      preserved); never adds unsupported keywords.
- [ ] Graceful degradation (failure keeps the pre-weave draft).
- [ ] Grounding validator still passes on the woven output (no new fabricated numbers).
- [ ] Unit test for the "which keywords qualify for weaving" selection logic.
- [ ] Doc-sync: README + ARCHITECTURE + copilot-instructions + tracker.

### Item #9 — Trustworthy + actionable match score  🔴  (Low risk)

**Problem.** Historically a CV agent self-reported a `matchScore` (unreliable). We already
have a **deterministic** score.

**What to build.** Make the user-facing score purely deterministic and the suggestions
specific + profession-neutral.
- The deterministic calc is `calculateMatchAnalysis(matchedKeywords, missingKeywords,
  keywords)` in `applications.service.ts` (~line 3400) → `overallScore = technicalScore`,
  with `suggestions/strengths/weaknesses` arrays (currently generic German strings).
- Surfaced via `getKeywordsAnalysis()` / `analyzeKeywords()` (service) →
  `GET /applications/:id/keywords` (Premium, `@RequiresFeature('atsOptimization')`).
- Frontend panel: [`apps/web/src/components/applications/keywords-overview.tsx`](../../apps/web/src/components/applications/keywords-overview.tsx).

**Tasks.**
- [ ] Audit for any remaining LLM-self-reported score on user surfaces; ensure only the
      deterministic `overallScore` is shown. (The dead `agents/**` CV agent had `matchScore`
      — confirm it's not surfaced. There's a `matchScore: true` Prisma select around line
      2467 to check.)
- [ ] Make suggestions specific & actionable, e.g. "Ergänze ein messbares Ergebnis in deiner
      Rolle als *Pflegedienstleitung*, um das Keyword *Qualitätsmanagement* abzudecken."
      Keep them profession-neutral (not IT-defaulted).
- [ ] Verify the web panel renders the deterministic score + new suggestions cleanly.
- [ ] Tracker update (no full doc-sync needed — no pipeline/provider change).

---

## 4. PHASE 4 — Reliability & measurement

### Item #10 — LLM-as-judge evaluation harness  🔴  (Low risk; **recommended FIRST**)

**Why first.** We just shipped Phases 1 & 2 (prompt rewrites, editor pass, grounding) but
have **no way to measure** whether output quality actually improved. Build this before/early
so Phase 3 can be scored before vs. after. It's also the only token-free-ish way to
regression-test prompt changes.

**What to build.** A standalone script set under `apps/api/scripts/eval/`:
- A **golden fixture set**: ~20–30 `(jobPosting × profile)` pairs as JSON, spanning
  professions (healthcare, manufacturing, sales, marketing, education, IT) **and** languages
  (DE + EN). Keep them small and committed.
- A **runner** that, for each fixture, executes the real generation (call the v1 prompt chain
  through `LLMService`, or invoke the pipeline service) and then scores each output with an
  **LLM-as-judge** prompt against the rubric from items #1/#3/#4/#5 (action-verb bullets,
  quantified-or-qualitative, exact job title in summary, concrete company reference, no
  clichés/Konjunktiv) **plus** a deterministic `GroundingValidatorService` pass (#7, already
  built — reuse it).
- Output: per-item rubric scores + grounding pass-rate, printed and/or written to a
  timestamped JSON. Capture a **baseline** now, re-run after each phase, record numbers in
  the tracker changelog.

**Notes / wiring.**
- Run via `ts-node`/`tsx` like the existing standalone checks (see
  `scripts/validate-react-pdf-templates.ts` referenced in copilot-instructions, and the
  pattern `npx ts-node -r tsconfig-paths/register …`). Don't add it to CI as blocking; if
  wired to CI at all, make it `continue-on-error` like the unit-tests job.
- Needs real LLM creds to run for real (judge + generation). Make it skip/mock gracefully
  when `LLM_PROVIDER=mock` so it doesn't hard-fail locally.
- The Microsoft Foundry eval tooling in the stack can host batch/continuous evals later, but
  a simple in-repo script is the right first step.

**Acceptance.**
- [ ] Golden fixture set committed (professions + DE/EN).
- [ ] Runner outputs per-item rubric scores + grounding pass-rate.
- [ ] Baseline captured and recorded in the tracker; documented how to re-run.
- [ ] README/ARCHITECTURE mention the eval harness (light touch) + tracker updated.

### Item #8 — Structured outputs instead of regex JSON repair  🔴  (Med-High risk; provider change → doc-sync)

**Problem.** `LLMService.parseJsonResponse` strips ``` fences, regex-extracts the JSON
object, repairs trailing commas, and silently falls back to degraded output on parse failure
(see `validateTailoredProfile` / `validateAtsKeywords`). Fragile.

**What to build.** Use Azure OpenAI **JSON-schema structured outputs / function calling** for
the JSON calls (`skill-selector`, `ats-keywords`, `resume-rewrite`) so responses are
schema-valid by construction. Keep the regex path as a fallback only.

**Where.**
- Provider: [`apps/api/src/llm/providers/azure-openai.provider.ts`](../../apps/api/src/llm/providers/azure-openai.provider.ts)
  — `generateText()` POSTs `{ messages, temperature, max_tokens }` to
  `…/chat/completions`. Add support for `response_format` (e.g.
  `{ type: 'json_schema', json_schema: {…} }`) when an option is passed.
- Interface: [`apps/api/src/llm/llm.interface.ts`](../../apps/api/src/llm/llm.interface.ts)
  `GenerateOptions` — add an optional `responseFormat`/`jsonSchema` field.
- `LLMService.callJson` — thread the schema through; `mock.provider.ts` must honour/ignore it
  without crashing.

**Risk / testing.** Behaviour depends on the Azure deployment + `api-version`. Test against a
real deployment AND the `mock` provider. Measure how often the silent-degradation fallback
currently triggers and confirm it drops.

**Acceptance.**
- [ ] Schema-constrained responses for the 3 JSON calls; `mock` provider unaffected.
- [ ] Fallback path retained but rarely hit (measure before/after).
- [ ] Eval harness (#10) shows no quality regression.
- [ ] Doc-sync: README + ARCHITECTURE + copilot-instructions + tracker.

---

## 5. Open sub-items carried over from Phases 1 & 2 (optional, smaller)

- **#1 resume editor pass** — only the *cover-letter* editor shipped. Add an analogous
  `editor-resume.md` (JSON→JSON) that critiques summary + achievements while **preserving
  `profileExperienceId` / `profileProjectId`** exactly (see the strict ID-preservation rules
  in `v1/resume-rewrite.md`). Same graceful-degradation pattern.
- **#2 consolidation** — delete the unused `apps/api/src/agents/**` (grep first: only
  `agents.module.ts` references it; verify no DI/tests break). Then migrate the edit-mode
  regenerate (`upsertCoverLetter`) off `cover-letter-ats.md` onto `v1/cover-letter.md` and
  delete `prompts/resume-ats.md` + `cover-letter-ats.md`. **Check `infra/Dockerfile`** for
  any `COPY` of a deleted path (known landmine — see copilot-instructions / repo memory).
- **#5 cover-letter data layer** — add an Ansprechpartner/company-facts extraction step
  feeding `v1/cover-letter.md` (more reliable than the LLM scanning `fullText`). Decide on a
  **Betreffzeile**: the `CoverLetterTemplateData` contract
  (`apps/api/src/pdf-v2/template-data.ts`) has **no `subject` field** → that's a *template*
  change, not a prompt change. Record the decision in the tracker.

---

## 6. Suggested order

1. **#10 eval harness** (capture a baseline of the current, already-improved output).
2. **#6 keyword loop** + **#9 match score** (Phase 3) — re-run eval to prove the lift.
3. **#8 structured outputs** (Phase 4) — reliability; eval guards against regressions.
4. Optional cleanups: **#2** dead-code removal, **#1** resume editor, **#5** data layer.

Each is its own branch off `main` + its own PR. Update
[`LLM_OUTPUT_QUALITY.md`](./LLM_OUTPUT_QUALITY.md) (status table + changelog + acceptance
ticks) in the same PR — treat tracker drift as a bug.

---

## 7. Quick reference — key paths

| What | Path |
|---|---|
| Living tracker (source of truth) | `docs/implementation/LLM_OUTPUT_QUALITY.md` |
| Generation orchestration | `apps/api/src/applications/applications.service.ts` |
| Live v1 prompts | `apps/api/prompts/v1/*.md` |
| Editor prompt (#1) | `apps/api/prompts/v1/editor-cover-letter.md` |
| Grounding validator (#7) | `apps/api/src/applications/grounding/grounding-validator.service.ts` |
| LLM service (callJson/callText/parse) | `apps/api/src/llm/llm.service.ts` |
| Azure provider (#8) | `apps/api/src/llm/providers/azure-openai.provider.ts` |
| Keyword extraction/match (#6/#9) | `apps/api/src/keywords/keywords.service.ts` + `matchKeywordsAgainstProfile` in the service |
| Match-analysis calc (#9) | `calculateMatchAnalysis()` in `applications.service.ts` (~L3400) |
| Web ATS panel (#9) | `apps/web/src/components/applications/keywords-overview.tsx` |
| Repo conventions | `.github/copilot-instructions.md` |

**Local run:** `docker compose -f infra/docker-compose.yml up -d db` → `pnpm dev` (api :3000,
web :3001, Swagger :3000/docs). Demo login `demo@applo.ai` / `Demo123!`.
