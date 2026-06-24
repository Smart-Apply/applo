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
> and the eslint scope (it lives under `scripts/`, not `src/`).

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
| `--no-weave` | off | Skip the #6 keyword weave pass. Use for an A/B run: compare coverage with vs. without the loop. |
| `--no-anchor` | off | Omit the shared `GENERATION_SYSTEM_ANCHOR` system message from the cover-letter + resume-rewrite calls. Use for a clean A/B of the system/user split. |
| `--out=PATH` | `results/eval-<tag>-<ts>.json` | Override the output path. |

## What it measures

For each fixture the runner mirrors `ApplicationsService.createWithGeneration`:

1. `v1/skill-selector.md` (temp 0.2) → tailored profile
2. parallel `v1/cover-letter.md` + `v1/resume-rewrite.md` (temp 0.35) + `v1/ats-keywords.md`
   (then deterministic `matchAtsKeywordsToProfile`)
3. `v1/editor-cover-letter.md` (temp 0.4) — the #1 editor pass
4. `v1/keyword-weave.md` (temp 0.3) — the #6 keyword weave pass (skipped with `--no-weave`,
   or when there is no profile-supported priority-1 gap)

It then scores the output four ways:

- **LLM judge** (`prompts/eval/judge-rubric.md`, temp 0) — 6 rubric dimensions
  scored 1–5: `action_verb_bullets`, `quantified_or_qualitative`,
  `summary_targeting`, `cover_letter_personalization`, `style_no_cliches`,
  `language_correctness`, plus a holistic `overall`.
- **Grounding** (`GroundingValidatorService`, #7) — deterministic share of
  impact numbers in the output that trace back to the candidate profile.
- **Priority-1 keyword coverage** (#6, deterministic) — of the priority-1 ATS
  keywords the profile supports, the share that appear in the cover letter, both
  **before** and **after** the weave pass (so the lift is visible).
- **Style** (`style-lint.util.ts`, deterministic) — the share of fixtures whose
  finished documents contain zero forbidden AI clichés or German Konjunktiv/
  hedging (plus the raw violation count). A deterministic complement to the
  judge's holistic `style_no_cliches` dimension.

> The runner omits only PDF rendering + persistence (irrelevant to output
> quality). The keyword weave shares `keyword-coverage.util.ts` with the live
> service, so the harness measures the real loop.

> **Grounding caveat:** the validator checks the **profile only**, not the job
> posting. A number the model legitimately quotes from the posting (e.g. company
> size) is reported as `unsupported`. Read flagged values in that light.

> **Coverage caveat:** the improved Phase 1 cover-letter prompt already includes
> most priority-1 profile-supported keywords, so mean coverage starts high
> (~87% in the full eval) and the weave fires only on the minority of fixtures
> with a genuine gap (4/24 in the `phase3-weave` baseline, lifting the mean to
> 100%). No-gap fixtures are left byte-identical (the LLM call is skipped). The
> metric mainly exists to prove the lift and to catch regressions.

## Output

A console report (rubric means, grounding pass-rate, per-language breakdown,
per-fixture lines) plus a full JSON at `results/eval-<tag>-<timestamp>.json`
(git-ignored). Record headline numbers in the
[tracker changelog](../../../../docs/implementation/LLM_OUTPUT_QUALITY.md#changelog).

## Fixtures

`fixtures/*.json` — synthetic, profession-diverse (healthcare, manufacturing,
sales, marketing, education, finance, logistics, IT, hospitality, skilled
trades, HR, office admin, customer service, data, project management) across
**German + English**. The schema + hydration live in
[`fixture.types.ts`](./fixture.types.ts). Add a fixture by dropping a new JSON
file in `fixtures/` (filename = `id`) and running `pnpm eval:validate`.
