# Fix Plan: Cover-Letter Length Is Prompt-Enforced Only (No Deterministic Gate)

> **Status:** ✅ Implemented (2026-07-22) · **Priority:** P2 (quality-assurance gap; direct competitor-review theme)
> **Affected area:** `apps/api/src/applications` (generation pipeline, `style-lint.util.ts`), wizard length preference, eval harness
> **Related competitor feedback:** jobstep.io review — *"Vorschläge für Anschreiben sind grundsätzlich immer viel zu lang (2 Seiten, das liest kein Mensch!)"* — and the reviewer's kicker: ChatGPT *"achtet wenigstens auch auf so etwas wie die Länge der Dokumente."* Applo's 350–400-word cap exists **only as a prompt instruction**; nothing measures or enforces it after generation.
>
> **Implementation deltas vs. this plan:**
> - All steps (1–7) shipped in one PR instead of the suggested three-PR split — the measurement baseline, teeth, and preference are behind the same guarded, fail-open pattern, so a staged rollout added no safety.
> - Budgets/tolerances live in `applications/constants.ts` (`COVER_LETTER_BUDGETS`, `resolveCoverLetterBudget`); German gets a slightly wider tolerance band (20% vs 15%) per §3's "small DE tolerance".
> - The governor's keyword-survival guard derives the must-keep set from the priority-1 profile-supported keywords *present in the pre-shorten draft* (superset of the woven ones — strictly safer).
> - The governor also runs in `generateWithSinglePipeline` (regenerate) and `upsertCoverLetter` (edit-mode fresh regenerate), not just `createWithGeneration` — all three paths render `{{lengthBudget}}` and share `runLengthGovernorPass`.
> - Eval integration extends the actual harness (`scripts/eval/*`: `pipeline-runner.ts` mirror pass + `--no-length-governor` A/B flag + `length` block in `aggregate.ts`) — the plan's "headless `--score`" wording referred to a seam that lives on a feature branch.
> - Page-count backstop uses `pdf-parse` v2's `getInfo().total` (already a dependency) in `application.processor.ts`.

---

## 1. Problem Statement

If the LLM overruns the length budget, Applo ships the overrun silently:

- No word count is computed anywhere in the pipeline
- No warning is logged, no metric exists (we cannot even *say* how often overruns happen)
- No corrective pass fires
- No page-count check on the rendered PDF (a 2-page cover letter — the reviewer's exact complaint — would go undetected)
- The user has no length preference: some roles/cultures want ~250 words, the prompt hardcodes one target

This is the same class of gap the repo already closed for style clichés (deterministic `style-lint` + guarded rewrite): a prompt rule is only a *request*. Length deserves the identical treatment — arguably more, since it's the most human-visible failure ("das liest kein Mensch").

## 2. Current State Analysis (verified in code)

### 2.1 The budget exists only in the prompt

`prompts/v1/cover-letter.md` → "Max 350-400 words (excluding greeting/closing)", repeated in the quality checklist. `editor-cover-letter.md` critiques against the rubric but has no hard length mandate either. No code path counts words.

### 2.2 Post-generation passes only guard against *shortening* — never against growth

The cover letter flows through **three** LLM passes after the draft (`applications.service.ts:963-996`): editor pass → keyword weave → style rewrite. Every guard is a *minimum*-length floor:

- Editor pass: reject if `< draft × 0.5` (`applications.service.ts:1526`)
- Keyword weave: same pattern — and weaving keywords into prose is **inherently additive** (growth pressure by design)
- Style rewrite: `evaluateStyleRewrite` rejects below `minLengthRatio = 0.6` (`style-lint.util.ts:149`)

**No pass has a maximum.** Three additive/floor-guarded passes compound the overrun risk beyond what the base prompt produces.

### 2.3 The deterministic check exists — but doesn't check length

`style-lint.util.ts` (`lintGeneratedStyle`) detects AI clichés + German hedging, runs non-destructively at the end of the pipeline (`runStyleCheck`, `applications.service.ts:1006,1758`), and logs violations. Its module header explicitly frames the philosophy: *measure deterministically what prompts merely request*. Length is the missing rule. Its sibling, the guarded `runStyleRewritePass`, proves the "detect → surgical guarded fix → fallback" pattern works in production.

### 2.4 No user-facing length control

The wizard (`configure-step.tsx`) offers job posting, templates, colors, language, cover-letter opt-out — no length preference. `CreateApplicationDto` has no such field. Nothing in `user-preferences` either.

### 2.5 Eval blind spot

The offline eval harness (applo-eval via `pnpm generate:headless --score`) can score style violations via the exported linter, but since length is never linted, regressions in verbosity are invisible to evals too.

## 3. Solution Design

### Guiding decisions

1. **Deterministic measurement first, enforcement second** — mirror the shipped style-lint → style-rewrite architecture exactly. New checks land as logs/metrics; the corrective pass is guarded and falls back to the pre-pass draft. Never truncate text mechanically.
2. **Budget in one shared place.** Word budgets become named constants consumed by the prompt renderer, the linter, the shorten pass, and the eval — no drift between what we ask for and what we measure.
3. **Language-aware counting.** German compounds inflate per-word information density; 350 German words ≈ longer visual text than English. Count words on the *body* (exclude salutation + closing, matching the prompt's own definition) with a small DE tolerance.
4. **User choice is a Präferenz, not a free number.** `kurz` (~250) / `standard` (~350) — bounded enum, testable, maps cleanly to prompt variables.

### 3.1 Length lint (deterministic, extends `style-lint.util.ts`)

```ts
export interface LengthLintResult {
  words: number;           // body words (salutation/closing stripped)
  budget: number;          // resolved from length preference
  tolerance: number;       // e.g. budget × 0.15
  overrun: boolean;        // words > budget + tolerance
  severity: 'ok' | 'warn' | 'critical'; // critical ≥ budget × 1.5 (the "2-page" class)
}
export function lintCoverLetterLength(markdown: string, budget: number, language: string): LengthLintResult
```

- Strips HTML/Markdown noise via the existing `normalize()`; strips the salutation line + closing block (deterministic: first line matching the salutation contract, trailing `Mit freundlichen Grüßen`/`Sincerely` block)
- Wire into `runStyleCheck` alongside cliché/hedging output → one structured warning log per generation: `Length check (application X): 512 words vs budget 350 (+46%) — severity: critical`
- Zero user-visible change in this step; it creates the **measurement baseline** (how often does GPT-4.1 actually overrun?) exactly like style-lint did for clichés

### 3.2 Budget constants + prompt wiring

- `applications/constants.ts` (exists): `COVER_LETTER_BUDGETS = { kurz: 250, standard: 350 }`, `LENGTH_TOLERANCE = 0.15`, `CRITICAL_FACTOR = 1.5`
- `cover-letter.md`: replace the hardcoded "Max 350-400 words" with `{{lengthBudget}}` (+ keep the structural guidance); pass the resolved budget from the service. Same variable added to `editor-cover-letter.md` ("respect the {{lengthBudget}}-word budget") and `keyword-weave.md` ("weave WITHOUT exceeding {{lengthBudget}} words — prefer replacing filler over adding sentences") — the additive pass gets an explicit ceiling for the first time
- Renderer already supports plain variables (`renderTemplate`) — no infra change

### 3.3 Guarded shorten pass (the teeth — clone of `runStyleRewritePass`)

New `prompts/v1/shorten-cover-letter.md` + `runLengthGovernorPass()`:

- **Fires only when** the length lint reports `overrun` after the style-rewrite pass (last content-modifying pass, so nothing re-inflates afterwards)
- Prompt: "Cut to ≤ {{lengthBudget}} words. Remove redundancy and generic filler ONLY. Keep: the verbatim salutation line, the company-specific reference, every fact/metric, salary/start-date statements if present, the closing. Never add content."
- Acceptance guard `evaluateShortenRewrite(draft, shortened, budget, atsKeywords)`:
  - within budget + tolerance
  - not gutted (≥ 0.5 × draft — reuse the established floor)
  - salutation line preserved **verbatim** (string equality on line 1 — same contract the cover-letter prompt enforces)
  - style violations did not increase (`lintGeneratedStyle` before/after)
  - previously-woven priority-1 keywords still present (don't undo the keyword-weave pass)
  - On any failure → keep the pre-shorten draft + log (graceful degradation, pipeline never breaks — house pattern)
- One extra LLM call **only on overrun** — cost scales with the actual failure rate measured in §3.1

### 3.4 PDF page-count backstop (deterministic, free)

- After rendering the cover-letter PDF (`application.processor.ts`), read the page count (react-pdf buffer → `pdf-parse` metadata, already a dependency of the template specs; or `renderToBuffer` + cheap `/Type /Page` scan)
- `> 1 page` → structured warning log + counter metric. Non-blocking. This catches the *visual* failure mode (template + font-scale interactions) that word counts alone can miss — directly the reviewer's "2 Seiten" symptom

### 3.5 User-facing length preference

- `CreateApplicationDto`: `coverLetterLength?: 'kurz' | 'standard'` (default `standard`, `@IsIn`, whitelist-safe)
- Persist on `Application` (`coverLetterLength String @default("standard")` — expand-only migration) so edit-mode regeneration (`upsertCoverLetter`, which reuses `v1/cover-letter.md` via `stored-resume.util.ts`) honors the same budget
- Wizard `configure-step.tsx`: two-option RadioGroup next to the existing cover-letter opt-out — "Kompakt (~250 Wörter) · Standard (~350 Wörter)", German-first, profession-neutral
- Editor "regenerate cover letter" panel inherits the stored preference

### 3.6 Eval integration

- Export `lintCoverLetterLength` alongside `lintGeneratedStyle`; extend the headless `--score` output with `lengthOverrunRate` + mean word count so applo-eval tracks verbosity regressions per prompt change — the review's core claim ("grundsätzlich immer viel zu lang") becomes a measured, falsifiable number for **our** platform

## 4. Implementation Steps

| # | Step | Files | Size |
|---|------|-------|------|
| 1 | Length lint + budget constants + wire into `runStyleCheck` (measurement only) | `style-lint.util.ts`, `constants.ts`, `applications.service.ts` | S |
| 2 | Prompt budget variables (`cover-letter`, `editor-cover-letter`, `keyword-weave`) | `prompts/v1/*.md`, service call sites | S |
| 3 | Shorten prompt + guarded governor pass + acceptance evaluator | `prompts/v1/shorten-cover-letter.md`, `style-lint.util.ts`, `applications.service.ts` | M |
| 4 | PDF page-count backstop | `application.processor.ts` | S |
| 5 | `coverLetterLength` preference end-to-end (DTO, migration `add_cover_letter_length`, wizard, regenerate path) | `schema.prisma`, DTOs, `configure-step.tsx`, editor | M |
| 6 | Eval export + headless score fields | `headless/generate.ts`, exports | S |
| 7 | Docs sync (mandatory: pipeline change): README, ARCHITECTURE, copilot-instructions (Application Pipeline, Prompt Templates sections) | docs | S |

Suggested PR split (trunk-based, conventional commits):
1. `feat(applications): deterministic cover-letter length lint and page-count check` (steps 1, 4 — measurement baseline, zero behavior change)
2. `feat(applications): budget-aware prompts and guarded shorten pass` (steps 2–3, 6, 7)
3. `feat(applications): cover letter length preference` (step 5, 7)

Step 1 ships first deliberately: a week of logs quantifies the real overrun rate before the governor's thresholds are finalized (same eval-backed rollout the style-rewrite pass used).

## 5. Testing Plan

- **Unit (vitest, extend `style-lint.unit.spec.ts`):**
  - Word counting: salutation/closing exclusion, HTML + Markdown inputs, umlaut handling (reuse the Unicode-boundary approach), DE vs EN
  - Severity ladder: under / within tolerance / warn / critical fixtures
  - `evaluateShortenRewrite`: rejects gutted output, changed salutation, dropped woven keyword, increased style violations; accepts a genuinely shorter clean rewrite
- **Pipeline (mock LLM):** overrun fixture triggers governor; governor failure falls back to pre-shorten draft with status still `READY`
- **Page-count:** multi-page fixture (long body + `fontScale: lg` once template settings ship) logs the warning
- **DTO:** invalid `coverLetterLength` → 400
- **Eval:** run applo-eval baseline before/after prompt changes; assert `lengthOverrunRate` does not regress

## 6. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Shorten pass cuts the company-specific reference or woven keywords (undoing passes #1/#6) | Acceptance guard explicitly checks keyword survival + salutation; prompt forbids removing facts; fallback on violation |
| Word-count heuristics misfire on edge formats (tables, long dashes) | Body-only counting via existing `normalize()`; 15% tolerance; severity ladder means borderline cases only log |
| Extra LLM call per overrun raises cost/latency | Fires only on measured overrun (rate known from step 1); single call; same maxTokens class as the style rewrite |
| German information density makes 350 "words" feel unfair across languages | Language-aware budgets are a constant tweak away (`COVER_LETTER_BUDGETS` per language if the eval data demands it) |
| Users pick "kurz" and expect identical persuasiveness | Wizard copy sets expectation ("Kompakt: auf den Punkt — ideal wenn die Stelle wenig Anforderungen nennt") |

## 7. Explicit Non-Goals

- Mechanical truncation of any text (never)
- Résumé-side length governance (résumé length is profile-driven; separate concern with different rules)
- Free-form word-count input (bounded enum only)
- Blocking generation on overrun (non-destructive philosophy: ship the best available draft, measured)
- Real-time word counter in the Tiptap editor (nice-to-have; the editor already lets users cut manually)
