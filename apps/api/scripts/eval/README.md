# LLM-as-judge evaluation harness (item #10)

A standalone, **dev-only** harness that measures the quality of Applo's
generated CVs + cover letters. It runs the **real v1 generation chain** over a
set of committed golden fixtures, scores each output with an **LLM judge**
against the quality rubric (items #1/#3/#4/#5), runs the deterministic
**grounding validator** (#7), and prints + writes a timestamped summary.

Capture a **baseline** before a prompt/pipeline change and re-run after to prove
the lift (or catch a regression). It is the measurement backbone for the
[LLM output-quality roadmap](../../../../docs/implementation/LLM_OUTPUT_QUALITY.md).

> This harness is **never** run in production. It is excluded from the nest build
> This harness is **never** run in production and is excluded from the Nest build.
> It is included in the API workspace's ESLint scope.

## Quick start

```bash
cd apps/api

# Token-free structural check of every fixture (no LLM calls — safe in CI):
pnpm eval:validate

# Real baseline — needs Azure creds in apps/api/.env (see below):
pnpm eval:llm                       # all fixtures, tag "baseline"
pnpm eval:llm -- --limit=3          # cheap smoke run (first 3 fixtures)
pnpm eval:llm -- --only=healthcare-de,sales-en
pnpm eval:llm -- --tag=after-phase3 # name the run so results files don't clash
pnpm eval:llm -- --repeat=3 --tag=ship-candidate

# Pair two result files by fixture (+ repeat) and test their deltas:
pnpm eval:compare results/control.json results/candidate.json
```

### Requirements for a real run

The harness needs **real LLM credentials** because the `mock` provider ignores
prompts and would not measure anything. In `apps/api/.env`:

```bash
LLM_PROVIDER=azure-openai
AZURE_OPENAI_ENDPOINT=...
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_DEPLOYMENT_NAME=...
```

With `LLM_PROVIDER=mock` (or unset) the harness **skips gracefully** (exit 0).

## CLI flags

| Flag | Default | Purpose |
|---|---|---|
| `--validate` | off | Hydrate + serialize fixtures only, no LLM calls. Exit 1 if any fixture is malformed. |
| `--limit=N` | all | Only the first N fixtures (cheap smoke run). |
| `--only=a,b` | all | Run a specific comma-separated list of fixture ids. |
| `--tag=NAME` | `baseline` | Names the run + the output file. |
| `--concurrency=N` | `1` | Fixtures in flight at once. **Keep at 1** on small Azure deployments — higher values trip the rate limit + circuit breaker. |
| `--delay=MS` | `1500` | Pause between fixtures. |
| `--retries=N` | `5` | Retries on transient throttling (429/503/breaker-open) with exponential backoff (4s→64s, long enough to clear the 30s breaker reset). |
| `--repeat=N` | `1` | Run the selected fixture pool N times, persist one pooled summary, and retain per-repeat figures + spread under `<tag>-rN`. |
| `--no-weave` | off | Skip the #6 keyword weave pass. Use for an A/B run: compare coverage with vs. without the loop. |
| `--no-anchor` | off | Omit the shared `GENERATION_SYSTEM_ANCHOR` system message from the cover-letter + resume-rewrite calls. Use for a clean A/B of the system/user split. |
| `--no-style-rewrite` | off | Skip BOTH style-rewrite "teeth" passes (cover letter + résumé). Use for an A/B of the deterministic-linter enforcement step. |
| `--no-length-governor` | off | Skip the guarded length-governor shorten pass. Use to measure the raw overrun rate the base prompts produce. |
| `--no-grounding-repair` | off | Skip BOTH guarded grounding-repair passes (cover letter + résumé). Use to measure the raw unsupported-number rate before enforcement. |
| `--prose-mid` | off | Route the candidate-facing **writing + revision** calls (`cover-letter`, `resume-rewrite`, `editor-*`, `keyword-weave`, `style-rewrite`, `resume-style-rewrite`, `shorten-cover-letter`, `fix-unsupported-numbers`, `fix-unsupported-numbers-resume`) through the **mid lane** (`LLM_MID_MODEL`) for a prose-model A/B. Extraction stays on the fast lane and the **judge stays on the main model**, so the challenger never grades itself. Errors out when `LLM_MID_MODEL` is unset — otherwise both arms would silently be identical. |
| `--out=PATH` | `results/eval-<tag>-<ts>.json` | Override the output path. |

## What it measures

For each fixture the runner mirrors `GenerationService.createWithGeneration`:

1. `v1/skill-selector.md` (temp 0.2) → tailored profile
2. parallel `v1/cover-letter.md` + `v1/resume-rewrite.md` (temp 0.35) + `v1/ats-keywords.md`
   (then deterministic `matchAtsKeywordsToProfile`)
3. `v1/editor-cover-letter.md` (temp 0.4) — the #1 editor pass
4. `v1/keyword-weave.md` (temp 0.3) — the #6 keyword weave pass (skipped with `--no-weave`,
   or when there is no profile-supported priority-1 gap)
5. `v1/style-rewrite.md` (temp 0.3) — the style-rewrite "teeth" pass (skipped with
   `--no-style-rewrite`, or when the post-weave letter is already clean)
6. `v1/shorten-cover-letter.md` (temp 0.3) — the guarded length-governor pass (skipped with
   `--no-length-governor`, or when the letter is within its word budget)
7. `v1/fix-unsupported-numbers.md` (temp 0.3) — the guarded grounding-repair pass (skipped
   with `--no-grounding-repair`, or when every cover-letter impact number is grounded)
8. `v1/editor-resume.md` (temp 0.35) — the résumé editor pass (JSON→JSON, ID-preserving)
9. `v1/resume-style-rewrite.md` (temp 0.3) — the résumé style-rewrite "teeth" pass (JSON→JSON,
   ID-preserving; skipped with `--no-style-rewrite`, or when the résumé prose is already clean)
10. `v1/fix-unsupported-numbers-resume.md` (temp 0.3) — the résumé grounding-repair pass
  (strict JSON→JSON, ID-preserving; skipped with `--no-grounding-repair`, or when every
  résumé impact number is grounded against the profile)

It then scores the output as follows:

- **LLM judge** (`prompts/eval/judge-rubric.md`, temp 0) — 6 rubric dimensions
  scored 1–5: `action_verb_bullets`, `quantified_or_qualitative`,
  `summary_targeting`, `cover_letter_personalization`, `style_no_cliches`,
  `language_correctness`, plus a holistic `overall`.
- **Grounding** (`GroundingValidatorService`, #7) — deterministic unsupported-value
  rate pooled over every distinct checked impact number, with a descriptive Wilson
  95% interval. Values are de-duplicated within each fixture, so the interval is a
  compact stability signal rather than an independence-based power claim. Runs with
  no checked impact numbers report `n/a`, never a perfect zero-width interval. The
  historical fixture pass-rate remains as a secondary line. Résumé claims must
  trace to the profile; cover-letter claims may also quote the job posting.
  Metrics use the FINAL documents after both guarded repair passes. Separate
  attempted/accepted/failed counts for each document distinguish clean skips,
  guard rejections, accepted repairs, and provider fallback.
- **Repeat stability + paired comparison** — `--repeat=N` pools claims while
  printing each repeat's rate/spread. `pnpm eval:compare <a> <b>` joins by fixture
  and repeat, then clusters repeats by fixture for inference. Exact McNemar treats
  a fixture as grounded only when all of its repeats are grounded; continuous
  metrics average repeats within each fixture before computing paired 95%
  Student-t intervals. The report distinguishes generated observation pairs from
  independent fixture clusters and prints metric-specific exclusions.
- **Priority-1 keyword coverage** (#6, deterministic) — of the priority-1 ATS
  keywords the profile supports, the share that appear in the cover letter, both
  **before** and **after** the weave pass (so the lift is visible).
- **Style** (`style-lint.util.ts`, deterministic) — the share of fixtures whose
  finished documents contain zero forbidden AI clichés, German Konjunktiv/
  hedging, or anglicised German verb-first résumé bullets (plus the raw violation
  count). A deterministic complement to the
  judge's holistic `style_no_cliches` dimension. The report also counts how many
  fixtures the **style-rewrite "teeth" passes** improved — separately for the cover
  letter and the résumé (with per-fixture before→after violation counts in the JSON)
  — a within-run, controlled measure of the enforcement step.
- **Cover-letter length** (`lintCoverLetterLength`, deterministic) — mean body
  word count and the overrun rate of the finished letters against the standard
  word budget (`COVER_LETTER_BUDGETS`), plus how many fixtures the guarded
  **length-governor pass** shortened (per-fixture before→after word counts in
  the JSON). Makes the "grundsätzlich immer viel zu lang" complaint a measured,
  falsifiable number.
- **Cost & prompt caching** (`usage`, always captured) — per generation the
  runner wraps the v1 chain in `LLMService.runWithUsageCapture`, so the report
  shows mean input / cached-input / output tokens, the **cached input share**
  (`cached_tokens / prompt_tokens`), and an estimated **$/generation with vs.
  without caching** plus the savings (documented gpt-4.1 Standard rates in
  [`aggregate.ts`](./aggregate.ts) — the relative savings is rate-robust). The
  judge call is deliberately outside the capture scope, so the numbers reflect
  only the production-equivalent per-application cost. This is the measurement
  backbone for [prompt caching](../../../../docs/implementation/PROMPT_CACHING.md)
  (Phase 0/3): on the new prompt layout the cached share should be > 0 across the
  back-to-back call burst; on the old layout it is ~0. Needs `LOG_LLM_CALLS=true`
  for the per-call lines, but the aggregate `usage` is captured regardless.

> The runner omits only PDF rendering + persistence (irrelevant to output
> quality). The keyword weave shares `keyword-coverage.util.ts` with the live
> service, so the harness measures the real loop.

> **Grounding corpus:** résumé claims use the **profile only**; a job-ad KPI in a
> candidate achievement is unsupported. Cover-letter claims use profile + job
> posting, so legitimate company-size or salary references are not flagged.

> **Coverage caveat:** the improved Phase 1 cover-letter prompt already includes
> most priority-1 profile-supported keywords, so mean coverage starts high
> (~87% in the full eval) and the weave fires only on the minority of fixtures
> with a genuine gap (4/24 in the `phase3-weave` baseline, lifting the mean to
> 100%). No-gap fixtures are left byte-identical (the LLM call is skipped). The
> metric mainly exists to prove the lift and to catch regressions.

## Output

A console report (rubric means, pooled grounding claim-rate + Wilson interval,
fixture pass-rate, repeat spread, per-language breakdown, per-fixture lines) plus
a full JSON at `results/eval-<tag>-<timestamp>.json`
(git-ignored). Record headline numbers in the
[tracker changelog](../../../../docs/implementation/LLM_OUTPUT_QUALITY.md#changelog).

## Fixtures

`fixtures/*.json` — synthetic, profession-diverse (healthcare, manufacturing,
sales, marketing, education, finance, logistics, IT, hospitality, skilled
trades, HR, office admin, customer service, data, project management) across
**German + English**. The schema + hydration live in
[`fixture.types.ts`](./fixture.types.ts). Add a fixture by dropping a new JSON
file in `fixtures/` (filename = `id`) and running `pnpm eval:validate`.
