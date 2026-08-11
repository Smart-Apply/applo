# Grounding Hardening & Eval Power — Implementation Plan & Living Tracker

> **Fabricated numbers are the most damaging failure mode of an AI-written application.**
> A candidate can be challenged on an invented metric in an interview. This document is the
> single source of truth for closing the two gaps left open by the cover-letter repair pass
> shipped in [#772](https://github.com/Smart-Apply/applo/pull/772).
>
> ## 📌 How to use this document
> **Update this file on EVERY change that touches grounding or the eval harness's statistics.**
> Concretely:
> 1. Flip the phase's **Status** in the summary table.
> 2. Tick the relevant **Acceptance criteria** in that phase's section.
> 3. Add a dated entry to the **[Changelog](#changelog)** (newest first) with the PR/branch,
>    files touched, and the **measured** effect — never a projected one.
>
> Same discipline as the mandatory `README.md` / `ARCHITECTURE.md` doc-sync rule.

---

## Why this exists

On 2026-08-11 we shipped a guarded grounding-repair pass for the **cover letter**
(`prompts/v1/fix-unsupported-numbers.md` + `grounding/grounding-repair.util.ts`). Eight
24-fixture eval runs during that work surfaced two problems the pass does not solve.

### Problem 1 — the résumé is unprotected

`GroundingValidatorService` checks **both** documents, but the repair pass only fixes the
cover letter. Measured directly in the final run:

```
eval-repair-gpt54mini   repairApplied: 0   fixturesWithUnsupported: 1
  UNGROUNDED: customer-service-en  score=75  values=["5+"]
```

The repair never fired, yet a fabrication survived — because it was in the **résumé**, which
nothing repairs. This matters more than the cover-letter case, not less: résumé bullets are
where recruiters look for metrics, and `GroundingValidatorService` deliberately grounds
résumé numbers against the **profile only** (a job-ad KPI reappearing as a candidate
achievement *is* a fabrication).

### Problem 2 — the harness cannot resolve the effects we keep trying to measure

The headline grounding metric is **fixtures with zero fabrications ÷ 24**. At an observed
pass rate around 0.85 that is a binomial proportion with:

```
SE = sqrt(0.85 × 0.15 / 24) = ±7.3pp   →   95% CI ≈ ±14pp
```

We then observed exactly that. The gpt-5.4-mini arm moved **83% → 96% with zero repairs
executed** — a 13-point swing from a code change that provably did nothing on that arm.

That single result invalidated an earlier conclusion drawn in the same session ("longer
letters fabricate more, and prompt instructions can't fix it"), which had been based on a
consistent-looking 6-run split. With all eight runs in, the long-letter group spans 83–96 and
fully overlaps the short-letter group.

**Everything below Problem 2 is a prerequisite for trusting anything above it.** Phase 1
therefore ships *before* Phase 2 — otherwise we cannot tell whether the résumé repair worked.

---

## Status

| Phase | Scope | Status |
|---|---|---|
| **1** | Eval statistical power | ⬜ Not started |
| **1a** | Pooled claim-rate metric + CI (free) | ⬜ Not started |
| **1b** | `--repeat=N` + aggregation across runs | ⬜ Not started |
| **1c** | Paired A/B comparison tool | ⬜ Not started |
| **2** | Résumé grounding repair | ⬜ Not started |
| **2a** | Prompt + guard | ⬜ Not started |
| **2b** | Pipeline + harness wiring | ⬜ Not started |

---

## Phase 1 — Eval statistical power

**Goal:** be able to detect a 5pp change in fabrication rate, instead of being blind below
~14pp.

### 1a. Report the pooled claim rate, not the fixture pass rate `[ Free — no extra runs ]`

The harness already collects `totalChecked` and `unsupported` per fixture and then throws
that resolution away by collapsing to a binary per-fixture pass. Pooling the claims across
fixtures is strictly more information for zero additional cost:

| Run | fixture pass-rate (n=24) | pooled claims | unsupported | claim rate | claim SE |
|---|---|---|---|---|---|
| `41 orig` | 92% | 65 | 3 | 4.6% | ±2.6pp |
| `41 repair` | 88% | 65 | 7 | 10.8% | ±3.8pp |
| `54 nopad` | 83% | 61 | 6 | 9.8% | ±3.8pp |
| `54 repair` | 96% | 50 | 1 | 2.0% | ±2.0pp |

**±2.0–3.8pp versus ±7.3pp — roughly 2–3.5× tighter, for free.**

**Changes**
- `aggregate.ts`: add `grounding.totalClaims`, `grounding.unsupportedClaims`,
  `grounding.claimRate`, and a Wilson 95% interval (Wilson, not normal-approximation —
  the counts are small and the rate is near zero, where the normal approximation is
  actively wrong).
- `formatReport`: print claim rate + CI as the headline; keep the fixture pass-rate as a
  secondary line so historical runs stay comparable.

**Acceptance criteria**
- [ ] Claim rate + Wilson CI printed and persisted in the results JSON.
- [ ] Recomputed for the eight 2026-08-11 runs and recorded in the Changelog.
- [ ] Fixture pass-rate retained (do not break comparability with existing result files).

### 1b. `--repeat=N` `[ Cheap — linear cost ]`

LLM output is stochastic; one run per arm confounds the change under test with sampling
noise. Repeat each arm and pool.

```
claims per run ≈ 60      →  k=3 ≈ 180 claims, SE ≈ ±2pp
                            k=8 ≈ 480 claims, SE ≈ ±1.2pp
```

To detect a 5pp shift (10% → 5%) at 80% power needs ≈ 444 claims/arm, i.e. **k ≈ 8**. At
~€2/run that is ~€32 for a decision-grade comparison — affordable for a real decision, too
expensive for casual iteration. Default `k=1`; use `k≥3` for anything that ships.

**Changes**
- `run-eval.ts`: `--repeat=N`, loop the fixture pool N times, tag results `<tag>-r<i>`.
- `aggregate.ts`: pool across repeats; report per-repeat spread so instability is visible
  rather than averaged away.

**Acceptance criteria**
- [ ] `--repeat=3` produces one pooled summary plus per-repeat figures.
- [ ] The observed spread across repeats is reported, not hidden.

### 1c. Paired comparison tool `[ Highest power per euro ]`

Comparing two independent runs discards the fact that both arms ran the **same fixtures**.
A paired comparison removes fixture-to-fixture variance entirely and is the single biggest
power win available.

**Changes**
- New `scripts/eval/compare.ts`: takes two result files, joins on fixture id, reports
  per-fixture deltas, counts discordant pairs, and runs **McNemar's test** for the binary
  metrics plus a paired comparison for the continuous ones.
- Prefer continuous metrics (`grounding.score`, word count) over binary ones — they carry
  far more information per fixture.

**Acceptance criteria**
- [ ] `pnpm eval:compare <a.json> <b.json>` prints per-fixture deltas + a significance verdict.
- [ ] Re-run over the 2026-08-11 pairs; confirm it reports "not significant" for the
      repair A/B, matching the manual conclusion.

---

## Phase 2 — Résumé grounding repair

**Goal:** extend the guarded repair to the résumé, where the remaining measured fabrication
lives.

This is the **JSON analogue** of the shipped cover-letter pass, and the repo already has the
pattern twice: `evaluateResumeStyleRewrite` is exactly this shape for style violations, and
`isValidResumeEdit` already enforces the ID-preservation invariant. Reuse both.

### 2a. Prompt + guard

**Changes**
- New `prompts/v1/fix-unsupported-numbers-resume.md` — JSON→JSON, mirroring
  `resume-style-rewrite.md`. Rewrites only the prose fields carrying flagged figures
  (`rewritten_summary`, `rewritten_description`, `rewritten_achievements`,
  `rewritten_highlights`), replacing each with a truthful qualitative statement.
- New `evaluateResumeGroundingRepair` in `grounding/grounding-repair.util.ts`, mirroring
  the shipped cover-letter guard:

| Reject reason | Condition |
|---|---|
| `invalid` | fails `isValidResumeEdit` (dropped/mangled `profileExperienceId` / `profileProjectId`) |
| `not-cleaner` | unsupported count not strictly lower |
| `new-fabrication` | introduces a normalized value absent from the original findings |
| `style-regressed` | `countResumeStyleViolations` increased |

⚠️ **Do not reuse the cover-letter `underrun` guard.** It is length-band logic and has no
meaning for a résumé.

### 2b. Pipeline + harness wiring

**Changes**
- `generation.service.ts`: `runResumeGroundingRepairPass`, wired into both generation paths
  **after** `resume-style-rewrite` and **before** `runGroundingCheck`, so the existing check
  reports the post-repair state (same position as the cover-letter pass).
- `pipeline-runner.ts` + `run-eval.ts`: mirror it, extend `--no-grounding-repair` to cover
  both documents, and report `resumeRepairAppliedCount` separately from the cover-letter
  count — otherwise a zero cannot be distinguished from "never fired".
- Add `fix-unsupported-numbers-resume` to `PROSE_TEMPLATE_MARKERS` in `pipeline-runner.ts`.
  **This is not optional.** Omitting it silently routes the repair to the main model during a
  `--prose-mid` A/B while everything else runs on the mid model, handing the mid arm a better
  grounding number for free. The same omission was caught during the cover-letter work.

**Acceptance criteria**
- [ ] Skips with no LLM call when the résumé has no unsupported numbers.
- [ ] `isValidResumeEdit` rejection proven — a mangled `profileExperienceId` keeps the
      pre-repair payload.
- [ ] Measured with Phase 1's tooling at `k≥3`, reported as claim rate + CI.
- [ ] `resumeRepairAppliedCount` distinguishes "clean" from "fired and rejected".

---

## Risks & non-goals

| Risk | Mitigation |
|---|---|
| Repair mangles résumé structure | `isValidResumeEdit` already guards IDs; reject wholesale on failure |
| Repair strips *legitimate* numbers | Guard requires strictly-fewer unsupported and no new ones; the validator's corpus is unchanged |
| Phase 1 makes old result files incomparable | Keep the fixture pass-rate alongside the new metric |
| k≥3 runs get expensive | Default `k=1`; require `k≥3` only for ship decisions |

**Non-goals**
- Making `GroundingValidatorService` destructive. The guarded-pass pattern is deliberately
  non-destructive; a failed repair keeps the draft rather than mangling prose.
- Tuning the validator's detection rules. Precision-over-recall is a deliberate existing
  choice (see its class docstring) and is out of scope here.
- Expanding the fixture set from 24. Fixtures are hand-authored and profession-balanced;
  `--repeat` buys the same statistical power without that authoring cost.

---

## Changelog

_Newest first. Add an entry per PR/branch with the files touched and the **measured** effect._

- **2026-08-11** — `docs/grounding-hardening-plan`: created this tracker. Motivated by two
  findings from the [#772](https://github.com/Smart-Apply/applo/pull/772) cover-letter repair
  work: (a) `repairApplied: 0` alongside `fixturesWithUnsupported: 1` proved the résumé is
  unprotected, and (b) an **83% → 96% grounding swing with zero repairs executed** proved the
  fixture-level metric has a ±14pp 95% CI and cannot resolve the effects being tested. No code
  changes.
