# Bug Fix Plan: Language Switch Leaves Content Untranslated on Export

> **Status:** Planned · **Priority:** P1 (competitor-parity issue)
> **Affected area:** `apps/api/src/applications` (export flow), `apps/api/src/jobs/processors/application.processor.ts`, `apps/api/src/applications/resume-template.util.ts`, edit-page export UI
> **Related competitor feedback:** jobstep.io review — *"Wenn ich mich auf Englisch bewerben möchte, kann ich zwar die Sprache umstellen, es bleiben jedoch Felder, die nicht ins Englische übersetzt werden."* We currently have the **same class of bug**.

---

## 1. Problem Statement

Exporting an application in a different language than it was generated in (`POST /applications/:id/export` with `language`) produces a **mixed-language PDF**:

- Section headers switch (i18n labels) ✅
- The actual content — summary, experience bullets, cover letter — stays in the **original generation language** ❌
- Date ranges are **always German** regardless of language ❌
- User-defined skill category names (e.g. "Programmiersprachen") pass through untranslated ❌

Additionally, even a **first-time English generation** ships German date strings ("Okt. 2023 – Heute").

## 2. Root Cause Analysis (verified in code)

### 2.1 Export never translates content

`ApplicationsService.requestExport()` (`applications.service.ts:~2476`) enqueues `APPLICATION_GENERATE` with the `language` param. The consumer, `jobs/processors/application.processor.ts`, then:

1. `JSON.parse(application.resumeText)` — the **stored** resume JSON, in its original language
2. Resolves the *template* to the language variant (`resolveTemplateForLanguage`) — labels only
3. Renders the PDF with `language: language || 'en'`

No translation step exists anywhere in this path. The stored `coverLetterText` is likewise rendered verbatim.

### 2.2 The translation machinery is dead code

`apps/api/src/applications/utils/translation.util.ts` (606 lines: xxHash content hashing, per-language cache, LRU, partial re-translation via `identifyChangedSections`, prewarm targets) is **imported nowhere**.

History: a full "Smart Language Switching" feature (API endpoints, `use-translation` hook, `LanguageSelector` with real switching, DB cache columns) existed and was deliberately stripped in commit `036017e4` (*"refactor: simplify translation functionality and remove unused cache features"*, 2026-01-10, −1,678 lines). What survived:

- `LlmService.translateSummary()` (`llm.service.ts:198`) — used **only at creation time** for the profile summary (and it assumes `profileLanguage = 'de'` hardcoded, `applications.service.ts:~655`)
- `LanguageSelector` (`apps/web/src/components/applications/language-selector.tsx`) — now a **read-only badge**: *"Language is set at creation time and cannot be changed afterwards. To get a different language, create a new application."*
- The dead util file + its unit spec
- `UpdateResumeDto.contentLanguage` — accepted but unused by the service

So today the *intended* UX is "recreate the application" — but the export API still accepts `language: 'de' | 'en' | 'fr' | 'es' | 'it'` (`export-application.dto.ts`) and the edit page still sends `selectedLanguage` (`edit/page.tsx:403`), silently producing the mixed-language PDF.

### 2.3 Hardcoded German date formatting

`resume-template.util.ts`:

```ts
function formatDate(date) {
  return date.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }); // ← always German
}
export function formatDateRange(start, end, isCurrent) {
  const startLabel = formatDate(start) || 'Start';
  const endLabel = isCurrent ? 'Aktuell' : formatDate(end) || 'Heute';        // ← German literals
  ...
}
```

`dateRange` strings are **baked into the stored `resumeText` JSON at creation** (`buildResumeTemplateData`, also `applications.service.ts:1945`) and never touched by the LLM rewrite (not part of `resume-rewrite.md` output, protected by `isValidResumeEdit`). Consequence: even a natively-English CV shows "Okt. 2023 – Heute".

### 2.4 Skill categories and other pass-through fields

- `Skill.category` is user-defined free text, rendered as-is (`buildSkillCategories`) → German headers inside an English CV.
- Language proficiency levels are normalized to `level.*` keys and localized via `tLevel` ✅ — but only if they match the normalizer; free-text levels pass through.
- `targetJobTitle`, custom section content edited by the user — original language.

### 2.5 fr/es/it are advertised but unsupported

`ExportApplicationDto` + edit-page selector offer `fr`, `es`, `it`, and `i18n.ts` has labels for them — but generation prompts (`prompts/v1/*`) only handle `de`/`en` properly, and `detectContentLanguage()` only returns `'en' | 'de'`. Exports in fr/es/it are half-translated **by design**.

## 3. Solution Design

### Guiding decisions

1. **Translate the stored content at export time, cache the result.** Recreating the application (current intended UX) burns LLM quota, loses user edits, and still doesn't fix dates. Translation-on-export keeps edits and is cheap with caching.
2. **Structured JSON→JSON translation with strict schema + ID/shape guard**, following the established pattern (`editor-resume.md` + `isValidResumeEdit`): the translator must return the same structure with only display strings translated; on guard failure fall back to the untranslated source (never ship a broken CV silently — surface a warning instead).
3. **Fix `formatDateRange` deterministically** — locale-aware, no LLM. This also fixes the creation-time bug.
4. **Restrict the language surface to `de` + `en`** until prompts genuinely support more; drop fr/es/it from the DTO/UI rather than shipping half-translations (re-add per language behind a supported-languages constant when ready).

### 3.1 Deterministic date fix (independent, ship first)

- `formatDateRange(start, end, isCurrent, lang)` / `formatDate(date, lang)`:
  - `toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', { month: 'short', year: 'numeric' })`
  - `endLabel`: `isCurrent → lang === 'de' ? 'Heute' : 'Present'`
- **Do not store formatted strings.** Add `startDate`/`endDate`/`isCurrent` (ISO) alongside `dateRange` in the stored resume JSON (`ResumeTemplateData.experiences[]`, `education[]`, `projects[].date`), and re-derive `dateRange` **at render time** in the processor from raw dates + target language. Keep `dateRange` as a fallback for pre-existing records (backward compatible — old rows just keep today's behavior).
- Update `template-data.ts` types; `sectionOrder`-style optional-field precedent applies (absent = legacy fallback).

### 3.2 Translation service (new, minimal — not a revival of the old cache)

New `apps/api/src/applications/translation/translation.service.ts`:

- `translateResumeData(resume: ResumeTemplateData, from: 'de'|'en', to: 'de'|'en'): Promise<ResumeTemplateData>`
  - New prompt `prompts/v1/translate-resume.md`, strict `json_schema` via the existing structured-output path (`llm/schemas/v1-schemas.ts`, `callJson`) — translate display strings only; keep numbers, tech terms, proper nouns, URLs, emails; obey the existing job-title rules (Werkstudent/Praktikant translated, "Software Engineer" kept)
  - Guard: same array lengths, IDs/dates/links unchanged (structure check analogous to `isValidResumeEdit`) → fallback to source on violation
  - Includes skill category names (`skillCategories[].type`) and free-text proficiency levels
- `translateCoverLetter(markdown: string, from, to): Promise<string>` — new `prompts/v1/translate-cover-letter.md`, text→text, preserve salutation contract + structure; run the existing deterministic `style-lint` on the result (logs only, consistent with pipeline)
- Reuse `detectContentLanguage()` to determine `from` (stop assuming `'de'`); prefer `application.sourceLanguage` when set

### 3.3 Cache translated variants (schema)

Add one nullable JSON column to `Application` (expand-only migration, forward-compatible):

```prisma
translations Json? // { [lang]: { resume: ResumeTemplateData, coverLetter: string|null, sourceHash: string, cachedAt: string } }
```

- `sourceHash` = xxhash of (`resumeText` + `coverLetterText`) — **reuse `calculateContentHash` from the existing `translation.util.ts`** (finally give it a caller; delete the unused LRU/prewarm/partial-merge functions + their spec sections)
- Invalidation: on export, if `translations[lang].sourceHash` ≠ current hash → re-translate; user edits in the editor invalidate naturally
- No new endpoints: `requestExport(language)` stays the single entry point

### 3.4 Processor & service wiring

`application.processor.ts`:

1. Resolve `targetLang = job.language ?? application.language ?? 'de'`
2. If `targetLang === sourceLang` → render as today
3. Else → `translations[targetLang]` cache hit? use it : translate → persist cache → render
4. Re-derive `dateRange`/`year` from raw dates for `targetLang` (§3.1) regardless of cache
5. On translation failure: render source-language content but set a warning on the response (no silent mixed output), keep status `READY`

`requestExport`: persist the requested language to `application.language` so the edit page badge and subsequent exports stay consistent.

### 3.5 Frontend (`apps/web`)

- `edit/page.tsx`: replace the read-only badge usage with a real select (shadcn `Select`, values `de`/`en` only) → sets `selectedLanguage`; export button already passes it
- Show a one-time hint when exporting in a non-source language ("Inhalte werden automatisch übersetzt – bitte prüfen")
- Surface the backend translation-fallback warning as a toast
- `LanguageSelector` component: restore selector behavior (its props already accept `applicationId`; keep read-only mode for `GENERATING` status)
- Update `use-applications.ts` export mutation typing to `'de' | 'en'`

### 3.6 Cleanup

- Trim `translation.util.ts` to what's actually used (`calculateContentHash`, types) — delete LRU/prewarm/partial-translation remnants and dead spec coverage
- Remove `fr`/`es`/`it` from `ExportApplicationDto`, edit-page state type, `LANGUAGES` list (keep `i18n.ts` labels — harmless, future-proof)
- Wire or remove `UpdateResumeDto.contentLanguage` (wire: update `application.language` + invalidate `translations` on save)

## 4. Implementation Steps

| # | Step | Files | Size |
|---|------|-------|------|
| 1 | Locale-aware `formatDate`/`formatDateRange` + raw dates in `ResumeTemplateData`, render-time derivation | `resume-template.util.ts`, `template-data.ts`, `application.processor.ts`, `applications.service.ts:1945` | S |
| 2 | Prisma: `Application.translations Json?` (`npx prisma migrate dev --name application_translations_cache`) | `schema.prisma`, migration | S |
| 3 | Translation prompts + schemas (strict `json_schema` for resume; text for cover letter) | `prompts/v1/translate-resume.md`, `prompts/v1/translate-cover-letter.md`, `llm/schemas/v1-schemas.ts` | M |
| 4 | `TranslationService` + structure guard + fallback | `applications/translation/translation.service.ts`, module wiring | M |
| 5 | Processor cache/translate/render flow + `requestExport` persists language | `application.processor.ts`, `applications.service.ts` | M |
| 6 | DTO/UI language narrowing to `de`/`en` + real selector + warning toast | `export-application.dto.ts`, `edit/page.tsx`, `language-selector.tsx`, `use-applications.ts` | S |
| 7 | Dead-code trim in `translation.util.ts` | `translation.util.ts` + spec | S |
| 8 | Docs sync (mandatory): README, ARCHITECTURE, copilot-instructions (endpoints/env unchanged → pipeline + data-model sections) | `README.md`, `ARCHITECTURE.md`, `.github/copilot-instructions.md` | S |

Suggested split into PRs (trunk-based, small):
1. `fix(applications): localize resume date ranges by target language` (steps 1)
2. `feat(applications): translate content on cross-language export` (steps 2–5, 8)
3. `chore(applications): narrow export languages to de/en and trim dead translation cache code` (steps 6–7)

## 5. Testing Plan

- **Unit** (vitest, colocated like `section-order.unit.spec.ts`):
  - `formatDateRange` de/en: month names, `Heute`/`Present`, current-role handling
  - Translation guard: mutated IDs / dropped array items / changed URLs → fallback to source
  - Cache invalidation: hash change → re-translate; hash match → no LLM call (mock provider)
- **Integration** (extend `summary-translation.integration.spec.ts` pattern): export DE-generated app as EN with `LLM_PROVIDER=mock` → PDF text contains no `Heute`/`Berufserfahrung`… (parse via `pdf-parse` like existing template specs)
- **Manual staging pass**: DE→EN and EN→DE on a real profile incl. user-edited resume, skill categories, cover-letter opt-out case

## 6. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| LLM mangles structure during translation | Strict schema + structure guard + fallback to source (established editor-pass pattern) |
| Translation cost per export | Per-language cache keyed by content hash; only re-translate on change |
| Old applications lack raw dates in stored JSON | `dateRange` string fallback preserved; no backfill needed |
| User edits after translation get lost | Edits always apply to source; cache invalidates by hash on next export |
| fr/es/it removal is user-visible | They never worked correctly; UI copy explains DE/EN support |

## 7. Explicit Non-Goals

- Reviving the old prewarm/LRU/partial-translation cache (over-engineered for the actual UX)
- Translating the **profile** itself (stays user-authored)
- fr/es/it support (tracked separately; requires prompt-chain support first)
- DOCX export (separate roadmap item from the competitor analysis)
