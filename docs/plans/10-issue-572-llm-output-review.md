# 10 — LLM output quality review

**Issue:** #572 · **Phase:** deferred · **Effort:** ~2–3 days · **Owner:** dev

---

## Goal

Establish, with evidence, where generated CVs and cover letters are actually
weak — across professions and both languages — and turn that into prioritised
follow-up issues.

## Why this is deferred rather than dropped

The generated document *is* the product, so this is high-value. But it is
deferred behind Phase 0 for one reason: **the pipeline has changed a lot very
recently**, and a review conducted mid-change measures a moving target.

Landed in the last weeks: grounding repair hardening (#774), cover-letter length
banding (#770, #772), the mid routing lane (#767), reasoning-model parameter
handling (#769). Let those settle, then measure.

## Verified current state

There is already substantial machinery here — this is not a blank slate:

- [docs/implementation/LLM_OUTPUT_QUALITY.md](../implementation/LLM_OUTPUT_QUALITY.md)
  is the living roadmap and status tracker.
- [GROUNDING_HARDENING.md](../implementation/GROUNDING_HARDENING.md) covers the
  anti-hallucination work.
- Deterministic checkers exist and are reusable as scorers: the grounding
  validator, `style-lint.util.ts`, `keyword-coverage.util.ts`.
- An eval harness exists with a 24-fixture A/B and a `--prose-mid` flag.
- [LLM_MODEL_SELECTION.md](../guides/LLM_MODEL_SELECTION.md) records the
  Mistral prose rejection with its evidence.

## The methodological constraint

Two lessons from this repo's own history, both of which cost real time:

**1. The metric must be able to resolve the effect.** A binomial pass-rate over
24 fixtures at p≈0.85 has a 95 % CI of roughly ±14 pp. A previous run showed an
83 %→96 % swing from a change that provably executed zero times — pure sampling
noise, briefly read as a real effect. Pool the underlying events (≈60 claims
across 24 fixtures gives ±2–4 pp) rather than collapsing to per-fixture
pass/fail, and prefer continuous scores over binary ones. Use a paired design —
same fixtures both arms — so item variance cancels.

**2. Graceful fallback makes a broken config look like "no difference."** The
mid-lane experiment 400'd on every call and silently fell back to the main
model; a full A/B would have compared `gpt-4.1` to itself and concluded the
models were equivalent. Before any long run, smoke-test one fixture and grep
the output for `lane call failed` and for the expected model name.

## Scope

1. **Fixtures across professions** — healthcare, manufacturing, sales,
   marketing, education, trades, and IT. Not IT-only; the product is explicitly
   domain-agnostic and an IT-only sample would hide its most likely weakness.
2. **Both languages** — DE and EN.
3. **Deterministic scoring first**, reusing the existing checkers: unsupported
   impact numbers, style-lint findings, ATS coverage, guarded-pass fallback
   rate. The fallback rate is a free, high-signal proxy for "did the model
   produce something valid."
4. **Human review** of a sample, categorised: factual grounding, ATS coverage,
   tone, structure (Betreff / Anrede / close), PDF formatting fidelity.
5. **Write findings into `LLM_OUTPUT_QUALITY.md`** and open one issue per
   actionable improvement.

## Out of scope

- Building the eval platform (#623). This review uses the existing harness.
- Prompt changes. This plan produces evidence; fixes are follow-up issues.
- Model switching.

## Acceptance criteria

> **Status 2026-08-16 (#572).** Review delivered as
> [docs/implementation/LLM_OUTPUT_QUALITY_REVIEW_2026-08.md](../implementation/LLM_OUTPUT_QUALITY_REVIEW_2026-08.md),
> backed by a reproducible offline probe
> ([`scripts/eval/output-quality-probe.ts`](../../apps/api/scripts/eval/output-quality-probe.ts),
> `pnpm --filter @applo/api run eval:probe`). No paid LLM run was performed — see the
> annotations below and §7 of the review for the pre-specified protocol.

- [x] ≥ 7 professions × 2 languages covered, with fixture list recorded.
      → 15 profession families / 24 fixtures, matrix recorded in the review.
- [ ] A one-fixture smoke test confirming the intended model actually served
      the run, with no fallback warnings — run and recorded **before** the full
      batch.
      → **Deferred with the paid run** (no Azure credentials available). Kept as
      step 1 of the protocol in review §7.
- [x] Deterministic scores reported as pooled event counts with confidence
      intervals, not as per-fixture pass rates.
      → Pooled over all 24 fixtures with Wilson intervals (e.g. grounding-detector
      recall 23/81 = 28 %, 95 % CI 20–39). Measured against the *checkers*, not
      against model output, because the review found the checkers under-cover the
      defect space — fix the instrument before buying the measurement.
- [x] Written review with concrete good and bad examples quoted.
      → Includes the rendered PDF's full extracted text and our own
      `cover-letter.md` example openings as the worked bad case.
- [x] `LLM_OUTPUT_QUALITY.md` status table and changelog updated.
      → Follow-up table R1–R10 + dated changelog entry + Betreffzeile decision
      re-opened.
- [x] One follow-up issue per prioritised improvement, each with a measurable
      acceptance criterion.
      → R1–R10 specified with probe-gated criteria (`GAP` → `OK`), ready to file
      as issues.

## Risks and landmines

- Running the full matrix costs real money. Scope the fixture count deliberately
  and check that the sample size can resolve the effect you care about *before*
  spending.
- Reasoning models (GPT-5 family, o-series) reject `temperature`, `top_p`,
  penalties, and `max_tokens` — the cap is `max_completion_tokens`. If a lane
  points at one, the pipeline's tuned per-call temperatures are silently
  ignored and hidden reasoning tokens bill as output. Note which model served
  each arm.
- Judge-model bias: if an LLM judge is used, pin it to a single model for the
  whole comparison and prefer pairwise A/B over absolute scoring.

## Doc sync

`LLM_OUTPUT_QUALITY.md` is the deliverable. If the review changes the pipeline,
`ARCHITECTURE.md` and the pipeline section of
[.github/copilot-instructions.md](../../.github/copilot-instructions.md) follow.
