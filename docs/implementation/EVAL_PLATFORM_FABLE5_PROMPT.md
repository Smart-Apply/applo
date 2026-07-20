# Build Brief for Claude Fable 5 — Applo Application-Generation Evaluation Platform

> **What this file is.** A single, self-contained prompt to hand to **Claude Fable 5**
> (Anthropic's Mythos-class autonomous coding model — 1M-token context, multi-modal,
> plan→execute→verify agent loops, can visually check its own UI against design intent).
> It tells Fable 5 to build the evaluation platform tracked in **Smart-Apply/smart-apply
> issue #623** — end to end, with first-class usability and deep insight into the
> *generated content itself*.
>
> **How to use it.** Paste everything below the `─── PROMPT STARTS ───` line into Claude
> Fable 5 (Claude Code / the API with a coding harness). Give it write access to a fresh
> checkout of `Smart-Apply/smart-apply` and permission to scaffold a new sibling repo
> `applo-eval`. Fable 5 is expected to run for a long, mostly-autonomous session: plan
> first, build in milestones, write and run its own tests, and self-correct.

---

─── PROMPT STARTS ───

## 0) Who you are and how to operate

You are **Claude Fable 5**, operating as an autonomous senior full-stack + ML-eval engineer.
You are building an **internal evaluation platform** for a production AI product. This is a
long-horizon, multi-step assignment — exactly the kind of work you are best at. Operate like
a staff engineer who owns the outcome:

1. **Load context first.** Use your large context window to read the *entire* relevant surface
   of the `smart-apply` repo before writing code: the generation pipeline, the prompt
   templates, the deterministic scorers, and the existing homegrown eval harness (paths in
   §3 and the Appendix). Do not guess at signatures — they are given below and in the code.
2. **Plan, then execute in milestones.** Produce a written plan and a task DAG before coding.
   Work milestone by milestone (§8). After each milestone, **stop and verify** against its
   Definition of Done before proceeding.
3. **Verify your own work.** Write tests as you go and run them. For every deterministic
   claim ("variant X regressed grounding by 12pts"), prove it by re-reading the artifact your
   own code produced. For the UI, **use your vision capability**: take screenshots of the
   dashboard you build and critique them against the usability brief in §7, then iterate until
   they match the intent. Treat "it compiles" as necessary but not sufficient.
4. **Prefer buy-then-glue over hand-rolling a framework.** Reserve bespoke code for the two
   things that are genuinely ours: the **scorers** (reuse the product's own validators) and
   the **insights UI**. Everything else (the matrix engine, run storage) should lean on
   mature tooling (§6).
5. **Ask only when genuinely blocked.** Where this brief says "decide autonomously," pick the
   sensible default and record the decision in an ADR (`applo-eval/docs/adr/`). Only surface a
   question when a choice is irreversible, costs real money at scale, or changes the product's
   live behavior. Batch such questions.

Your definition of "perfect" for this task: a reviewer can run **one command**, get a
**trustworthy** quality/cost/latency comparison across model+prompt variants sliced by
profession and language, and — critically — **read the actual generated cover letters and
résumés** with every quality signal (fabricated numbers, AI clichés, hedging, ATS-keyword
gaps, guard fallbacks) rendered *inline on the text*, side by side against a baseline. If a
non-engineer PM can look at the report and confidently say "ship gpt-5-mini for the mechanical
calls, keep gpt-5.1-chat for the cover letter," you have succeeded.

## 1) The mission in one paragraph

Applo ("smart-apply") generates tailored job applications (a **cover letter** + a **résumé**)
by chaining ~10 LLM calls. The GPT-4.1 model we run today (`gpt-4.1-local`) is **deprecated and
retires 2026-10-14**; we must migrate to the GPT-5 family and choose the target **on evidence,
not vibes**. Build a standalone evaluation platform that runs the real generation pipeline over
a versioned dataset of `(profile, jobPosting)` fixtures across a **matrix of variants** (model
per call, reasoning effort, prompt version, params, pipeline toggles) and scores each variant on
**quality, cost, and latency** against a baseline — with reporting so usable and insightful that
the migration decision (and every future prompt/model tweak) is obvious from the report.

## 2) Background: the system under test (grounded — do not re-derive)

**Product shape.** Monorepo (`pnpm` + Turborepo). Backend `apps/api` = NestJS 11 + Prisma
(Postgres). LLM access is a pluggable provider behind `LLM_PROVIDER` (`azure-openai` |
`azure-ai-foundry` | `mock`). Azure calls go through the **v1 Foundry API**
(`{endpoint}/openai/v1/chat/completions`, deployment passed as `model` in the body). The product
is **domain-agnostic** — it must work for nurses, CNC operators, teachers, sales reps, developers,
etc. — and **German-first** (DE + EN both first-class).

**The live generation pipeline** lives in
`apps/api/src/applications/applications.service.ts` (`createWithGeneration` →
`generateWithSinglePipeline`). The `v1` prompt chain, in order:

| # | Step | Template (`apps/api/prompts/v1/`) | LLM method | Output |
|---|------|-----------------------------------|------------|--------|
| 1a | skill selection | `skill-selector.md` | `callJson` (JSON mode) | `TailoredProfileDto` |
| 1b | job facts (salutation, company specifics, asks) | `job-facts.md` | `callJson` (strict schema) | `JobFactsDto` |
| 2 | résumé rewrite | `resume-rewrite.md` | `callJson` (strict schema) | `RewrittenProfileDto` |
| 2.5 | résumé editor pass (guarded) | `editor-resume.md` | `callJson` (strict) | `RewrittenProfileDto` |
| 2.7 | résumé style-rewrite teeth (guarded) | `resume-style-rewrite.md` | `callJson` (strict) | `RewrittenProfileDto` |
| 3 | cover letter | `cover-letter.md` | `callText` | Markdown |
| 3.5 | cover-letter editor pass (guarded) | `editor-cover-letter.md` | `callText` | Markdown |
| 4 | keyword weave (guarded) | `keyword-weave.md` | `callText` | Markdown |
| 5 | cover-letter style-rewrite teeth (guarded) | `style-rewrite.md` | `callText` | Markdown |
| 6 | ATS keyword extraction | `ats-keywords.md` | `callJson` (strict) | `AtsKeywordsOutputDto` |

Several steps are **guarded**: a pass only replaces the draft if a pure guard confirms the
candidate is valid *and strictly cleaner* (else it falls back to the pre-pass draft). The guards
are `evaluateStyleRewrite`, `evaluateResumeStyleRewrite`, `isValidResumeEdit`, and length-ratio
checks. **How often each guard falls back is a free, deterministic proxy for "is this model good
enough"** — capture it as a first-class metric.

**Two system-message anchors** (`GENERATION_SYSTEM_ANCHOR`) ride on the cover-letter and
résumé-rewrite calls. A prior 24-fixture A/B proved the anchor ~halves number fabrication
(grounding pass-rate 29%→58%) while the **LLM-judge saturated at ~5.0/5** and was useless as a
discriminator. **Lesson you must internalize: lead with the deterministic scorers; treat the
LLM-judge as a tie-breaker, and prefer pairwise A/B over absolute 1–5 scores.**

**Critical gotcha — the `mock` provider cannot drive the v1 chain.** `mock.provider.ts` only
emits Markdown; the chain's first steps use `callJson` and will throw in `parseJsonResponse`.
So: real offline runs need **real Azure creds** (in `apps/api/.env`) *or* a new **v1-aware fake
provider** that returns schema-valid JSON (you will build the latter — see §4 — so CI and local
dev can exercise the full matrix deterministically and for free).

## 3) Prior art you MUST study before designing (then supersede, don't ignore)

A homegrown harness already exists at **`apps/api/scripts/eval/`** and is the seed of this
project. Read all of it:

- `run-eval.ts` — boots a Nest module (`ConfigModule` + `LLMModule`), runs the chain via
  `pipeline-runner.ts` (`generateForFixture`), scores with `judge.ts` (LLM-as-judge),
  `grounding.ts`, `style.ts`, aggregates in `aggregate.ts`, writes timestamped summaries to
  `scripts/eval/results/`. CLI flags already include `--limit`, `--only`, `--tag`,
  `--concurrency`, `--delay`, `--retries`, `--validate`, `--no-weave`, `--no-anchor`,
  `--no-style-rewrite`, plus transient-error retry with exponential backoff.
- `fixture.types.ts` — the `EvalFixture` schema (`{ id, profession, language, profile,
  jobPosting }`) + `hydrateProfile()` → `ProfileWithRelations`. **Reuse this fixture format** for
  the new dataset (extend, don't reinvent).
- `fixtures/*.json` — ~22 committed golden fixtures spanning professions
  (healthcare, finance, logistics, sales, office-admin, hr, marketing, manufacturing,
  skilled-trades, customer-service, education …) × DE/EN. **Migrate these into the new dataset
  as v0** and grow to ≥30 with the edge cases in §5.1.
- `pnpm eval:llm` / `pnpm eval:validate` (in `apps/api/package.json`).

**The single biggest weakness of the prior art:** `pipeline-runner.ts` *reimplements* the v1
chain in the harness, so it drifts from the real `ApplicationsService`. Your Deliverable A
(headless `generate()`) exists precisely to kill that duplication — the platform must exercise
**the real production code path**, not a copy.

## 4) Deliverable A — the enabler that lands IN `smart-apply` (one focused PR)

Extract a **headless, config-driven generation entrypoint** from `ApplicationsService` with **no
persistence, no auth, no storage, no subscription metering**. This is the only change to the
product repo and it must be surgical.

**Required signature (adapt names to fit the codebase idioms, keep the shape):**

```ts
// apps/api/src/applications/headless/generate.ts  (new, framework-light)
export interface GenerationConfig {
  language: 'de' | 'en';
  generateCoverLetter: boolean;
  // Per-CALL model + params so the matrix can vary one step at a time:
  models: Partial<Record<PipelineStep, { deployment: string; reasoningEffort?: 'none'|'minimal'|'low'|'medium'|'high'; temperature?: number; maxTokens?: number }>>;
  promptVersion?: string;             // e.g. 'v1' | 'v2' — resolves the templates dir
  toggles?: { editorPass?: boolean; keywordWeave?: boolean; styleRewrite?: boolean; systemAnchor?: boolean };
}

export interface GenerationResult {
  coverLetter: string | null;         // Markdown
  resume: RewrittenProfileDto;        // structured résumé payload
  atsKeywords: AtsKeywordsOutputDto;
  tailoredProfile: TailoredProfileDto;
  telemetry: {
    perCall: Array<{ step: PipelineStep; template: string; model: string;
                     latencyMs: number; promptTokens: number; completionTokens: number;
                     guardFallback?: boolean; }>;
    totalLatencyMs: number;
  };
}

export async function generateApplication(
  profile: ProfileWithRelations,      // pass the object directly — never load from Prisma here
  job: SerializableJobPosting,
  config: GenerationConfig,
  deps: { llm: LlmLike },             // inject the LLM boundary so it's swappable/fakeable
): Promise<GenerationResult>;
```

Requirements:

1. **Zero DB writes / zero storage / zero auth.** The function takes plain objects and returns
   plain objects. `ApplicationsService.generateWithSinglePipeline` should be refactored to call
   this same function and then do its own persistence — so the live path and the eval path share
   one implementation. (`LLMService.callText/callJson` are already template-path based, so this
   is a moderate refactor, not a rewrite.)
2. **Surface cost + latency + tokens.** Today the LLM boundary does **not** return token usage.
   Thread Azure's usage back out (`response.usage.prompt_tokens` / `completion_tokens`; also read
   rate/latency). Extend the provider return type to `{ text; usage }` and populate
   `telemetry.perCall`. This is a prerequisite for cost scoring and is genuinely missing today.
3. **Per-call model selection.** `config.models[step]` overrides the deployment/params for that
   step so a variant can, e.g., run `skill-selector` on `gpt-5-nano` but `cover-letter` on
   `gpt-5.1-chat`. Fall back to the env default when unset.
4. **A thin CLI wrapper** — `apps/api/scripts/headless-generate.ts` (wired as
   `pnpm generate:headless`) that reads `{ profile, job, config }` as JSON from stdin/args and
   prints `GenerationResult` as JSON to stdout, nothing else on stdout (logs → stderr). **This is
   the seam the eval platform calls** (promptfoo custom provider shells out to it). Keep it pure:
   no colored logs, no progress bars on stdout.
5. **Ship a `fake` v1-aware provider** (`llm/providers/fake-v1.provider.ts`, selected by
   `LLM_PROVIDER=fake`) that returns **schema-valid** JSON for every `callJson` step and
   plausible Markdown for `callText`, deterministically seeded from the input. This lets the full
   matrix run offline, in CI, and in tests without spending Azure tokens. (The existing `mock`
   provider stays as-is for its current callers.)
6. **Doc-sync (mandatory in this repo).** Update `README.md` **and** `ARCHITECTURE.md` in the same
   PR (new headless module, new `fake` provider, telemetry surface). Also update
   `docs/implementation/LLM_OUTPUT_QUALITY.md` (its living status table). Follow Conventional
   Commits, trunk-based flow, and the zero-warning lint policy (see §10).

Definition of Done (A): the live generation still passes its e2e; `pnpm generate:headless` prints
a valid `GenerationResult` for a sample fixture under both `LLM_PROVIDER=fake` (offline) and real
Azure; token+latency telemetry is populated; docs updated.

## 5) Deliverable B — the standalone eval platform (`applo-eval`, separate repo)

Scaffold a new repo `applo-eval` (sibling of `smart-apply`). It owns the dataset, the variant
runner, the scorers-glue, run storage, the **insights web app**, and CI. It calls into
`smart-apply` **only** through the headless CLI seam from §4 (no importing product internals, no DB).

### 5.1 Dataset (fixtures)

- Reuse the `EvalFixture` JSON schema from `apps/api/scripts/eval/fixture.types.ts`. Copy the ~22
  existing fixtures in as **v0** and grow to **≥30**, adding the required edge cases:
  **sparse profile, very large profile, thin/low-quality posting, cover-letter-off,
  career-changer**, plus more professions/industries. DE + EN both.
- Version the dataset (a `datasetVersion` field + a `CHANGELOG`). Fixtures are **synthetic or
  anonymized — never real PII**. Add a lint that rejects obvious PII (emails/phones that look real,
  etc.) and validates each fixture against the schema.
- Make "profession" and "language" **first-class slicing dimensions** on every fixture (they
  already are) — the report slices by them everywhere.

### 5.2 Variant matrix ("twists and tweaks")

Config-driven `dataset × variants`. A **variant** sets any of: model per call, `reasoning_effort`,
prompt version, generation params (temp/max-tokens), and pipeline toggles (skip editor pass? skip
style-rewrite? drop the system anchor? reorder?). Ship these variants out of the box for the
migration decision:

- `baseline` = `gpt-4.1` everywhere (the incumbent).
- `gpt-5.1-chat-all` (closest non-reasoning drop-in).
- `gpt-5-mini-mechanical` = reasoning `gpt-5-mini` for the mechanical JSON calls
  (skill-selector, job-facts, resume-rewrite, ats-keywords, editors) + `gpt-5.1-chat` for the
  cover letter.
- `gpt-5-nano-cheapest` = push the cheapest model everywhere it survives the guards.
- plus at least one `reasoning_effort` sweep on the mechanical calls.

The matrix must support **one-factor-at-a-time** runs (change only the cover-letter model, hold
everything else) so effects are attributable — not just all-or-nothing swaps.

### 5.3 Scorers (layered; deterministic first)

Reuse the product's own validators — **do not re-implement them** (they are the ground truth the
product ships). Import them via the headless package or re-export them from `smart-apply` for the
eval repo. Layers:

1. **Deterministic backbone (highest signal, free):**
   - **Grounding** — `GroundingValidatorService.validate()` → fabricated-number count + `score`
     (0–100). (`apps/api/src/applications/grounding/grounding-validator.service.ts`)
   - **Style** — `lintGeneratedStyle()` + `countResumeStyleViolations()` +
     `detectGermanVerbFirstBullets()` (AI clichés, German Konjunktiv-hedging, verb-first bullets).
     (`apps/api/src/applications/style-lint.util.ts`, `resume-editor.util.ts`)
   - **ATS keyword coverage %** — `matchAtsKeywordsToProfile()` + `isKeywordPresent()` +
     `selectKeywordsToWeave()`. (`apps/api/src/applications/keyword-coverage.util.ts`)
   - **Structural validity** — JSON parse success + `isValidResumeEdit()` ID-preservation rate.
2. **Guard / fallback rate (codebase-specific, high signal):** for each guarded pass (résumé
   editor, keyword-weave, cover-letter style-rewrite, résumé style-rewrite), the **fraction of
   fixtures where the model's output was rejected and the pass fell back.** Report per pass, per
   variant. Rising fallback rate = model struggling with instructions.
3. **Cost + latency (always):** €/application (from `telemetry` tokens × per-model price table),
   p50/p95 latency, per-call breakdown. Maintain a small editable `models.pricing.json`.
4. **LLM-as-judge (tie-breaker only):** **pairwise A/B** (variant vs baseline) with a fixed rubric
   on a strong judge (`gpt-5.1`) for German fluency, persuasiveness, job-relevance, and factual
   consistency vs. the profile. Report win/lose/tie rates, not saturated 1–5 means. Guard against
   position bias (swap order, average).
5. **Human spot-check hook:** a small labeling view in the UI to tag a sampled subset, used to
   **calibrate** the judge (report judge-vs-human agreement).

### 5.4 Reporting, persistence & regression

- Persist **every run** as a self-describing artifact (JSON now; Parquet/SQLite if you want
  queryability) under `applo-eval/runs/<timestamp>-<tag>/`, including: variant configs, per-fixture
  raw generated content, all scorer outputs, and telemetry. Runs are immutable and reproducible
  (record dataset version, prompt version, git SHAs of both repos, model deployments).
- **Baseline diff / regression detection:** compare a run to a named baseline; flag any metric
  that regresses past a threshold (e.g. grounding −5pts, ATS coverage −10pts, any new fabricated
  number). Output a machine-readable pass/fail plus a human summary.
- **CI:** a fast **smoke set** (≤6 fixtures, `LLM_PROVIDER=fake` or a tiny real budget) gates
  prompt/model PRs (no metric regresses past threshold). The **full matrix** runs nightly or
  on-demand against real Azure.

### 5.5 The insights web app (this is the headline deliverable — see §7 for the full brief)

A local-first **Next.js (App Router) dashboard** that reads the run artifacts and makes the
generated content and its quality legible at a glance. One command (`pnpm eval:report` or
`pnpm dev` in `applo-eval/web`) opens it. It is read-only over the artifacts; no live generation
from the browser.

## 6) Recommended tech stack (build vs. buy — decide, but this is the intended shape)

- **Matrix engine + assertions: promptfoo.** Use a **custom provider** that shells out to
  `pnpm generate:headless` in `smart-apply`, and **custom assertions** that call the reused
  deterministic scorers, plus promptfoo's LLM-rubric assertion for the pairwise judge. This gives
  you `dataset × variants`, caching, and a results JSON for free. **Do not hand-roll a matrix
  framework** (issue guidance).
- **Optional second opinion: Azure AI Foundry Evaluation.** We are already on Azure; wire its
  native **groundedness / relevance / fluency** evaluators as an *additional* scorer lane for
  cross-checking the bespoke ones. Keep it optional (flagged), not the primary path.
- **Scorers: bespoke, but only as glue** around the product's existing validators (§5.3).
- **Insights UI: bespoke Next.js 15 App Router + Tailwind + shadcn/ui + a charting lib**
  (Recharts or visx). This is where you invest — promptfoo's built-in viewer is not enough for the
  "insights on generated content" bar in §7. Read the promptfoo/Foundry outputs + telemetry from
  disk; render your own views.
- **Runtime:** Node 24, TypeScript strict, pnpm. Match `smart-apply`'s toolchain so the shared
  types line up.

## 7) Usability & insights design brief (the bar is "a PM understands it in 60 seconds")

The user's explicit priority is **great usability and deep insight into the generated content.**
Build the dashboard around *reading the actual outputs with quality rendered inline*, not just
aggregate numbers. Required views:

1. **Run Overview / Leaderboard.**
   - Variant leaderboard with quality (composite + per-scorer), €/app, and p50/p95 latency.
   - **Sliceable by profession and language** with a single control; every number re-slices.
   - A **quality-vs-cost-vs-latency trade-off** chart (Pareto front highlighted) so the
     "best value" variant is visually obvious.
   - Baseline selector; deltas shown as green/red chips (▲ +12 grounding, ▼ −0.3¢).

2. **Content Inspector (the star).** Pick a fixture → see the **actual generated cover letter and
   résumé** rendered as documents, **side-by-side across variants** (and against the baseline),
   with **inline annotations on the text**:
   - Fabricated/ungrounded numbers **highlighted in red** with a hover explaining "not found in
     profile" (from the grounding report).
   - AI clichés / German Konjunktiv-hedging / verb-first bullets **underlined** with the rule name.
   - ATS keywords: **covered** ones highlighted green in the text, **missing priority-1** ones
     listed in a side rail.
   - A **diff toggle** (variant vs baseline) so a reviewer sees exactly what changed.
   - Show **which guarded passes fired vs. fell back** for this fixture, as a little pipeline
     timeline with per-step latency + tokens.

3. **Scorer Drill-downs.** For each metric, a distribution + a click-through to the worst
   offenders (e.g. "3 fixtures introduced fabricated numbers under `gpt-5-nano`" → open them in the
   Content Inspector at the exact offending sentence).

4. **Regression view.** Two runs side by side; every regressed/ improved metric flagged, sliced by
   profession/language, with a one-line verdict ("`gpt-5-mini-mechanical` cuts cost 61% at
   parity grounding, −4pts persuasiveness on sales-EN only").

5. **Judge calibration + human spot-check.** The labeling view (§5.3.5) and a judge-vs-human
   agreement readout, so the judge's verdicts are trusted only as far as they're calibrated.

6. **Export.** One click to export the current sliced comparison as a shareable static HTML / PDF
   for the migration decision doc.

Cross-cutting UX rules: fast (reads local artifacts, no spinner theater), keyboard-navigable,
empty/loading/error states handled, DE/EN content renders correctly (umlauts, quotes), and the
whole thing is legible to a non-engineer. **Use your vision capability to screenshot each view and
self-critique against these six requirements before calling a milestone done.**

## 8) Autonomous execution plan (milestones + self-verification)

Work in this order. After each milestone: run tests, run the relevant command end to end, and
(for UI) screenshot + self-review. Commit with Conventional Commits.

- **M0 — Recon & plan.** Read §2/§3 and the code. Write `applo-eval/docs/PLAN.md` (architecture,
  task DAG, ADRs for the build-vs-buy calls). No product code yet.
- **M1 — Headless enabler (Deliverable A) in `smart-apply`.** The refactor + `fake` provider +
  telemetry + CLI + doc-sync. Prove it offline (`LLM_PROVIDER=fake`) and on real Azure. Open it as
  a clean, single-concern PR.
- **M2 — Dataset v0.** Migrate the 22 fixtures + add edge cases to ≥30; schema + PII lints.
- **M3 — Matrix runner.** promptfoo config + custom provider (shells to the CLI) + deterministic
  scorers wired as custom assertions + cost/latency + guard-fallback capture. Runnable offline via
  `fake`. Persist run artifacts (§5.4).
- **M4 — Insights UI.** The six views in §7. This is where you spend the most effort and where
  your visual self-review matters most.
- **M5 — Judge + regression + CI.** Pairwise LLM-judge lane, baseline regression gate, CI smoke
  set, nightly full-matrix workflow.
- **M6 — The payoff run.** Execute `baseline` vs the GPT-5 split across the full dataset on real
  Azure; produce the **migration recommendation report** (which model for which call, with the
  quality/cost/latency evidence) as the headline artifact. Write it up in
  `applo-eval/docs/MIGRATION_RECOMMENDATION.md`.

## 9) Acceptance criteria

**Milestone 1 (must all be true):**
- [ ] Headless `generateApplication(profile, job, config)` in `smart-apply` with **no DB writes**;
      the live path calls the same function; README + ARCHITECTURE updated (doc-sync).
- [ ] `fake` v1-aware provider lets the full chain run offline/deterministically.
- [ ] Token + latency telemetry surfaced per call.
- [ ] Eval dataset v0 (≥30 cases: professions × DE/EN × the five edge cases).
- [ ] Variant runner producing a `dataset × variants` matrix, one-factor-at-a-time capable.
- [ ] Deterministic scorers wired (grounding, style-lint, ATS coverage, JSON/ID validity,
      **guard-fallback rate**).
- [ ] Cost + latency captured per run.
- [ ] Insights UI renders the leaderboard **and** the Content Inspector with inline grounding /
      style / ATS annotations, sliceable by profession + language.
- [ ] Comparison report: `gpt-4.1` vs `gpt-5-mini` / `gpt-5.1-chat` split, sliced by profession +
      language, with a written recommendation.

**Stretch:** pairwise judge + human calibration UI; CI smoke-eval gate on prompt/model PRs;
continuous eval on a sample of production generations; Parquet/DuckDB run store for ad-hoc queries.

## 10) Guardrails & conventions (both repos)

For any change in **`smart-apply`** (Deliverable A):
- **Conventional Commits**; **trunk-based** (short-lived `feat/…` branch → PR → squash-merge; never
  push to `main`, never `--force`, never add long-lived branches).
- **Doc-sync is mandatory** — architecture change ⇒ update `README.md` + `ARCHITECTURE.md` (+ the
  `.github/copilot-instructions.md` sections and `docs/implementation/LLM_OUTPUT_QUALITY.md`) in the
  same PR.
- **Zero ESLint errors AND warnings** in new code. TypeScript strict; never `any` (use `unknown` +
  a guard). Prefix deliberately-unused params with `_`.
- Keep DTO validation / `@Sanitize()` / guards intact; the headless function must **not** weaken
  the live path's security or persistence.
- Respect the known landmines: the `mock` provider can't drive v1 (that's why you add `fake`);
  don't touch the CSRF `getSessionIdentifier`; don't use `form.watch(...)`; run
  `pnpm --filter @smart-apply/api eval:validate` (ts-node ground truth) after editing any
  `scripts/eval/*` or headless script — `get_errors`/the TS-server can lag on files outside the
  nest build scope.
- If the refactor is large, land it behind the existing behavior with the live e2e green **before**
  wiring the eval repo to it.

For **`applo-eval`** (new repo):
- Same toolchain (Node 24, pnpm, TS strict, Conventional Commits, a CI workflow).
- **No real PII** in fixtures or run artifacts. Redact any pasted real-world case.
- Secrets (Azure keys) via env/`.env` (gitignored) only — never committed; the platform reads the
  same `AZURE_OPENAI_*` shape as `smart-apply`.
- Make the whole thing **runnable offline** (`LLM_PROVIDER=fake`) so contributors and CI don't need
  Azure to develop the runner or the UI.

## 11) Appendix — real signatures, paths & types (use these; don't hallucinate)

**Pipeline / orchestration**
- `apps/api/src/applications/applications.service.ts` — `createWithGeneration()`,
  `generateWithSinglePipeline()` (the code to refactor behind `generateApplication`).
- Serializers: `apps/api/src/applications/serialize.util.ts` —
  `serializeProfileForLlm()`, `serializeJobPostingForLlm()`, type `SerializableJobPosting`.
- `apps/api/src/applications/resume-template.util.ts` — type `ProfileWithRelations`.

**LLM boundary**
- `apps/api/src/llm/llm.service.ts` —
  `callText(templatePath, variables, options?)`, `callJson<T>(templatePath, variables, options?)`;
  `options` = `{ temperature?, maxTokens?, systemMessage? }`. Extend the provider return to carry
  token `usage`.
- Providers: `apps/api/src/llm/providers/` — `azure-openai.provider.ts`,
  `azure-ai-foundry.provider.ts`, `mock.provider.ts`, `azure-v1-url.util.ts`
  (`buildV1ChatCompletionsUrl`, `normalizeV1ApiVersion`). Add `fake-v1.provider.ts`.
- Structured outputs: `apps/api/src/llm/schemas/v1-schemas.ts` (`resolveResponseFormat`,
  `SCHEMA_REGISTRY`).
- Config/env: `apps/api/src/config/env.schema.ts` — `LLM_PROVIDER`, `AZURE_OPENAI_ENDPOINT`,
  `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT_NAME`, `AZURE_OPENAI_API_VERSION`.

**Deterministic scorers (reuse — pure utils unless noted)**
- `apps/api/src/applications/grounding/grounding-validator.service.ts` — `GroundingValidatorService.validate({resume,coverLetter}, profile) → GroundingReport { grounded, totalChecked, unsupported[], score }`. (Nest `@Injectable`, but has no DB deps — instantiable directly.)
- `apps/api/src/applications/style-lint.util.ts` — `lintGeneratedStyle(text, lang) → { aiPhrases[], hedging[], total }`; `evaluateStyleRewrite(draft, rewritten, lang, minRatio) → { accept, before, after, reason }`; `detectGermanVerbFirstBullets(bullets, lang) → string[]`.
- `apps/api/src/applications/keyword-coverage.util.ts` — `matchAtsKeywordsToProfile(extracted, profile)`, `isKeywordPresent(text, keyword)`, `selectKeywordsToWeave(ats, text) → string[]`, const `MAX_WEAVE_KEYWORDS`.
- `apps/api/src/applications/resume-editor.util.ts` — `isValidResumeEdit(original, edited): edited is RewrittenProfileDto`; `countResumeStyleViolations(profile, lang)`; `evaluateResumeStyleRewrite(original, edited, lang, minRatio)`; `extractResumeProse(...)`.

**DTOs / output shapes**
- `TailoredProfileDto` — `apps/api/src/applications/dto/tailored-profile.dto.ts`.
- `RewrittenProfileDto` (`rewritten_summary`, `rewritten_experiences[{profileExperienceId, rewritten_description, rewritten_achievements[]}]`, `rewritten_projects[{profileProjectId, rewritten_description, rewritten_highlights[]}]`) — `resume-editor.util.ts`.
- `AtsKeywordsOutputDto` (`hard_skills[{keyword, priority?}]`, `soft_skills[…]`) — `apps/api/src/keywords/dto/ats-keywords.dto.ts`.
- `JobFactsDto` (`contact_name`, `contact_salutation`, `company_specifics[]`, `asks_salary`, `asks_start_date`) — `apps/api/src/applications/job-facts.util.ts` (+ `buildSalutation`, `normalizeJobFacts`).

**Prompts** — `apps/api/prompts/v1/` (skill-selector, job-facts, resume-rewrite, editor-resume,
resume-style-rewrite, cover-letter, editor-cover-letter, keyword-weave, style-rewrite,
ats-keywords). Loaded at runtime by `LLMService.loadTemplate(path)`; `{{var}}` / `{{json var}}`
interpolation.

**Prior-art harness** — `apps/api/scripts/eval/` (`run-eval.ts`, `pipeline-runner.ts`, `judge.ts`,
`grounding.ts`, `style.ts`, `aggregate.ts`, `fixture.types.ts`, `fixtures/*.json`); scripts
`eval:llm`, `eval:validate` in `apps/api/package.json`.

**Migration context** — `gpt-4.1` (our `gpt-4.1-local`) retires **2026-10-14**; candidates
`gpt-5.1-chat` (non-reasoning drop-in), `gpt-5-mini` / `gpt-5-nano` (reasoning, for mechanical
calls). The first deliverable's whole point is to choose the target on quality + cost + latency
evidence before that date.

## 12) Decide autonomously vs. surface to a human

**Decide (record as an ADR):** run-store format (JSON vs Parquet/SQLite), charting lib, exact
composite-quality weighting, promptfoo config layout, how the eval repo imports/re-exports the
scorers, fixture additions, UI component structure.

**Surface (batch these):** anything that spends **non-trivial real Azure budget** (get sign-off on
the full-matrix token spend before M6), any change that would alter **live generation behavior**
beyond the pure refactor, and the **final model-per-call recommendation** (present the evidence;
let a human make the migration call).

Begin with **M0**: read the code, then post your `PLAN.md` and task DAG before writing
implementation code.

─── PROMPT ENDS ───
