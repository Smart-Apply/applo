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

### Phase 0 — Measure the baseline `[ Status: 🚧 In progress — accounting shipped, baseline capture pending ]`

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
- [ ] Baseline captured in the [Changelog](#changelog) (cached ≈ 0 confirmed).

### Phase 1 — Restructure the prompts (the big lever) `[ Status: ⬜ Not started ]`

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
- [ ] All P1 prompts (live pipeline) reordered; variable `{{...}}` blocks are last.
- [ ] Serialized profile/job preamble is byte-identical across a run (spot-checked).
- [ ] `cached_tokens > 0` on calls 2–9 of a single generation.
- [ ] ≥ 50% of input tokens cached on the hot calls once warm.

### Phase 2 — Provider request shape `[ Status: ⬜ Not started ]`

- Pass **`prompt_cache_key`** (stable per template, e.g. the template path) in the
  request body to improve routing at concurrency.
- Optional: split into **`system` (static) + `user` (dynamic)** messages instead of one
  big user message — the cleanest cacheable prefix and aligns with the docs' guidance.
- Keep `response_format` behavior unchanged (schema stays a stable per-template prefix).

**Acceptance criteria**
- [ ] `prompt_cache_key` sent; hit rate improves vs. Phase 1 under load.
- [ ] `response_format` / structured outputs still pass `v1-schemas` tests.

### Phase 3 — Verify + eval (quality gate) `[ Status: ⬜ Not started ]`

Reordering can subtly shift model output (instruction position matters), so gate on eval.

- Run the A/B eval harness (LLM output-quality item #10) old-layout vs. new-layout on a
  fixed set of profiles/jobs.
- Confirm no regression in ATS coverage, grounding, style-lint, and length metrics.
- Record the measured cost delta (cached % and $/app before vs. after).

**Acceptance criteria**
- [ ] Eval shows no quality regression (DE + EN, cover letter + résumé).
- [ ] Measured per-application cost drop recorded in the [Changelog](#changelog).

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
