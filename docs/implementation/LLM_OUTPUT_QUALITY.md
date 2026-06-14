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
| 3 | — | code | `convertTailoredProfileToResumeJson` → stored as `resumeText` (JSON) |

Steps 2a/2b/2c run in **parallel** (`Promise.all`). Resume is persisted as structured
JSON for the editor; the cover letter is persisted as HTML for the PDF.

**Dead / optional code (do not confuse with the live path):**
- `apps/api/src/agents/**` (`ApplicationPipelineService`, `CVWriterAgent`,
  `CLWriterAgent`) is declared in `agents.module.ts` but **never invoked**. It is the old
  Azure AI Foundry agent pipeline. Tracked for removal in **item #2**.
- `azure-ai-foundry.provider.ts` is only reachable when `LLM_PROVIDER=azure-ai-foundry`,
  in which case the same v1 prompt calls are routed to Foundry agents. With
  `azure-openai` / `mock` it is never touched.
- The legacy `prompts/resume-ats.md` / `prompts/cover-letter-ats.md` (+
  `generateResumeATS` / `generateCoverLetterATS`) are only used by the **edit-mode
  regenerate** flow (`upsertCoverLetter`), not the main create pipeline. Tracked under
  item #2 for consolidation.

---

## Status summary

**Legend:** 🔴 Planned · 🟡 In progress · 🟢 Shipped

| # | Improvement | Phase | Risk | Status | Primary files |
|---|---|---|---|---|---|
| 2 | Consolidate onto one pipeline; retire dead/legacy paths | 1 | Low | 🟡 In progress | `agents/**`, `prompts/*-ats.md`, `applications.service.ts` |
| 3 | XYZ/STAR achievement-bullet formula | 1 | Low | 🟢 Shipped | `prompts/v1/resume-rewrite.md` |
| 4 | Make the professional summary / Kurzprofil do real work | 1 | Low | 🟢 Shipped | `prompts/v1/resume-rewrite.md` |
| 5 | Real cover-letter personalization | 1 | Low | 🟡 In progress | `prompts/v1/cover-letter.md`, (later) data layer |
| 1 | Self-critique / editor pass | 2 | Med | 🔴 Planned | new `prompts/v1/editor-*.md`, `llm.service.ts`, `applications.service.ts` |
| 7 | Anti-hallucination grounding validator | 2 | Med | 🔴 Planned | new `grounding/` service, `applications.service.ts` |
| 6 | Coverage-driven keyword loop | 3 | Med | 🔴 Planned | `applications.service.ts`, `keywords/**` |
| 9 | Trustworthy + actionable match score | 3 | Low | 🔴 Planned | `applications.service.ts`, web ATS panel |
| 8 | Structured outputs (JSON schema) instead of regex repair | 4 | Med-High | 🔴 Planned | `llm/providers/azure-openai.provider.ts`, `llm.service.ts` |
| 10 | LLM-as-judge evaluation harness | 4 (start early) | Low | 🔴 Planned | new `apps/api/scripts/eval/**` |

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

**Acceptance.**
- [ ] Cover-letter editor pass live in the create pipeline with graceful fallback.
- [ ] Resume editor pass live (summary + achievements), IDs preserved.
- [ ] Eval (#10) shows rubric-score improvement vs. no-editor baseline.
- [ ] README + ARCHITECTURE + copilot-instructions updated (pipeline change).

---

### 2. Consolidate onto one pipeline 🟡
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

**Acceptance.**
- [x] This tracker documents the canonical path + dead code (so fixes land correctly).
- [ ] `agents/**` removed (or explicitly kept with a documented reason).
- [ ] Edit-mode regenerate uses v1 prompts; `*-ats.md` deleted.
- [ ] README/ARCHITECTURE updated to describe one pipeline.

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

### 5. Real cover-letter personalization 🟡
**Problem.** Letters used "Sehr geehrte Damen und Herren", lacked a concrete company
reference (the #1 auto-reject signal), and ignored explicit salary / start-date asks.

**Shipped (prompt-level).** In [`v1/cover-letter.md`](../../apps/api/prompts/v1/cover-letter.md):
named-salutation selection from the posting `fullText`; mandatory concrete company
reference; salary/start-date only when explicitly requested; tone-down of enthusiasm;
no Konjunktiv/hedging; expanded quality-check list.

**Still to do (data layer).**
- [ ] Extract the contact person (Ansprechpartner) + key company facts as a dedicated
      step and pass into the prompt (more reliable than the LLM scanning `fullText`).
- [ ] Decide whether to render a **Betreffzeile** — the `CoverLetterTemplateData`
      contract has no `subject` field today, so this is a **template** change, not a
      prompt change. Track under PDF templates if pursued.

**Acceptance.**
- [x] Named salutation + concrete company reference + salary/start-date guardrails live.
- [ ] Ansprechpartner/company-facts extraction step feeding the prompt.
- [ ] Betreffzeile decision recorded (template vs. skip).

---

### 6. Coverage-driven keyword loop 🔴
**Problem.** We extract keywords and *measure* match after the fact; we never close the
loop by weaving in high-priority keywords the profile genuinely supports.

**Approach.** After generation, compute coverage of **priority-1** keywords. For any
high-priority keyword that is missing **but supported by the profile**
(`matchKeywordsAgainstProfile` says `both`), run one targeted weave-in pass — guarded
against keyword stuffing (density stays natural, context required). Never weave a keyword
the profile doesn't support (that would be fabrication).

**Files.** `applications.service.ts` (post-generation step), `keywords/**`, possibly a
small `prompts/v1/keyword-weave.md`.

**Acceptance.**
- [ ] Priority-1 coverage computed post-generation.
- [ ] Single guarded weave-in pass for profile-supported gaps only.
- [ ] Eval shows higher match rate **without** stuffing (readability preserved).

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

**Acceptance.**
- [ ] Validator detects fabricated numbers / employers / certs in tests.
- [ ] Wired into the pipeline; unsupported claims are stripped or flagged (decision logged).
- [ ] README/ARCHITECTURE updated (pipeline change).

---

### 8. Structured outputs instead of regex JSON repair 🔴
**Problem.** `LLMService.parseJsonResponse` strips code fences, regex-extracts the JSON,
repairs trailing commas, and silently falls back to degraded output on parse failure.

**Approach.** Use Azure OpenAI **JSON-schema structured outputs / function calling** for
the selector / keyword / resume-rewrite calls so responses are schema-valid by
construction. Keep the regex path as a fallback only.

**Files.** `llm/providers/azure-openai.provider.ts`, `llm/llm.interface.ts`
(`responseFormat`/schema option), `llm.service.ts`.

**Risk.** Provider + deployment behaviour — needs testing against the real Azure
deployment and the `mock` provider.

**Acceptance.**
- [ ] Schema-constrained responses for the 3 JSON calls; mock provider honours it.
- [ ] Silent-degradation fallback path measured (how often it triggers) and reduced.
- [ ] README/ARCHITECTURE updated.

---

### 9. Trustworthy + actionable match score 🔴
**Problem.** The old CV agent self-reported a `matchScore` (unreliable). We already have a
deterministic `matchKeywordsAgainstProfile` / coverage calculation.

**Approach.** Surface only the **deterministic** score. Generate profession-neutral,
specific suggestions ("Add a measurable result to your *Pflegedienstleitung* role to cover
the keyword *Qualitätsmanagement*"). Show in the web ATS panel.

**Files.** `applications.service.ts` (analysis), `keywords/**`, web ATS panel component.

**Acceptance.**
- [ ] Self-reported LLM score removed from user-facing surfaces.
- [ ] Deterministic score + specific, profession-neutral suggestions surfaced.

---

### 10. LLM-as-judge evaluation harness 🔴
**Problem.** We can't prove the main quality driver improved without measuring it.

**Approach.** A golden set of ~20-30 `(job posting × profile)` pairs spanning professions
+ languages. A script runs the pipeline and scores each draft with an LLM judge against
the rubric (items #1, #3, #4, #5) plus a deterministic grounding check (#7). Run on every
prompt/pipeline change to catch regressions. The Microsoft Foundry evaluation tooling in
the stack can host batch/continuous evals.

**Files.** new `apps/api/scripts/eval/` (fixtures + runner + rubric prompt); optional CI
hook (non-blocking, like the existing unit-tests job).

**Acceptance.**
- [ ] Golden fixture set (professions + DE/EN) committed.
- [ ] Runner outputs per-item rubric scores + grounding pass rate.
- [ ] Baseline captured; re-run after each phase and recorded in the Changelog.

---

## Open decisions

- **Which pipeline is canonical long-term** — the in-repo v1 prompts (recommended:
  self-contained, easy to eval) vs. Foundry agents. Item #2 assumes v1.
- **Model for the writing + editor passes** — `gpt-4.1` today; worth A/B-testing a
  stronger reasoning model specifically for #1, where prose quality lives.
- **Grounding strictness (#7)** — strip unsupported claims automatically vs. flag for the
  user. Record the choice when implementing.

---

## Changelog

_Newest first. Add an entry for every change that touches generation quality._

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
