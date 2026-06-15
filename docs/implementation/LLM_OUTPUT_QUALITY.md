# LLM Output Quality — Implementation Plan & Living Tracker

> **The LLM output is Smart Apply's main quality driver.** This document is the single
> source of truth for the 10 improvements we are making to the generated CVs and cover
> letters.
>
> ## 📌 How to use this document
> **Update this file on EVERY change that touches generation quality** (prompts, the
> generation pipeline, validators, the eval harness). Concretely:
> 1. Flip the item's **Status** in the summary table.
> 2. Tick the relevant **Acceptance criteria** in that item's section.
> 3. Add a dated entry to the **[Changelog](#changelog)** at the bottom (newest first),
>    with the PR/branch and the files touched.
>
> Treat this like the mandatory `README.md` / `ARCHITECTURE.md` doc-sync rule: a change
> that improves output quality but leaves this tracker stale is an incomplete change.

---

## Why this exists

We researched what makes excellent applications (Jobscan's ATS guidance, the Harvard/
Google "XYZ" bullet formula, The Muse's cover-letter guide, and the German-market
standards from Karrierebibel — relevant because Smart Apply is German-first) and audited
the live generation code. The 10 items below close the gap between what we generate today
and what recruiters + ATS systems actually reward.

**Guiding principles**
- **Profession-neutral.** Every prompt/example must work for a nurse, CNC operator,
  sales lead or software engineer — never default to IT phrasing.
- **No fabrication.** We never invent metrics, employers, certifications, salaries or
  dates. Honesty is both a credibility and a legal requirement.
- **German-first, language-correct.** Output language follows the job posting; German
  output must read like a native wrote it (no machine-translation tells, no Konjunktiv
  hedging, no AI-cliché phrases).
- **Measure before/after.** Quality changes should be validated against the eval harness
  (item #10) so we can prove gains and catch regressions.

---

## Current generation architecture (as of 2026-06-15)

The **live** path is the v1 "single-LLM pipeline" inside
[`applications.service.ts`](../../apps/api/src/applications/applications.service.ts)
`create()`. It runs entirely through `LLMService.callJson` / `callText`:

| Step | Prompt | Call | Purpose |
|---|---|---|---|
| 1 | [`v1/skill-selector.md`](../../apps/api/prompts/v1/skill-selector.md) | `callJson` (temp 0.2) | Select the most relevant profile data → `tailoredProfile` |
| 2a | [`v1/cover-letter.md`](../../apps/api/prompts/v1/cover-letter.md) | `callText` | Cover letter (Markdown → HTML) |
| 2b | [`v1/resume-rewrite.md`](../../apps/api/prompts/v1/resume-rewrite.md) | `callJson` (temp 0.35) | Rewrite summary / experiences / projects |
| 2c | [`v1/ats-keywords.md`](../../apps/api/prompts/v1/ats-keywords.md) | `callJson` | Extract ≤15 job keywords, then **deterministic** match vs. profile |
| 2d | [`v1/editor-cover-letter.md`](../../apps/api/prompts/v1/editor-cover-letter.md) | `callText` | **Editor pass (#1):** critique + revise the cover letter; graceful fallback to the draft |
| 3 | — | code | `convertTailoredProfileToResumeJson` → stored as `resumeText` (JSON) |
| 4 | — | code | **Grounding check (#7):** flag fabricated impact numbers vs. profile (log only, non-destructive) |

Steps 2a/2b/2c run in **parallel** (`Promise.all`). The editor pass (2d) runs **after** the
draft is produced (sequential by nature); the grounding check (4) runs on the finalized
documents. Resume is persisted as structured JSON for the editor; the cover letter is
persisted as HTML for the PDF. Both live paths — `createWithGeneration` (main) and
`generateWithSinglePipeline` (test endpoint) — share the editor + grounding helpers.

**Dead / optional code (do not confuse with the live path):**
- ~~`apps/api/src/agents/**` (the old Azure AI Foundry agent classes)~~ **Removed (#2,
  2026-06-15).** The two still-live types (`ATSAgentOutput`, `ProfileData`) were relocated
  to [`keywords/keywords.types.ts`](../../apps/api/src/keywords/keywords.types.ts); the
  unused `AgentsModule` wiring was dropped from `ApplicationsModule`.
- `azure-ai-foundry.provider.ts` is only reachable when `LLM_PROVIDER=azure-ai-foundry`,
  in which case the same v1 prompt calls are routed to Foundry agents. With
  `azure-openai` / `mock` it is never touched.
- ~~The legacy `prompts/resume-ats.md` / `prompts/cover-letter-ats.md` (+
  `generateResumeATS` / `generateCoverLetterATS`)~~ **Removed (#2, 2026-06-15).** The
  edit-mode regenerate flow (`upsertCoverLetter`) now reuses `v1/cover-letter.md` via
  [`stored-resume.util.ts`](../../apps/api/src/applications/stored-resume.util.ts); the
  unused standard `cover-letter.md` / `resume.md` prompts + `generateCoverLetter` /
  `generateResume` were retired in the same change.

---

## Status summary

**Legend:** 🔴 Planned · 🟡 In progress · 🟢 Shipped

| # | Improvement | Phase | Risk | Status | Primary files |
|---|---|---|---|---|---|
| 2 | Consolidate onto one pipeline; retire dead/legacy paths | 1 | Low | � Shipped | `agents/**`, `prompts/*-ats.md`, `stored-resume.util.ts`, `applications.service.ts` |
| 3 | XYZ/STAR achievement-bullet formula | 1 | Low | 🟢 Shipped | `prompts/v1/resume-rewrite.md` |
| 4 | Make the professional summary / Kurzprofil do real work | 1 | Low | 🟢 Shipped | `prompts/v1/resume-rewrite.md` |
| 5 | Real cover-letter personalization | 1 | Low | � Shipped | `prompts/v1/cover-letter.md`, `prompts/v1/job-facts.md`, `job-facts.util.ts` |
| 1 | Self-critique / editor pass | 2 | Med | 🟡 In progress | `prompts/v1/editor-cover-letter.md`, `applications.service.ts` |
| 7 | Anti-hallucination grounding validator | 2 | Med | 🟢 Shipped | `grounding/grounding-validator.service.ts`, `applications.service.ts` |
| 6 | Coverage-driven keyword loop | 3 | Med | 🟢 Shipped | `applications.service.ts`, `keyword-coverage.util.ts`, `prompts/v1/keyword-weave.md` |
| 9 | Trustworthy + actionable match score | 3 | Low | 🟢 Shipped | `applications.service.ts`, `match-insights.util.ts`, web ATS panel |
| 8 | Structured outputs (JSON schema) instead of regex repair | 4 | Med-High | 🟢 Shipped | `llm/providers/azure-openai.provider.ts`, `llm/schemas/v1-schemas.ts`, `llm.service.ts` |
| 10 | LLM-as-judge evaluation harness | 4 (start early) | Low | 🟢 Shipped | `apps/api/scripts/eval/**`, `prompts/eval/judge-rubric.md` |

> **Doc-sync note:** items **#1, #6, #7, #8** change the generation pipeline / a provider,
> so when they ship they MUST also update `README.md` + `ARCHITECTURE.md` +
> `.github/copilot-instructions.md` per the repo's mandatory doc-sync rule. Prompt-only
> items (#3, #4, #5) do not.

---

## Phased rollout

- **Phase 1 — Prompt guardrails (no architecture change).** #2 (doc/cleanup), #3, #4, #5.
  Immediate quality lift, fully reversible, no README/ARCHITECTURE churn.
- **Phase 2 — Correctness & polish (highest leverage).** #1 editor pass, #7 grounding
  validator. Biggest measurable jump; needs doc-sync.
- **Phase 3 — ATS intelligence.** #6 coverage-driven keyword weaving, #9 trustworthy
  match score surfaced to the user.
- **Phase 4 — Reliability & measurement.** #8 structured outputs, #10 eval harness.
  > Recommended: stand up a minimal version of **#10 first** so Phases 1–3 can be scored
  > before/after.

---

## Detailed specs

### 1. Self-critique / editor pass 🔴
**Problem.** Generation is one-shot. No pass checks the draft against an explicit rubric,
so clichés, missing metrics, weak summaries and generic cover letters slip through.

**Approach.** Add a second LLM call that scores the draft against a rubric and rewrites
once. Two variants:
- **Cover letter** (text→text, lowest risk, highest cliché-reduction value) — start here.
- **Resume** (JSON→JSON mirroring `resume-rewrite`, preserving `profileExperienceId`s).

**Rubric the editor enforces** (returns findings, then a revised draft):
- Every bullet = action verb + (metric **or** concrete qualitative outcome); no "responsible for"/passive chains.
- No forbidden-cliché phrase; no Konjunktiv (DE); no superlatives; enthusiasm dialled down.
- Summary contains exact job title + years + top keywords + one quantified achievement.
- Cover letter has ≥1 concrete company-specific reference; not a CV restatement.
- Length / language correct; no closing phrase or name where the template adds them.
- **Grounding:** every number/claim traces to the source profile.

**Files.** new `prompts/v1/editor-cover-letter.md` (+ later `editor-resume.md`);
`LLMService.runEditorPass(...)`; wire as a step in `applications.service.ts` `create()`,
guarded (graceful degradation: on failure keep the original draft).

**Shipped (cover letter).** `prompts/v1/editor-cover-letter.md` +
`runCoverLetterEditorPass` in `applications.service.ts`, wired into **both** live paths
(`createWithGeneration` + `generateWithSinglePipeline`). Temp 0.4, max 1500 tokens.
Graceful degradation: on any error or a suspiciously short result (<50% of the draft
length) we keep the original draft, so generation never breaks. The editor is also
forbidden from introducing new facts/metrics — it can only tighten what's there.

**Shipped (resume).** [`prompts/v1/editor-resume.md`](../../apps/api/prompts/v1/editor-resume.md)
+ `runResumeEditorPass`, wired into `createWithGeneration` (the only path that produces the
structured `RewrittenProfileDto`). JSON→JSON, temp 0.35. The critical risk — the editor
dropping or mangling a `profileExperienceId` / `profileProjectId` (which silently loses the
rewritten, often translated content) — is guarded by a pure, unit-tested
[`isValidResumeEdit`](../../apps/api/src/applications/resume-editor.util.ts): it rejects any
edit that changes the ID multiset, empties a previously-populated entry, or returns a
malformed payload, falling back to the pre-edit payload. Verified on real Azure (eval flag
`resume-editor` applied 3/3, all parses clean, OVERALL unchanged). 10 unit tests.

**Acceptance.**
- [x] Cover-letter editor pass live in **both** pipelines with graceful fallback.
- [x] Editor latency made visible to the user (wizard step + SSE progress).
- [x] Resume editor pass live (summary + achievements), IDs preserved (guarded fallback).
- [ ] Eval (#10) shows rubric-score improvement vs. no-editor baseline.
- [x] README + ARCHITECTURE + copilot-instructions updated (pipeline change).

---

### 2. Consolidate onto one pipeline �
**Problem.** Three generation paths coexist (live v1 prompts, dead `agents/**`, legacy
`*-ats.md`). Quality fixes keep landing in the wrong place.

**Approach.**
- Declare the **v1 single-LLM pipeline** the one true path (done — it is already live).
- Remove the unused `apps/api/src/agents/**` Foundry agent classes + their module wiring
  (separate, clearly-scoped PR — verify nothing imports them, incl. tests + DI tokens).
- Migrate the edit-mode regenerate flow (`upsertCoverLetter`) off `cover-letter-ats.md`
  onto `v1/cover-letter.md`, then retire `resume-ats.md` / `cover-letter-ats.md`.
- Confirm `infra/Dockerfile` still COPYs the `prompts/` dir (it does) and that no removed
  path is referenced in a prod-stage `COPY`.

**Progress (2026-06-15).** **Part 1** deleted the dead `apps/api/src/agents/**` Foundry agent
classes (11 files; live types `ATSAgentOutput` / `ProfileData` relocated to
`keywords/keywords.types.ts`, `AgentsModule` dropped from `ApplicationsModule`). **Part 2**
migrated the edit-mode regenerate flow (`upsertCoverLetter`) onto `v1/cover-letter.md`: the
saved editor resume is mapped into a `TailoredProfileDto` by the new pure
[`stored-resume.util.ts`](../../apps/api/src/applications/stored-resume.util.ts)
(`mapStoredResumeToTailoredProfile`, 11 unit tests), then runs job-facts extraction + the
deterministic salutation — the same #1/#5/#6 quality the create pipeline gets. The legacy
`cover-letter-ats.md`, `resume-ats.md` and the now-unused standard `cover-letter.md` /
`resume.md` prompts were deleted, along with `generateCoverLetterATS` / `generateResumeATS` /
`generateCoverLetter` / `generateResume` + their `buildATS*Context` helpers and context
interfaces in `llm.service.ts`, plus `buildCoverLetterContext` / `buildATSCoverLetterContext` /
`buildATSResumeContext` / `getKeywordsForGeneration` / `matchKeywordsForLLM` in
`applications.service.ts`. No Dockerfile COPY referenced a removed path; `nest build` clean;
a real-Azure smoke of the regenerate path produced a personalized German cover letter
(company specifics woven, salary/start-date addressed only because the posting asked, no
placeholder leak).

**Acceptance.**
- [x] This tracker documents the canonical path + dead code (so fixes land correctly).
- [x] `agents/**` removed (live types relocated to `keywords/keywords.types.ts`).
- [x] Edit-mode regenerate uses v1 prompts; `*-ats.md` deleted.
- [x] README/ARCHITECTURE updated to describe one pipeline.

---

### 3. XYZ / STAR achievement-bullet formula 🟢
**Problem.** Bullets described duties ("Responsible for…") instead of measurable results.

**Shipped.** Added an **ACHIEVEMENT BULLET FORMULA** section to
[`v1/resume-rewrite.md`](../../apps/api/prompts/v1/resume-rewrite.md): XYZ formula
(*Accomplished X measured by Y by doing Z*), quantify-when-supported, **no invented
numbers** with a concrete qualitative fallback, one-idea-per-bullet, profession-diverse
good/bad examples (nurse, CNC, marketing, sales, dev).

**Acceptance.**
- [x] Formula + profession-diverse examples in the live resume prompt.
- [x] Explicit "no fabricated metrics → qualitative fallback" rule (reinforces grounding).
- [ ] Verified against eval set (#10) once it exists.

---

### 4. Professional summary / Kurzprofil does real work 🟢
**Problem.** The summary was vague ("3-4 sentences targeting the role"), wasting the
highest-weighted ATS zone.

**Shipped.** Added **PROFESSIONAL SUMMARY REQUIREMENTS** to
[`v1/resume-rewrite.md`](../../apps/api/prompts/v1/resume-rewrite.md): must include the
exact target job title + years of experience (only if derivable) + top 3-5 matching
keywords + one quantified/concrete achievement; 50-80 words; profession-neutral; no
clichés. Tightened the `rewritten_summary` JSON field hint to match.

**Acceptance.**
- [x] Summary spec in the live resume prompt + JSON hint.
- [ ] Verified against eval set (#10).

---

### 5. Real cover-letter personalization �
**Problem.** Letters used "Sehr geehrte Damen und Herren", lacked a concrete company
reference (the #1 auto-reject signal), and ignored explicit salary / start-date asks.

**Shipped (prompt-level).** In [`v1/cover-letter.md`](../../apps/api/prompts/v1/cover-letter.md):
named-salutation selection from the posting `fullText`; mandatory concrete company
reference; salary/start-date only when explicitly requested; tone-down of enthusiasm;
no Konjunktiv/hedging; expanded quality-check list.

**Shipped (data layer).** A dedicated extraction step
([`v1/job-facts.md`](../../apps/api/prompts/v1/job-facts.md) + `extractJobFacts`) now pulls
structured facts from the posting — the named contact person, 1-3 concrete company
specifics, and explicit `asks_salary` / `asks_start_date` flags — **before** the cover
letter is written, instead of asking the writer to scan `fullText` mid-draft. It runs **in
parallel with `skill-selector`** in both live pipelines (no added critical-path latency),
uses Azure strict `json_schema` (#8), and degrades gracefully (a failed/invalid extraction
falls back to the prompt scanning `fullText` itself). The salutation is then built
**deterministically** in code ([`job-facts.util.ts`](../../apps/api/src/applications/job-facts.util.ts)
`buildSalutation`: gendered "Sehr geehrte Frau …" / "Dear Mr. …", English-name fallback,
generic otherwise) and passed to the prompt as a verbatim line, so the greeting no longer
depends on the LLM. Verified on real Azure (job-facts parses clean, personalization 5.00).
13 unit tests.

**Betreffzeile decision (recorded).** **Skip for now.** A subject line is a *template*
change, not a prompt change — `CoverLetterTemplateData`
([`pdf-v2/template-data.ts`](../../apps/api/src/pdf-v2/template-data.ts)) has no `subject`
field, and the PDF template owns the letter header (recipient, date). Adding one means a
schema + template + renderer change across all cover-letter templates for low marginal
value now that the salutation + company reference are solid. Revisit under PDF templates if
requested.

**Acceptance.**
- [x] Named salutation + concrete company reference + salary/start-date guardrails live.
- [x] Ansprechpartner/company-facts extraction step feeding the prompt.
- [x] Betreffzeile decision recorded (template vs. skip) — **skip** (template change, deferred).

---

### 6. Coverage-driven keyword loop 🟢
**Problem.** We extract keywords and *measure* match after the fact; we never close the
loop by weaving in high-priority keywords the profile genuinely supports.

**Approach.** After generation, compute coverage of **priority-1** keywords. For any
high-priority keyword that is missing **but supported by the profile**
(`matchKeywordsAgainstProfile` says `both`), run one targeted weave-in pass — guarded
against keyword stuffing (density stays natural, context required). Never weave a keyword
the profile doesn't support (that would be fabrication).

**Files.** `applications.service.ts` (post-generation step), `keywords/**`, possibly a
small `prompts/v1/keyword-weave.md`.

**Shipped.** [`keyword-coverage.util.ts`](../../apps/api/src/applications/keyword-coverage.util.ts)
is a pure, unit-tested module that (a) matches extracted ATS keywords against the profile
(`matchAtsKeywordsToProfile` — extracted from the service so the eval harness reuses the
identical matcher), (b) selects the priority-1, `source: 'both'` keywords still missing from
the cover letter (`selectKeywordsToWeave`, capped at 3, word-boundary aware), and
(c) computes priority-1 coverage (`computePriority1Coverage`). `runKeywordWeavePass` in
`applications.service.ts` runs **one** guarded `prompts/v1/keyword-weave.md` pass that weaves
only those profile-supported gaps into the existing prose — no stuffing, never an
unsupported keyword, never a new number. It is wired into **both** live paths after the
editor pass, **skips the LLM call entirely when there is no gap**, and degrades gracefully
(keeps the pre-weave draft on failure or a <60%-length result). The grounding check runs on
the woven output. 13 unit tests. The eval harness (#10) gained a deterministic priority-1
coverage metric (before/after weave) + a `--no-weave` A/B flag.

**Measured impact (full eval, gpt-4.1, 24 fixtures, tag `phase3-weave`).** The improved
Phase 1 cover-letter prompt already includes most priority-1 profile-supported keywords, so
mean priority-1 coverage starts high (**87.33%**). The weave pass fired on **4 / 24**
fixtures — the minority with a genuine gap — and lifted mean coverage to **100%** (e.g.
`sales-de` 0→100% weaving *Neukundengewinnung*, `sales-en` 0→100% *B2B sales*, `logistics-de`
67→100% *Fachwirt*, `marketing-en` 67→100% *email/agency management*). Grounding still passed
on every woven letter (no new ungrounded numbers), and the 20 fixtures with no gap were left
byte-identical (the LLM call is skipped entirely). So the loop is a **targeted safety net**:
it does nothing when the draft is already complete and closes real gaps when they exist,
never stuffing or fabricating. The coverage metric also guards against future regressions
(e.g. a prompt change that starts dropping priority-1 keywords).

**Acceptance.**
- [x] Priority-1 coverage computed post-generation (deterministic, in the harness).
- [x] Single guarded weave-in pass for profile-supported gaps only; no stuffing; never adds
      an unsupported keyword; graceful degradation.
- [x] Eval shows the lift (mean priority-1 coverage 87.33% → 100%, weave fired on 4/24);
      grounding still passes on woven output; no-gap fixtures left untouched.
- [x] Unit test for the "which keywords qualify for weaving" selection logic.
- [x] Doc-sync: README + ARCHITECTURE + copilot-instructions + tracker.

---

### 7. Anti-hallucination grounding validator 🔴
**Problem.** Nothing deterministically verifies that numbers / employers / tech named in
the output actually exist in the source profile.

**Approach.** A pure-code `GroundingValidatorService`: extract numeric/metric tokens and
proper nouns (companies, tools, certs) from the generated resume + cover letter; verify
each appears in the serialized profile; **log + strip/flag** unsupported claims. Runs
after generation (and ideally after the editor pass). No LLM call.

**Files.** new `apps/api/src/applications/grounding/grounding-validator.service.ts`
(+ unit spec); wire into `create()`.

**Shipped.** `GroundingValidatorService`
(`apps/api/src/applications/grounding/grounding-validator.service.ts`) +
`runGroundingCheck` wired into both live paths; registered in `ApplicationsModule`.
7 unit tests (DE/EN, JSON + HTML inputs). Targets **impact numbers only** — percentages,
currency, magnitudes (2k, 3 Mio), and counts ≥ 100; small standalone integers like
"5 years" are intentionally not checked (they're often derived from dates → false
positives). **Decision: flag + log** (non-destructive) — stripping a number out of prose
would mangle the sentence, so we log a warning for telemetry instead. Not persisted to the
DB yet (no schema change). The report is the foundation for a future editor feedback loop.

**Acceptance.**
- [x] Validator detects fabricated numbers in tests (7 unit tests, DE/EN, JSON + HTML).
- [x] Wired into both pipelines; unsupported claims flagged + logged (decision: flag, not strip).
- [x] README/ARCHITECTURE/copilot-instructions updated (pipeline change).

---

### 8. Structured outputs instead of regex JSON repair �
**Problem.** `LLMService.parseJsonResponse` strips code fences, regex-extracts the JSON,
repairs trailing commas, and silently falls back to degraded output on parse failure.

**Approach.** Use Azure OpenAI **JSON-schema structured outputs / function calling** for
the selector / keyword / resume-rewrite calls so responses are schema-valid by
construction. Keep the regex path as a fallback only.

**Files.** `llm/providers/azure-openai.provider.ts`, `llm/llm.interface.ts`
(`responseFormat`/schema option), `llm.service.ts`.

**Risk.** Provider + deployment behaviour — needs testing against the real Azure
deployment and the `mock` provider.

**Shipped.** `GenerateOptions` gained a `responseFormat` field
([`llm.interface.ts`](../../apps/api/src/llm/llm.interface.ts)); the Azure provider forwards
it as `response_format`. A **tiered** strategy keyed off the template path inside
`callJson` (no call-site changes, so the eval harness exercises the identical path):
- **Strict `json_schema`** for the union-free shapes — `v1/ats-keywords.md` and
  `v1/resume-rewrite.md` ([`llm/schemas/v1-schemas.ts`](../../apps/api/src/llm/schemas/v1-schemas.ts),
  `additionalProperties:false` + all-`required`). Strict mode also reinforces the critical
  `profileExperienceId` / `profileProjectId` preservation in resume-rewrite.
- **JSON mode (`json_object`)** for everything else whose prompt mentions "json" — incl.
  `v1/skill-selector.md`, whose `TailoredProfileDto` has `(string | object)[]` union fields
  that strict mode can't model cleanly. Clean JSON without shape enforcement.
- The regex/fence repair in `parseJsonResponse` stays as a **fallback** and now logs whether
  each parse was `clean` or needed `RECOVERY` (telemetry to measure the rollout).

The env-schema **`AZURE_OPENAI_API_VERSION` default was bumped `2024-02-15-preview` →
`2025-01-01-preview`** so structured outputs work on prod/staging (json_schema needs
2024-08-01-preview+). The `mock` provider ignores `responseFormat`.

**Measured (real Azure, `LOG_LLM_CALLS=true`).** Across `skill-selector`, `ats-keywords`,
`resume-rewrite` (and the eval judge), **every JSON parse is now `clean`** — the regex
recovery path triggered **0** times, down from being the routine path. Generation quality
unchanged (eval OVERALL 5.00). 10 unit tests for `resolveResponseFormat` + schema validity.

**Acceptance.**
- [x] Schema-constrained responses for the 2 union-free JSON calls; JSON mode for the
      union-typed `skill-selector`; `mock` provider unaffected.
- [x] Silent-degradation fallback path instrumented + measured (clean vs recovery) and
      reduced to ~0 on real Azure.
- [x] README/ARCHITECTURE/copilot-instructions updated (provider change).

---

### 9. Trustworthy + actionable match score 🟢
**Problem.** The old CV agent self-reported a `matchScore` (unreliable). We already have a
deterministic `matchKeywordsAgainstProfile` / coverage calculation.

**Approach.** Surface only the **deterministic** score. Generate profession-neutral,
specific suggestions ("Add a measurable result to your *Pflegedienstleitung* role to cover
the keyword *Qualitätsmanagement*"). Show in the web ATS panel.

**Files.** `applications.service.ts` (analysis), `keywords/**`, web ATS panel component.

**Shipped.** Audit confirmed the user-facing ATS `overallScore` from `getKeywordsAnalysis`
was **already** purely deterministic (`= technicalScore` keyword coverage) — the only
LLM-self-reported `matchScore` lives in the dead `agents/cv/cv-writer.agent.ts` (never
invoked, tracked for removal under #2) and the unrelated auto-apply job-match feature.
The suggestion copy was rewritten: the generic German strings in `calculateMatchAnalysis`
("Das Profil könnte detaillierter…") are replaced by
[`buildMatchInsights`](../../apps/api/src/applications/match-insights.util.ts) — a pure,
unit-tested helper that names the *actual* missing high-value keywords, anchors each to the
target role (job title, gender-marker-stripped), and frames every suggestion around backing
a keyword with a **real, measurable result** ("nur dort, wo du es wirklich nachweisen
kannst") so it never nudges toward fabrication. Profession-neutral phrasing (nurse / CNC /
sales / teacher). The target role is threaded through all three `calculateMatchAnalysis`
call sites (`updateResume`, `getKeywordsAnalysis`, `analyzeKeywords`). 10 unit tests.

**Acceptance.**
- [x] Self-reported LLM score removed from user-facing surfaces (audit: already deterministic).
- [x] Deterministic score + specific, profession-neutral suggestions surfaced.

---

### 10. LLM-as-judge evaluation harness 🟢
**Problem.** We can't prove the main quality driver improved without measuring it.

**Approach.** A golden set of ~20-30 `(job posting × profile)` pairs spanning professions
and languages. A script runs the pipeline and scores each draft with an LLM judge against
the rubric (items #1, #3, #4, #5) plus a deterministic grounding check (#7). Run on every
prompt/pipeline change to catch regressions. The Microsoft Foundry evaluation tooling in
the stack can host batch/continuous evals.

**Files.** new `apps/api/scripts/eval/` (fixtures + runner + rubric prompt); optional CI
hook (non-blocking, like the existing unit-tests job).

**Shipped.** Standalone, dev-only harness under
[`apps/api/scripts/eval/`](../../apps/api/scripts/eval/) — `pnpm eval:llm` (real baseline)
and `pnpm eval:validate` (token-free fixture check). It mirrors the live v1 chain
(skill-selector → parallel cover-letter + resume-rewrite → editor pass) through the real
`LLMService` by reusing the extracted `serialize.util.ts` serializers, scores each output
with an **LLM-as-judge** rubric ([`prompts/eval/judge-rubric.md`](../../apps/api/prompts/eval/judge-rubric.md),
6 dimensions, temp 0) **plus** the deterministic `GroundingValidatorService` (#7), and
writes a timestamped JSON + console report. 24 committed fixtures span 15 professions ×
DE/EN. Skips gracefully when `LLM_PROVIDER=mock`. Sequential by default with
retry/backoff so a small Azure deployment's rate limit + circuit breaker don't abort the
run. The serializers were extracted from `applications.service.ts` (delegating wrappers
kept) so the harness measures byte-identical prompt inputs and never drifts.

**Acceptance.**
- [x] Golden fixture set (professions + DE/EN) committed (24 fixtures).
- [x] Runner outputs per-item rubric scores + grounding pass rate.
- [x] Baseline captured; re-run after each phase and recorded in the Changelog.

---

## Open decisions

- **Which pipeline is canonical long-term** — the in-repo v1 prompts (recommended:
  self-contained, easy to eval) vs. Foundry agents. Item #2 assumes v1.
- **Model for the writing + editor passes** — `gpt-4.1` today; worth A/B-testing a
  stronger reasoning model specifically for #1, where prose quality lives.
- **Grounding strictness (#7)** — ✅ RESOLVED 2026-06-15: **flag + log** (non-destructive).
  Stripping numbers from prose mangles sentences; flagging gives telemetry now and can feed
  the editor pass later. Revisit if we want auto-correction.
- **Betreffzeile / subject line (#5)** — ✅ RESOLVED 2026-06-15: **skip for now.** It's a
  *template* change (no `subject` field in `CoverLetterTemplateData`; the PDF template owns
  the header), not a prompt change — low marginal value now the salutation + company
  reference are solid. Revisit under PDF templates if requested.

---

## Changelog

_Newest first. Add an entry for every change that touches generation quality._

### 2026-06-15 — Cover-letter data layer + Betreffzeile decision (#5 complete)
- **#5 Shipped (data layer).** A dedicated extraction step
  [`v1/job-facts.md`](../../apps/api/prompts/v1/job-facts.md) + `extractJobFacts` pulls
  structured facts from the posting — named contact person, 1-3 concrete company specifics,
  explicit `asks_salary` / `asks_start_date` flags — **before** the cover letter is written,
  replacing the writer scanning `fullText` mid-draft. Runs **in parallel with
  `skill-selector`** in both live pipelines (no added critical-path latency), uses Azure
  strict `json_schema` (#8), degrades gracefully (failed/invalid extraction → prompt scans
  `fullText` itself).
- The salutation is now built **deterministically in code**
  ([`job-facts.util.ts`](../../apps/api/src/applications/job-facts.util.ts) `buildSalutation`)
  and passed to `v1/cover-letter.md` as a verbatim line, so the greeting no longer depends on
  the LLM. `v1/cover-letter.md` updated to consume `{{json jobFacts}}` + `{{salutation}}`.
- **Betreffzeile decision: skip** — it's a template change (no `subject` in
  `CoverLetterTemplateData`), deferred to PDF templates.
- Verified on real Azure: `job-facts.md` parses clean (strict schema), cover-letter
  personalization 5.00. 13 unit tests (salutation + validation/normalize). Eval harness
  pipeline-runner extended to run job-facts.
- Doc-sync: tracker (#5 Shipped + acceptance + open-decision) + copilot-instructions +
  ARCHITECTURE.
- Files: `apps/api/prompts/v1/job-facts.md`, `apps/api/prompts/v1/cover-letter.md`,
  `apps/api/src/applications/job-facts.util.ts`,
  `apps/api/src/applications/__tests__/unit/job-facts.unit.spec.ts`,
  `apps/api/src/applications/applications.service.ts`,
  `apps/api/src/llm/schemas/v1-schemas.ts`, `apps/api/scripts/eval/pipeline-runner.ts`.

### 2026-06-15 — Resume editor pass (#1, second variant)
- The resume half of #1 shipped: [`prompts/v1/editor-resume.md`](../../apps/api/prompts/v1/editor-resume.md)
  + `runResumeEditorPass` in `applications.service.ts`, wired into `createWithGeneration`
  after `callResumeRewrite` (the only path producing the structured `RewrittenProfileDto`).
  One JSON→JSON critique pass (temp 0.35) over summary + achievements, mirroring the
  cover-letter editor.
- The dangerous failure mode — the editor dropping/renaming a `profileExperienceId` /
  `profileProjectId`, which silently loses the rewritten (often translated) content — is
  caught by a pure, unit-tested [`isValidResumeEdit`](../../apps/api/src/applications/resume-editor.util.ts):
  rejects an edit that changes the ID multiset, empties a previously-populated entry, or is
  malformed; falls back to the pre-edit payload. 10 unit tests.
- The eval harness (#10) gained a `resume-editor` flag; verified on real Azure (applied 3/3,
  `editor-resume.md` parses clean, OVERALL unchanged at 5.00).
- Doc-sync: tracker (#1 acceptance) + copilot-instructions (pipeline step).
- Files: `apps/api/prompts/v1/editor-resume.md`,
  `apps/api/src/applications/resume-editor.util.ts`,
  `apps/api/src/applications/__tests__/unit/resume-editor.unit.spec.ts`,
  `apps/api/src/applications/applications.service.ts`,
  `apps/api/scripts/eval/{pipeline-runner,aggregate,run-eval}.ts`.

### 2026-06-15 — Cleanup: retire legacy `*-ats.md` prompts (#2, part 2)
- Migrated the edit-mode "regenerate cover letter" flow (`upsertCoverLetter`) off
  `cover-letter-ats.md` onto the canonical `v1/cover-letter.md` prompt. The saved editor
  resume is mapped into a skill-selector `TailoredProfileDto` by the new pure
  [`stored-resume.util.ts`](../../apps/api/src/applications/stored-resume.util.ts)
  (`mapStoredResumeToTailoredProfile`), then runs job-facts extraction + the deterministic
  salutation — so regenerate now gets the same #1/#5/#6 quality as initial generation.
- Deleted the legacy/now-dead prompts `cover-letter-ats.md`, `resume-ats.md`,
  `cover-letter.md`, `resume.md` (kept the `v1/*` variants), plus `generateCoverLetterATS` /
  `generateResumeATS` / `generateCoverLetter` / `generateResume` + `buildATS*Context` helpers +
  the `CoverLetterContext` / `ResumeContext` / `KeywordMatch` / `ATSCoverLetterContext` /
  `ATSResumeContext` interfaces in `llm.service.ts`, and `buildCoverLetterContext` /
  `buildATSCoverLetterContext` / `buildATSResumeContext` / `getKeywordsForGeneration` /
  `matchKeywordsForLLM` in `applications.service.ts`.
- Verified: `nest build` clean; lint 0 errors (service warnings 62→60, no new); 21 unit tests
  pass (11 new for the mapper); the `summary-translation` integration test failure is
  pre-existing on `main` (out-of-sync `TemplatesService` DI). Real-Azure smoke of the
  regenerate path produced a personalized German cover letter with no placeholder leak.
- Files: added `apps/api/src/applications/stored-resume.util.ts` +
  `__tests__/unit/stored-resume.unit.spec.ts`; edited `applications.service.ts`,
  `llm.service.ts`; deleted `apps/api/prompts/{cover-letter,resume,cover-letter-ats,resume-ats}.md`;
  doc-sync `.github/copilot-instructions.md`, `ARCHITECTURE.md`.

### 2026-06-15 — Cleanup: retire dead Foundry agent classes (#2, part 1)
- Deleted the unused `apps/api/src/agents/**` Azure AI Foundry agent pipeline
  (`ApplicationPipelineService`, `CVWriterAgent`, `CLWriterAgent`, `ATSKeywordAgent`,
  `AgentsModule` + interfaces — 11 files) that was declared but never invoked.
- The two **still-live** types it housed (`ATSAgentOutput`, `ProfileData` — used by the
  active `keywords.service` + `applications.service` match path) were relocated to
  [`keywords/keywords.types.ts`](../../apps/api/src/keywords/keywords.types.ts). `AgentsModule`
  was removed from `ApplicationsModule` imports.
- Verified: no `infra/Dockerfile` COPY referenced the path; `nest build` clean; 66 unit
  tests pass; no new lint warnings. The `*-ats.md` prompt migration (the other half of #2)
  remains.
- Files: deleted `apps/api/src/agents/**`; added `apps/api/src/keywords/keywords.types.ts`;
  edited `keywords.service.ts`, `applications.service.ts`, `applications.module.ts`,
  `.github/copilot-instructions.md`.

### 2026-06-15 — Phase 4: structured outputs (#8)
- **#8 Shipped** — Azure OpenAI `response_format` for the JSON-producing v1 calls, replacing
  reliance on regex/fence repair. `GenerateOptions.responseFormat`
  ([`llm.interface.ts`](../../apps/api/src/llm/llm.interface.ts)) is forwarded by the Azure
  provider; `callJson` resolves it by template path
  ([`llm/schemas/v1-schemas.ts`](../../apps/api/src/llm/schemas/v1-schemas.ts)): **strict
  `json_schema`** for the union-free `ats-keywords` + `resume-rewrite`, **`json_object`**
  (JSON mode) for `skill-selector` (union types) and any other json-mentioning prompt. No
  call-site changes — the registry lives in `callJson`, so the eval harness exercises the
  same path. The regex repair stays as a fallback and now logs `clean` vs `RECOVERY`.
- **api-version default bumped** `2024-02-15-preview` → `2025-01-01-preview` (json_schema
  needs 2024-08-01-preview+) so prod/staging get structured outputs, not just local.
- **Measured (real Azure):** across `skill-selector` / `ats-keywords` / `resume-rewrite`
  (+ the eval judge) **every JSON parse is now `clean`** — regex recovery fired **0** times.
  Generation quality unchanged (eval OVERALL 5.00). The `mock` provider ignores
  `responseFormat`.
- 10 unit tests (`resolveResponseFormat` + strict-schema shape validity). Doc-sync: README +
  ARCHITECTURE + copilot-instructions + this tracker.
- Files: `apps/api/src/llm/llm.interface.ts`, `apps/api/src/llm/providers/azure-openai.provider.ts`,
  `apps/api/src/llm/schemas/v1-schemas.ts`, `apps/api/src/llm/llm.service.ts`,
  `apps/api/src/llm/__tests__/unit/v1-schemas.unit.spec.ts`, `apps/api/src/config/env.schema.ts`,
  `apps/api/scripts/eval/run-eval.ts`.

### 2026-06-15 — Phase 3: coverage-driven keyword loop (#6)
- **#6 Shipped** — [`keyword-coverage.util.ts`](../../apps/api/src/applications/keyword-coverage.util.ts)
  (pure, 13 unit tests) + `runKeywordWeavePass` in `applications.service.ts` + a new guarded
  prompt [`v1/keyword-weave.md`](../../apps/api/prompts/v1/keyword-weave.md). After the
  editor pass (both live pipelines), the loop selects the priority-1, **profile-supported**
  (`source: 'both'`) ATS keywords still missing from the cover letter (cap 3,
  word-boundary-aware) and runs **one** surgical weave pass — no stuffing, never an
  unsupported keyword, never a new number, graceful fallback to the pre-weave draft. The LLM
  call is **skipped entirely when there is no gap**.
- The ATS keyword matcher was extracted from the service into the util
  (`matchAtsKeywordsToProfile`, delegating wrapper kept) so the eval harness measures
  coverage with the identical matcher (drops `applications.service.ts` lint warnings 66 → 62).
- **Eval harness (#10) extended** with a deterministic priority-1 coverage metric
  (before/after weave) and a `--no-weave` A/B flag.
- **Measured lift (gpt-4.1, 24 fixtures, tag `phase3-weave`):** mean priority-1 coverage
  **87.33% → 100%**; weave fired on **4 / 24** fixtures (`sales-de` 0→100% *Neukundengewinnung*,
  `sales-en` 0→100% *B2B sales*, `logistics-de` 67→100% *Fachwirt*, `marketing-en` 67→100%
  *email/agency management*); grounding still passed on every woven letter; rubric + OVERALL
  unchanged from baseline (action 4.58, quantified 4.33, clichés 4.63, OVERALL 5.00).
- **Doc-sync** — README + ARCHITECTURE (pipeline diagram) + copilot-instructions (module +
  pipeline step) + harness README + this tracker.
- Files: `apps/api/src/applications/keyword-coverage.util.ts`,
  `apps/api/src/applications/__tests__/unit/keyword-coverage.unit.spec.ts`,
  `apps/api/prompts/v1/keyword-weave.md`, `apps/api/src/applications/applications.service.ts`,
  `apps/api/scripts/eval/{pipeline-runner,aggregate,run-eval}.ts`, `apps/api/scripts/eval/README.md`.

### 2026-06-15 — Phase 3: trustworthy + actionable match score (#9)
- **#9 Shipped** — the user-facing ATS `overallScore` was audited and confirmed **already
  deterministic** (keyword coverage, never an LLM self-report). The generic German
  suggestions in `calculateMatchAnalysis` were replaced by a pure, unit-tested helper
  [`match-insights.util.ts`](../../apps/api/src/applications/match-insights.util.ts):
  suggestions now name the actual missing high-value keywords, anchor to the target role
  (job title, gender markers stripped), and frame everything around backing a keyword with a
  real measurable result (no fabrication nudge). Profession-neutral. The role is threaded
  through all three `calculateMatchAnalysis` call sites.
- No pipeline/provider change → no README/ARCHITECTURE sync needed (tracker-only, per the
  roadmap doc-sync rule). 10 new unit tests; no new ESLint warnings.
- Files: `apps/api/src/applications/match-insights.util.ts`,
  `apps/api/src/applications/applications.service.ts`,
  `apps/api/src/applications/__tests__/unit/match-insights.unit.spec.ts`.

### 2026-06-15 — Phase 4: LLM-as-judge eval harness (#10) + baseline captured
- **#10 Shipped** — standalone dev-only harness under
  [`apps/api/scripts/eval/`](../../apps/api/scripts/eval/): `pnpm eval:llm` (real
  baseline) + `pnpm eval:validate` (token-free fixture check). Mirrors the live v1 chain
  (skill-selector → parallel cover-letter + resume-rewrite → cover-letter editor pass)
  through the real `LLMService`, scores each output with an LLM-as-judge rubric
  ([`prompts/eval/judge-rubric.md`](../../apps/api/prompts/eval/judge-rubric.md), 6
  dimensions, temp 0) **plus** the deterministic `GroundingValidatorService` (#7). 24
  fixtures span 15 professions × DE/EN. Sequential + retry/backoff (the first concurrent
  run tripped the Azure rate limit + opossum breaker, failing 22/24 — fixed). Skips
  gracefully on `LLM_PROVIDER=mock`.
- **Serializer extraction** — `serializeProfileForLlm` / `serializeJobPostingForLlm`
  moved to [`apps/api/src/applications/serialize.util.ts`](../../apps/api/src/applications/serialize.util.ts)
  (service keeps delegating wrappers) so the harness renders byte-identical prompt inputs
  and can't drift from production.
- **BASELINE (gpt-4.1, `azure-openai`, 24/24 fixtures, tag `baseline`):**

  | Rubric mean (1–5) | Score |
  |---|---|
  | action_verb_bullets | 4.46 |
  | quantified_or_qualitative | 4.46 |
  | summary_targeting | 4.92 |
  | cover_letter_personalization | 5.00 |
  | style_no_cliches | 4.54 |
  | language_correctness | 5.00 |
  | **OVERALL** | **4.92** |

  Grounding: **50%** fully-grounded pass rate, **69.29** mean score, 12/24 fixtures with
  unsupported numbers. By language: DE n=12 overall 4.92 / grounded 50%; EN n=12 overall
  4.92 / grounded 50%.
- **Reading the baseline:** the holistic OVERALL saturates near-ceiling (4.92), so measure
  Phase 3 lift on the **prose sub-dimensions** (action-verb 4.46, quantified 4.46,
  no-clichés 4.54 — real headroom) and **grounding** (50% — strongest deterministic
  signal). Many grounding flags are numbers the model legitimately quoted **from the job
  posting** (e.g. advertised salary) — the validator checks the profile only, so treat
  those as interpretation nuance, not pure fabrication.
- **Doc-sync** — README (commands) + ARCHITECTURE (output-quality measurement section) +
  this tracker (status → Shipped, acceptance ticked).
- Files: `apps/api/scripts/eval/**`, `apps/api/prompts/eval/judge-rubric.md`,
  `apps/api/src/applications/serialize.util.ts`, `apps/api/package.json`, `.gitignore`,
  `README.md`, `ARCHITECTURE.md`.

### 2026-06-15 — Fix grounding-validator false positives (first real run)
- First real `azure-openai` generation surfaced a bug: the grounding check reported
  `7/11 impact numbers not found (score 36)` flagging values like `4915159051609`
  (the candidate's **phone number**), `1781479444091` (a **timestamp**) and `00.000`
  (an **ISO date** fragment). Root cause: the validator extracted numbers from the
  **entire serialized resume JSON** (contact block, ISO `startDate`/`endDate`, ids).
- **Fix (#7):**
  1. Resume JSON is now walked **prose-only** — numbers are extracted solely from
     `summary` / `description` / `achievements` / `highlights` keys, not contact/date/id
     fields.
  2. The plain-number bucket is restricted to a plausible metric range: 3–6 significant
     digits, no leading zero (ISO-time artifacts), and 4-digit calendar years (1900–2099)
     excluded. Strong-signal numbers (%, currency, magnitudes) are still always checked.
- Added 3 regression tests (phone + ISO dates not flagged, calendar years not flagged,
  real fabricated metric inside a prose field still flagged). 10 grounding tests pass.
- **Also confirmed working end-to-end** in the same run: `Cover letter editor pass applied`
  fired after the parallel generation, total generation 18.9s (acceptable).
- Files: `apps/api/src/applications/grounding/grounding-validator.service.ts`,
  `apps/api/src/applications/__tests__/unit/grounding-validator.unit.spec.ts`.

### 2026-06-15 — Make the editor-pass latency visible to the user
- **#1** — surfaced the extra editor round-trip in the UI so the added latency reads as
  progress, not a stall:
  - Frontend wizard ([generate-step.tsx](../../apps/web/src/components/forms/wizard/generate-step.tsx)):
    the synchronous main path shows a simulated step list — added an **"Anschreiben wird
    geprüft und verfeinert"** step (only when a cover letter is generated), retuned the
    per-step timing, widened the estimate copy to 45–75s (with cover letter) / 30–55s
    (without), and derived the "taking longer" threshold from the estimate.
  - Backend SSE path (`generateWithSinglePipeline`): added
    `emitProgress(90, 'Anschreiben wird geprüft und verfeinert...')` before the editor call.
- Files: `apps/web/src/components/forms/wizard/generate-step.tsx`,
  `apps/api/src/applications/applications.service.ts`.

### 2026-06-15 — Phase 2: editor pass (#1, cover letter) + grounding validator (#7)
- **#7 Shipped** — `GroundingValidatorService`
  ([grounding-validator.service.ts](../../apps/api/src/applications/grounding/grounding-validator.service.ts)),
  a deterministic, non-destructive anti-hallucination check. Flags impact numbers
  (%, currency, magnitudes, counts ≥ 100) that don't appear in the source profile. Handles
  both resume shapes (JSON + Markdown) and HTML cover letters. 7 unit tests (DE/EN). Wired
  into both live paths via `runGroundingCheck` (log-only). **Decision: flag, not strip.**
- **#1 In progress** — cover-letter editor pass:
  [editor-cover-letter.md](../../apps/api/prompts/v1/editor-cover-letter.md) +
  `runCoverLetterEditorPass`, wired into `createWithGeneration` + `generateWithSinglePipeline`
  with graceful degradation (keep the draft on failure / short output). Resume editor pass
  still pending.
- **Doc-sync** — updated `README.md`, `ARCHITECTURE.md` (pipeline diagram) and
  `.github/copilot-instructions.md` (applications module + pipeline steps).
- Files: `apps/api/src/applications/grounding/grounding-validator.service.ts`,
  `apps/api/src/applications/__tests__/unit/grounding-validator.unit.spec.ts`,
  `apps/api/prompts/v1/editor-cover-letter.md`,
  `apps/api/src/applications/applications.service.ts`,
  `apps/api/src/applications/applications.module.ts`, two test modules (DI provider),
  `README.md`, `ARCHITECTURE.md`, `.github/copilot-instructions.md`.

### 2026-06-15 — Phase 1 kickoff + tracker created
- **Added** this living tracker (`docs/implementation/LLM_OUTPUT_QUALITY.md`) covering all
  10 improvements with status, phased plan and per-item acceptance criteria.
- **#3 Shipped** — XYZ/STAR achievement-bullet formula + profession-diverse examples +
  "no invented metrics → qualitative fallback" in
  [`v1/resume-rewrite.md`](../../apps/api/prompts/v1/resume-rewrite.md).
- **#4 Shipped** — Professional-summary requirements (exact title + years + top keywords +
  one quantified achievement, 50-80 words, profession-neutral) in
  [`v1/resume-rewrite.md`](../../apps/api/prompts/v1/resume-rewrite.md).
- **#5 In progress** — Cover-letter personalization guardrails (named salutation, concrete
  company reference, salary/start-date only-if-asked, tone-down, no Konjunktiv, expanded
  quality checks) in [`v1/cover-letter.md`](../../apps/api/prompts/v1/cover-letter.md).
  Data-layer Ansprechpartner extraction + Betreffzeile decision still open.
- **#2 In progress** — documented the canonical v1 pipeline + the dead `agents/**` /
  legacy `*-ats.md` paths so future fixes land in the right place.
- Files: `apps/api/prompts/v1/resume-rewrite.md`, `apps/api/prompts/v1/cover-letter.md`,
  `docs/implementation/LLM_OUTPUT_QUALITY.md`.
