# Prompt Caching — Implementation Plan & Living Tracker

> **Input tokens dominate Applo's LLM cost.** A full application fires ~9 LLM calls
> that re-send the same serialized profile + job posting and the same long, static
> prompt instructions on every call. Azure OpenAI (and Mistral La Plateforme) will
> cache repeated prompt prefixes automatically — but **only if we lay the prompts out
> correctly**. Today we do not, so we capture ~0 of that discount.
>
> This document is the single source of truth for enabling prompt caching across the
> generation pipeline.
>
> ## 📌 How to use this document
> **Update this file on EVERY change that touches prompt layout, the provider request
> shape, or token accounting.** Concretely:
> 1. Flip the phase's **Status** in the summary table.
> 2. Tick the relevant **Acceptance criteria** in that phase's section.
> 3. Add a dated entry to the **[Changelog](#changelog)** (newest first) with the
>    PR/branch and files touched.
>
> Same discipline as the `README.md` / `ARCHITECTURE.md` doc-sync rule.

---

## Why this exists

- **Cost.** On GPT-4.1 a full generation costs **~$0.17** (~40K input + ~11K output
  tokens across ~9 calls). Input is ~half of that, and most of the input is *repeated*:
  the profile + job block is re-sent on nearly every call, and each prompt carries a
  long static instruction block. See the cost model discussion for the derivation.
- **Free money.** Azure OpenAI prompt caching is **on by default** and bills cache
  reads at a **discount on input** (`gpt-4.1` cached input ≈ **$0.50/M vs $2/M — ~75% off**;
  verify current Azure rate). Output is never discounted.
- **We currently get ~0 hits** because of how the prompts are ordered (see
  [Current state](#current-state--why-we-get-0-cache-hits)).
- **Portable.** The core work (prompt reordering) pays off on Mistral too, so it is
  worth doing regardless of the pending model decision.

---

## Background: how Azure prompt caching works

Source: [Azure — Prompt caching](https://learn.microsoft.com/azure/foundry/openai/how-to/prompt-caching).

| Fact | Detail |
|---|---|
| **Enable flag?** | None. Enabled by default for supported models; **cannot be disabled**. There is nothing to "turn on" in config. |
| **Supported models** | `gpt-4o*`, `gpt-4.1*` (incl. `gpt-4.1-2025-04-14`), `o1*`, `o3-mini`, etc. |
| **Min size** | Prompt must be **≥ 1,024 tokens**. |
| **Prefix rule** | The **first 1,024 tokens must be byte-identical** to a prior request. Then every additional **128 identical tokens** also caches. |
| **Miss trigger** | A single character change in the first 1,024 tokens → `cached_tokens: 0`. |
| **Discount** | Cache reads discounted on input pricing (Standard); up to 100% off on Provisioned. |
| **Lifetime** | Cleared after **5–10 min idle**, always gone **within 1 hour**. Not shared across subscriptions. |
| **Verify** | `usage.prompt_tokens_details.cached_tokens` in the chat-completions response. |
| **Best practice** | Put stable content (instructions, schema) at the **start**; put variable content at the **end**. Structured-output schema is appended as a prefix to the system message (stable per template). |
| **Routing** | `prompt_cache_key` pins same-prefix requests to the same node → higher hit rate at concurrency (replaces the legacy `user` field). |

**Mistral note:** La Plateforme also does automatic prefix caching — same "stable prefix
first" principle. Confirm exact rate/mechanics before relying on it.

---

## Current state — why we get ~0 cache hits

The prompt templates put the **variable data near the top**. Example —
[`v1/cover-letter.md`](../../apps/api/prompts/v1/cover-letter.md): a short role header,
then immediately `{{json job}}` + `{{json tailoredProfile}}` + `{{json jobFacts}}` +
`{{salutation}}`, and only *then* the long static Task / Constraints / Structure block.

[`AzureOpenAIProvider.generateText`](../../apps/api/src/llm/providers/azure-openai.provider.ts)
renders that whole template into a **single `user` message**. So the first 1,024 tokens
contain per-user, per-job data and **differ on every request → `cached_tokens: 0` every time**.

Net effect: the model reprocesses the long instruction blocks and the repeated profile+job
payload from scratch on all ~9 calls, for every user.

---

## Goal & success metrics

1. `cached_tokens > 0` on the repeated calls within a single application run (measured).
2. **≥ 50% of input tokens cached** on the hot pipeline calls once warm.
3. **~20–25% reduction in total per-application cost** on GPT-4.1 (all from input),
   i.e. **~$0.17 → ~$0.13/app**. At ~30K gens/month ≈ **~$1,250/month saved** — and it
   **stacks** with a future Mistral switch.
4. **No quality regression** vs. the current output (proven via the eval harness).

> Estimate math (central case): a byte-identical preamble of ~3,500 tokens
> (anchor + profile + job) cached on 8 of 9 calls = ~28K cached input tokens/app.
> At 75% off that saves ~$0.042/app on input.

---

## Design decision: which prefix ordering?

Caching rewards an **identical leading prefix**. Two orderings are possible and they are
**mutually exclusive for the leading bytes** — this is the core design choice:

| Strategy | Prefix order | Wins | Reuse reliability |
|---|---|---|---|
| **A — Instructions-first** | `[template instructions] → [profile+job] → [per-call vars]` | Cross-**user** caching of a template's static instruction block | Depends on another user hitting the *same* template within 5–10 min |
| **B — Shared-preamble-first** ⭐ | `[system anchor + profile + job] → [template instructions] → [per-call vars]` | Intra-**application** caching of the big repeated profile+job payload on calls 2–9 | **Guaranteed** — the 9 calls fire back-to-back within seconds |

**Recommendation: Strategy B is the primary target.** The profile+job block is the largest
*repeated* payload and its reuse is guaranteed within each generation burst, so it captures
the bigger, more reliable prize. Strategy A is a complementary win for high-traffic
standalone templates (e.g. `application-validation`, `skill-selector`) and can be layered on
where the shared preamble does not apply. **Phase 0 measurement decides the final split.**

Requirements for Strategy B to actually hit:
- The preamble (system anchor + serialized profile + serialized job) must be **byte-identical
  across every call** in one application run (same serialization, same field order, same
  whitespace).
- It must be **≥ 1,024 tokens** (profile+job usually clear this; pad with the anchor if not).
- `temperature` / `max_tokens` differences between calls are **fine** — they are request
  params, not part of the cached prompt.

---

## The plan (phases)

### Phase 0 — Measure the baseline `[ Status: ✅ Done — accounting shipped; baseline captured (cached=0 on every call) ]`

You cannot optimize what you cannot see. Ship token accounting first.

- Capture `usage` from the chat-completions response in
  [`AzureOpenAIProvider`](../../apps/api/src/llm/providers/azure-openai.provider.ts):
  `prompt_tokens`, `completion_tokens`, and `prompt_tokens_details.cached_tokens`.
- Surface it through [`LLMService.callText` / `callJson`](../../apps/api/src/llm/llm.service.ts)
  behind the existing `LOG_LLM_CALLS` flag (per-call: template path, tokens in/out, cached).
- Run one real generation and record the baseline (expected: `cached_tokens: 0` everywhere).

**Acceptance criteria**
- [x] Provider reads and logs `cached_tokens` per call (no PII in logs).
- [x] `LOG_LLM_CALLS=true` prints a per-application token summary (total in / out / cached).
- [x] Baseline captured in the [Changelog](#changelog) — the `phase3-newlayout` eval (24
  fixtures, gpt-4.1) measured **`cached_tokens = 0` on every call**, confirming the current
  (pre-caching-benefit) state.

### Phase 1 — Restructure the prompts (the big lever) `[ Status: ⚠️ Reorder shipped, but measured 0% cache hits — full-request-prefix mismatch (see Phase 3 finding); Strategy-A trio still deferred ]`

Reorder each live-pipeline prompt to the chosen ordering (Strategy B preamble, or A where
B does not apply) so the leading ≥1,024 tokens are identical across reuses. Keep the
semantic content unchanged — only **position** moves.

- Introduce a shared, byte-identical **preamble block** (system anchor + serialized
  profile + serialized job) prepended to every pipeline call, OR move the static
  instruction block ahead of the `{{...}}` variables per template.
- Standardize serialization (`serializeProfile` / `serializeJobPosting`) so the block is
  identical across calls (stable key order, stable whitespace).
- Do **not** change wording, constraints, examples, or output schema.

**Acceptance criteria**
- [x] Strategy-B cluster reordered — the shared `[tailoredProfile(+job)]` block now leads
  all 8 downstream prompts (`cover-letter`, `resume-rewrite`, `editor-cover-letter`,
  `editor-resume`, `resume-style-rewrite`, `keyword-weave`, `style-rewrite`,
  `shorten-cover-letter`); per-call `{{...}}` vars follow the prefix.
- [ ] Strategy-A trio (`skill-selector`, `job-facts`, `ats-keywords`) reordered — **deferred**:
  first/parallel calls with only a speculative cross-user win; `job-facts` is likely below the
  1,024-token floor, and `skill-selector` feeds the whole pipeline (hold for the Phase 3 eval).
- [x] Preamble is byte-identical across the cluster — verified with `shasum`: `head -9` (through
  the `tailoredProfile` fence) matches across all 8, and `head -15` (through the `job` block)
  matches across the 3 cluster-1 prompts. `resume.md` left untouched (not on the live
  `createWithGeneration` path).
- [ ] `cached_tokens > 0` on calls 2–9 of a single generation. **Measured 2026-07-24: still 0**
  on every call across all 24 fixtures. The *user-message* prefix was aligned, but Azure keys
  the cache on the FULL request prefix (`response_format` schema → system message → user
  message), which differs per call. See the **Phase 3 finding** below.
- [ ] ≥ 50% of input tokens cached on the hot calls once warm. **Not met (0% measured)** —
  blocked on the same prefix mismatch; needs the full-prefix-alignment follow-up (Phase 1b).

### Phase 2 — Provider request shape `[ Status: 🚧 prompt_cache_key shipped, but has no measurable effect yet (0% cached — see Phase 3 finding); the system/user split is now the critical path, not optional ]`

- [x] Pass **`prompt_cache_key`** in the request body to improve routing at concurrency.
  **Keyed per generation, NOT per template.** Because Phase 1 shipped Strategy B (a prefix
  shared *across* the ~8 downstream prompts within one run), a per-template key would scatter
  those calls across backends and defeat the intra-app reuse. The key is a hash of
  `userId:jobPostingId` (`applo:gen:<sha256[:32]>`), derived in `LLMService.callText/callJson`
  from the template variables, so every call in one generation carries the *same* key and
  routes together. Confirmed against the Azure docs: *"reuse the same key for requests that
  share long, common prompt prefixes."* Forwarded by both real providers
  ([`azure-openai.provider.ts`](../../apps/api/src/llm/providers/azure-openai.provider.ts),
  [`azure-ai-foundry.provider.ts`](../../apps/api/src/llm/providers/azure-ai-foundry.provider.ts));
  the mock ignores it.
- [ ] **Deferred → now the critical path (see Phase 1b).** Move the shared block into an
  **identical leading `system` message** with a **uniform `response_format`** across the
  clustered calls (a JSON schema is prepended to the system message, so a plain-text call and a
  JSON call can never share a prefix as-is). The Phase 3 eval proved the single-user-message
  reorder does **not** cache — Azure keys on the schema + system message that *precede* the user
  text — so this is the actual lever, not optional polish. See the Phase 3 finding.
- [x] `response_format` behavior unchanged (schema stays a stable per-template prefix).

**Acceptance criteria**
- [x] `prompt_cache_key` sent on every pipeline call (stable per generation). Hit-rate
  improvement vs. Phase 1 *under load* still needs an empirical check (real Azure + concurrency).
- [x] `response_format` / structured outputs still pass `v1-schemas` tests — 16/16 green; full
  API typecheck clean; 0 net-new lint warnings (28 pre-existing `any` = main baseline).

### Phase 3 — Verify + eval (quality gate) `[ Status: ✅ Done — quality: no regression; cost: measured 0% cached / $0 savings, root-caused (see finding) ]`

Reordering can subtly shift model output (instruction position matters), so gate on eval.

- Run the A/B eval harness (LLM output-quality item #10) old-layout vs. new-layout on a
  fixed set of profiles/jobs.
- Confirm no regression in ATS coverage, grounding, style-lint, and length metrics.
- Record the measured cost delta (cached % and $/app before vs. after).

**Acceptance criteria**
- [x] Eval shows no quality regression (DE + EN, cover letter + résumé) — full 24-fixture
  `phase3-newlayout` run (gpt-4.1): OVERALL **4.96** (~5.00 saturated baseline), style **100%
  clean / 0 violations**, length **0% overrun** (mean 250 words vs. 350 budget), priority-1
  coverage 81.6 → 94.7 % (weave fired 7/24), grounding 75 % (all 6 flagged values are
  job-posting-quoted numbers — the documented caveat). DE 5.00 / EN 4.92.
- [x] Measured per-application cost delta recorded in the [Changelog](#changelog) — and it is
  **$0 (0 % cached)**: the reorder does not yet produce cache hits (root cause below).

**🔬 Finding — why the measured cost delta is $0 (the reorder alone is not sufficient).** Azure
computes the cache key over the **entire request prefix** — the `response_format` JSON schema
(prepended to the system message), then the **system message**, then the **user message** — not
the user message alone. Phase 1 aligned only the user-message `tailoredProfile(+job)` block, but
the components that *precede* it differ on every pipeline call, so the aligned block is never the
actual *leading* prefix:

| Call | Effective leading prefix (what Azure keys on) |
|---|---|
| `cover-letter` (callText) | `[system: ANCHOR][user: TP+job]` |
| `resume-rewrite` (callJson) | `[schema][system: ANCHOR][user: TP+job]` |
| `editor-cover-letter` (callText) | `[user: TP+job]` (no system) |
| `editor-resume` (callJson) | `[schema][user: TP]` (no system) |
| `keyword-weave` (callText) | `[user: TP]` (no system) |

No two calls share a byte-identical prefix from token 0. Compounding factors: the two calls with
the largest identical user prefix (`cover-letter` / `resume-rewrite`) run in **parallel** (no read
benefit) *and* differ by schema anyway; and the `tailoredProfile`-only block (cluster-2) is likely
**below Azure's 1,024-token minimum**. Verified empirically: `cached_tokens = 0` on all ~7.3
calls/gen across 24 fixtures.

**➡️ Recommended follow-up — Phase 1b (full-prefix alignment).** To realize any caching the
*leading* bytes must match across the burst:
1. Move the shared `[tailoredProfile(+job)]` block into an **identical leading `system` message**
   used verbatim by every clustered call (so the prefix starts the same regardless of per-call
   schema/anchor), **and/or**
2. Make the pre-prefix components uniform — apply the **same `GENERATION_SYSTEM_ANCHOR` and the
   same `response_format`** to every clustered call (a `json_schema` is prepended to the system
   message, so a plain-text call and a JSON call can never share a prefix as-is).
3. Ensure the shared leading block clears **≥ 1,024 tokens** (anchor + serialized job help;
   tailoredProfile-only likely does not).
4. Don't fire the two largest shared-prefix calls in **parallel** if you want the second to read
   the first's cache write (or accept that only the later sequential calls benefit).
Gate the redo on this same eval — the aggregator's **Cost & prompt caching** block now measures
the cached % + $/gen delta directly.

### Phase 4 — Portability check (Mistral) `[ Status: ⬜ Not started ]`

- Confirm Mistral La Plateforme caching mechanics + rate.
- Confirm the same reordered layout hits its cache (`cached_tokens` equivalent).

**Acceptance criteria**
- [ ] Reordered prompts verified to cache on Mistral (if/when trialed).

---

## File-by-file work

**P1 = live generation pipeline (reorder first).** P2 = on-demand paths.

| Priority | Prompt | Call | Notes |
|---|---|---|---|
| P1 | [`v1/skill-selector.md`](../../apps/api/prompts/v1/skill-selector.md) | `callJson` | High traffic — runs on every generation. |
| P1 | [`v1/job-facts.md`](../../apps/api/prompts/v1/job-facts.md) | `callJson` | Small output; still re-sends job. |
| P1 | [`v1/cover-letter.md`](../../apps/api/prompts/v1/cover-letter.md) | `callText` | Worst current layout (data early). |
| P1 | [`v1/resume-rewrite.md`](../../apps/api/prompts/v1/resume-rewrite.md) | `callJson` | Large input + output. |
| P1 | [`v1/ats-keywords.md`](../../apps/api/prompts/v1/ats-keywords.md) | `callJson` | Runs on every generation. |
| P1 | [`v1/editor-resume.md`](../../apps/api/prompts/v1/editor-resume.md) | `callJson` | Re-sends résumé draft. |
| P1 | [`v1/resume-style-rewrite.md`](../../apps/api/prompts/v1/resume-style-rewrite.md) | `callJson` | Conditional. |
| P1 | [`v1/editor-cover-letter.md`](../../apps/api/prompts/v1/editor-cover-letter.md) | `callText` | Conditional. |
| P1 | [`v1/keyword-weave.md`](../../apps/api/prompts/v1/keyword-weave.md) | `callText` | Conditional. |
| P1 | [`v1/style-rewrite.md`](../../apps/api/prompts/v1/style-rewrite.md) | `callText` | Conditional. |
| P1 | [`v1/shorten-cover-letter.md`](../../apps/api/prompts/v1/shorten-cover-letter.md) | `callText` | Conditional (length governor). |
| P2 | [`v1/application-validation.md`](../../apps/api/prompts/v1/application-validation.md) | `callJson` | Standalone Bewerbungs-Check — good Strategy-A candidate (large static rubric). |
| P2 | [`v1/translate-resume.md`](../../apps/api/prompts/v1/translate-resume.md) | `callJson` | On export. |
| P2 | [`v1/translate-cover-letter.md`](../../apps/api/prompts/v1/translate-cover-letter.md) | `callText` | On export. |
| P2 | [`v1/extract-resume.md`](../../apps/api/prompts/v1/extract-resume.md) | `callJson` | Resume parser bootstrap. |
| P2 | [`v1/profile-keywords.md`](../../apps/api/prompts/v1/profile-keywords.md) | `callJson` | — |
| P2 | [`v1/ats-keywords-extract.md`](../../apps/api/prompts/v1/ats-keywords-extract.md) | `callJson` | — |
| P2 | [`v1/resume.md`](../../apps/api/prompts/v1/resume.md) | — | Verify still on a live path before touching. |

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Reordering shifts model output | Gate on the A/B eval (Phase 3); ship behind a branch, not blind. |
| Prefix ordering tension (A vs B) | Decide from Phase 0 data; default to Strategy B (guaranteed intra-app reuse). |
| Cache window is short (5–10 min) | Strategy B relies on the back-to-back burst, not long TTL — unaffected. |
| Non-identical serialization breaks the prefix | Standardize `serializeProfile`/`serializeJobPosting` (stable key order + whitespace); assert byte-identity in a test. |
| Structured outputs break | Keep `response_format` unchanged; schema stays a stable per-template prefix; re-run `v1-schemas` tests. |

**Rollback:** prompts are data files and the provider change is additive — revert the
branch. No migration, no state.

---

## Out of scope (separate levers)

- **Semantic cache** (embedding-keyed response reuse) — different mechanism, larger change.
- **Model routing** (cheap model for JSON/extraction calls, frontier for prose) — tracked
  with the model-selection decision, not here.
- **Batch API** (50% off) — Applo generation is real-time (SSE), so batch does not apply
  to the live pipeline.

---

## Documentation to update when implemented

- This tracker (status + changelog).
- `copilot-instructions.md` LLM section — one line noting prompt caching + `prompt_cache_key`.
- `ARCHITECTURE.md` — only if the shared-preamble mechanism materially changes the pipeline
  description (Strategy B); otherwise no change needed.

---

## Changelog

_Newest first. Add an entry per PR/branch with the files touched and the measured effect._

- **2026-07-24** — `feat/prompt-caching-phase3-eval`: **Phase 3 verify + eval (quality gate) —
  DONE, with a decisive cost finding.** Built the cost/caching measurement the harness was
  missing, then ran the full 24-fixture new-layout eval on real Azure (gpt-4.1).
  **Tooling:** added `LLMService.runWithUsageCapture` (returns aggregated input/cached/output
  tokens for a scope; decoupled accumulation from logging so capture works regardless of
  `LOG_LLM_CALLS`) + a `CapturedUsage` type
  ([`llm.interface.ts`](../../apps/api/src/llm/llm.interface.ts),
  [`llm.service.ts`](../../apps/api/src/llm/llm.service.ts)); the harness now wraps **generation
  only** (not the judge) in the capture scope
  ([`run-eval.ts`](../../apps/api/scripts/eval/run-eval.ts)), and the aggregator gained a
  **Cost & prompt caching** block — mean input/cached/output tokens, cached input share, and
  est. $/gen with-vs-without caching + savings at documented gpt-4.1 rates
  ([`aggregate.ts`](../../apps/api/scripts/eval/aggregate.ts); README updated). Verified
  token-free (`eval:validate` green, 24 fixtures), project typecheck clean on the touched files
  (only pre-existing test-suite drift remains), **0 net-new lint warnings** (18 = 18 vs. pristine).
  **Quality result (no regression):** `phase3-newlayout`, 24 fixtures — OVERALL **4.96** (~5.00
  saturated baseline), style **100% clean / 0 violations**, length **0% overrun** (mean 250
  words vs. 350 budget), priority-1 coverage 81.6 → 94.7 % (weave fired 7/24), grounding 75 %
  (all 6 flagged values are job-posting-quoted numbers — the documented caveat). DE 5.00 / EN
  4.92. The pure reorder shifted nothing.
  **Cost result (the finding):** **0 % cached, $0 savings.** Mean ~7.3 calls/gen, 22,270 input /
  2,346 output tokens, est. **$0.0633/gen** *with and without* caching; `cached_tokens = 0` on
  every call across all 24 fixtures. **Root cause:** Azure keys the cache on the full request
  prefix (`response_format` schema → system message → user message); Phase 1 aligned only the
  *user-message* prefix, so the differing schema/anchor that *precede* it break the match (see
  the Phase 3 Finding table). The Phase 1/2 reorder + `prompt_cache_key` are necessary but **not
  sufficient**; a **Phase 1b full-prefix alignment** is required before any saving materializes.
  No prod behaviour change — `runWithUsageCapture` is measurement-only; the mock provider
  ignores it; the eval harness lives under `scripts/` (out of the nest build + eslint scope).
- **2026-07-24** — `feat/prompt-caching-phase2-cache-key`: **Phase 2 `prompt_cache_key`
  (provider request shape).** Added an optional `promptCacheKey` to `GenerateOptions`
  ([`llm/llm.interface.ts`](../../apps/api/src/llm/llm.interface.ts)); both real providers now
  forward it as the Azure `prompt_cache_key` body field
  ([`azure-openai.provider.ts`](../../apps/api/src/llm/providers/azure-openai.provider.ts),
  [`azure-ai-foundry.provider.ts`](../../apps/api/src/llm/providers/azure-ai-foundry.provider.ts));
  `LLMService.callText`/`callJson` derive a stable per-generation key
  (`applo:gen:<sha256(userId:jobPostingId)[:32]>`) from the template variables
  ([`llm/llm.service.ts`](../../apps/api/src/llm/llm.service.ts)), so the ~8 pipeline calls that
  share the Phase 1 `tailoredProfile(+job)` prefix route to the same backend and reuse the warm
  cache under concurrency. **Keyed per generation, not per template** (per-template would defeat
  the Strategy-B cross-prompt reuse — see Phase 2 above). No prompt/behaviour change; the mock
  provider ignores the field. **Verified:** `v1-schemas` unit tests 16/16 green, full API
  `tsc --noEmit` clean, and 0 net-new ESLint warnings (28 pre-existing `any` warnings = the
  main baseline for the 4 files, proven via a stash diff). **Deferred:** the optional
  system/user message split, and the empirical under-load hit-rate measurement (needs real
  Azure + concurrency; pairs with the Phase 0/1 `cached_tokens` capture).
- **2026-07-23** — `feat/prompt-caching-phase1-reorder`: **Phase 1 Strategy-B reorder (pure
  reorder — no semantic change).** Hoisted a byte-identical `## Input Data` prefix —
  `[tailoredProfile]` (+ `[job]` where the call already carries it) — to the very top of the 8
  post-skill-selector pipeline prompts, ahead of the `# Role:` header, so Azure/Mistral prompt
  caching reuses it across the back-to-back generation burst. Per-call volatile vars (`draft`,
  `jobFacts`, `salutation`, `keywords`, `violations`, `verbFirstBullets`, `rewrittenProfile`,
  `currentWords`, `lengthBudget`) now follow the shared prefix. Files: cluster-1 `[TP+job]` —
  [`cover-letter.md`](../../apps/api/prompts/v1/cover-letter.md),
  [`resume-rewrite.md`](../../apps/api/prompts/v1/resume-rewrite.md),
  [`editor-cover-letter.md`](../../apps/api/prompts/v1/editor-cover-letter.md); cluster-2 `[TP]`
  — [`editor-resume.md`](../../apps/api/prompts/v1/editor-resume.md),
  [`resume-style-rewrite.md`](../../apps/api/prompts/v1/resume-style-rewrite.md),
  [`keyword-weave.md`](../../apps/api/prompts/v1/keyword-weave.md),
  [`style-rewrite.md`](../../apps/api/prompts/v1/style-rewrite.md),
  [`shorten-cover-letter.md`](../../apps/api/prompts/v1/shorten-cover-letter.md). Normalized two
  labels to the canonical `**Tailored Profile (the ONLY source of facts):**` (was "Selected
  Data" in cover-letter/resume-rewrite; dropped the redundant "for context, never for
  additions" note in shorten-cover-letter — its constraint #4 already forbids additions). No
  TS/pipeline changes (vars already passed; `renderTemplate` is dumb `{{}}` substitution).
  **Verified** byte-identical prefixes via `shasum` (head-9 across all 8; head-15 across
  cluster-1) and all `{{...}}` placeholders retained. **Deferred:** the Strategy-A trio (see
  Phase 1 acceptance) and the live `cached_tokens` measurement — run one real generation with
  `LOG_LLM_CALLS=true` and paste the `LLM usage summary [...]` line into Phase 0 (no Azure
  creds were exercised in this change).
- **2026-07-23** — `chore/llm-token-accounting`: **Phase 0 token accounting shipped**
  (measurement only, no behaviour change). Added `LlmCallUsage` + an optional
  `onUsage` hook to `GenerateOptions`
  ([`llm/llm.interface.ts`](../../apps/api/src/llm/llm.interface.ts)); the
  `AzureOpenAIProvider` now types the chat-completions response and reports
  normalized usage incl. `usage.prompt_tokens_details.cached_tokens`
  ([`llm/providers/azure-openai.provider.ts`](../../apps/api/src/llm/providers/azure-openai.provider.ts));
  `LLMService.runWithUsageTracking` aggregates per-call usage into a
  per-application summary via `AsyncLocalStorage`, wired through `callText` /
  `callJson` behind the existing `LOG_LLM_CALLS` flag
  ([`llm/llm.service.ts`](../../apps/api/src/llm/llm.service.ts)); the
  `ApplicationsController` wraps both generation entrypoints
  ([`applications/applications.controller.ts`](../../apps/api/src/applications/applications.controller.ts)).
  No-op passthrough with zero overhead when `LOG_LLM_CALLS` is unset.
  **Baseline capture still pending:** run one real generation with
  `LOG_LLM_CALLS=true` and paste the `LLM usage summary [...]` line here — expect
  `cached=0` on every call, confirming the current ~0-hit state before Phase 1.
- _(pending)_ Plan created.
