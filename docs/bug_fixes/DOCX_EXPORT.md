# Fix Plan: No DOCX/Text Export — Platform Lock-in

> **Status:** Planned · **Priority:** P2 (competitor-parity / retention argument)
> **Affected area:** `apps/api/src/applications` (download endpoints), new `apps/api/src/docx` module, application detail/editor download UI
> **Related competitor feedback:** jobstep.io review — *"Es gibt keine Möglichkeit, die Templates außerhalb der Plattform zu bearbeiten. Klar, das ist natürlich Teil des Geschäftsmodells (Jobstep will ja, dass die Leute da bleiben) …"* Applo has the **same lock-in**: PDF is the only export format.

---

## 1. Problem Statement

Users cannot take their generated documents into Word/Google Docs/Pages for final personal tweaks. Today's export surface (verified):

- `GET /applications/:id/download/cover-letter` / `/download/resume` — **PDF streams only** (`applications.controller.ts:477,502`)
- `GET /applications/:id/files` — signed URLs to the same PDFs
- Web "download all" bundles the same PDFs into a zip (`apps/web/src/lib/pdf-utils.ts`, jszip)

The reviewer explicitly frames PDF-only export as a business-model lock-in and names it a reason to prefer free ChatGPT. Shipping an editable export **flips the narrative**: Applo generates + tailors, and the user still owns the result. It also matters functionally — some ATS/job portals explicitly request `.docx` uploads, and the combination with the language-switch bug (see `LANGUAGE_SWITCH_EXPORT.md`) makes lock-in doubly painful today.

## 2. Current State Analysis (verified in code)

### 2.1 Source data is *ideal* for DOCX generation

- `Application.resumeText` = **structured JSON** (`ResumeTemplateData`: contact, summary, `skillCategories[]`, `experiences[]` with achievements, `education[]`, `projects[]`, `certifications[]`, `languages[]`, optional `sectionOrder`) — no parsing needed, maps 1:1 onto a Word document tree
- `Application.coverLetterText` = **HTML** (generation converts Markdown → HTML via `marked`, `applications.service.ts#convertCoverLetterToHtml`; editor saves Tiptap StarterKit HTML) — a *small, known tag subset* (`p`, `strong`, `em`, `ul/ol/li`, `br`)
- Section labels are already localized in `pdf-v2/i18n.ts` (`tLabel`) — reusable as-is

### 2.2 What's missing

- No DOCX (or plain-text/Markdown) generation anywhere in `apps/api`
- No format parameter on the download endpoints
- Frontend download buttons/zip assume PDF
- `turndown` (HTML→Markdown) exists in **web** deps — a "copy as text" affordance was never built

### 2.3 Useful accident: `mammoth` is already an API dependency

The resume-parser intake uses `mammoth` (DOCX → text). That gives us a **round-trip test loop for free**: generate DOCX → `mammoth.extractRawText` → assert content, in plain vitest with no Word installation.

## 3. Solution Design

### Guiding decisions

1. **One ATS-plain DOCX layout, not three visual clones.** Reproducing `classic-ats`/`harvard-classic`/`elegant-sidebar` pixel-perfectly in OOXML is a fidelity trap (Word's layout engine ≠ react-pdf). The PDF stays the *designed* artifact; the DOCX is the *editable, ATS-safe* artifact — single-column, standard styles, correct heading hierarchy. This matches how competitors' Word exports actually behave and what ATS parsers prefer.
2. **Generate on the fly, don't persist.** DOCX generation from JSON is milliseconds (no Chromium, no LLM). No storage keys, no invalidation problem — unlike PDFs, which are pipeline artifacts.
3. **Library: `docx` (npm).** MIT-licensed, TypeScript-native, actively maintained, produces OOXML from a declarative document tree, zero native deps — fits the "no browser dependencies" direction the repo took in v1.16. (Alternatives rejected: `html-to-docx` — quality varies wildly, we'd throw away our structured JSON; pandoc — system binary in the Fly image, overkill.)
4. **Available to all tiers.** The entire point is neutralizing the lock-in criticism; paywalling the escape hatch recreates it. (Decision point flagged in §6 if product wants Pro-gating later — the guard seam is one decorator.)

### 3.1 New `docx` module (`apps/api/src/docx/`)

```
docx/
├── docx.module.ts          # exports DocxService; imported by ApplicationsModule
├── docx.service.ts         # public API: renderResume(), renderCoverLetter()
├── resume-docx.builder.ts  # ResumeTemplateData → docx Document tree
├── cover-letter-docx.builder.ts # HTML → docx paragraphs
└── html-to-runs.util.ts    # tiny mapper for the Tiptap tag subset
```

- `DocxService.renderResume(data: ResumeTemplateData, lang: string): Promise<Buffer>`
  - Honors `sectionOrder` via the existing `resolveSectionOrder` helper (same contract as PDF templates: unknown keys dropped, omitted sections appended)
  - Labels via `tLabel(key, lang)` from `pdf-v2/i18n.ts`
  - Styling: Word built-in styles (Title, Heading1, Normal), Helvetica-family default (Arial), accent color from settings where trivially applicable (heading color) — nothing fancier
- `DocxService.renderCoverLetter(html: string, data: CoverLetterTemplateData, lang: string): Promise<Buffer>`
  - `html-to-runs.util.ts` walks the known Tiptap subset (`p`, `strong`, `em`, `ul/ol/li`, `br`) into `Paragraph`/`TextRun`s; unknown tags degrade to plain text (never throw)
  - Sender block / date / recipient reuse the same fields the PDF cover letter template consumes
- No env vars, no pluggable driver — deterministic pure function of stored content

### 3.2 API surface

Extend the existing download endpoints with a validated format query (backwards compatible, no new routes to document separately):

```
GET /api/v1/applications/:id/download/resume?format=pdf|docx        (default: pdf)
GET /api/v1/applications/:id/download/cover-letter?format=pdf|docx  (default: pdf)
```

- New `DownloadFormatDto` (`@IsIn(['pdf','docx'])`), controller stays thin
- `format=docx` path: ownership check (existing `getFileStream` guard logic) → parse stored JSON/HTML → `DocxService` → `StreamableFile` with `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `Content-Disposition: attachment; filename="resume-<id>.docx"`
- Works for any `READY` application — including cover-letter-opt-out apps (resume only), mirroring PDF behavior
- Swagger: document the query param + both content types on the existing operations

### 3.3 Plain-text/Markdown copy (cheap add-on, same PR as frontend)

- Editor + detail page: "Als Text kopieren" action — cover letter HTML → Markdown via the already-installed `turndown` (web-side, no API change); resume → simple text serializer from the parsed JSON the editor already holds
- Directly serves the reviewer's "use it wherever I want" expectation with ~50 lines of frontend code

### 3.4 Frontend

- Replace single download buttons with a small shadcn `DropdownMenu`: "PDF herunterladen" / "Word (.docx) herunterladen" / "Als Text kopieren" (detail page + editor header)
- `apiClient` gets `downloadApplicationFile(id, kind, format)` (blob fetch, `credentials: 'include'` as everywhere)
- Zip download (`pdf-utils.ts`): include both formats when the user picks "alles herunterladen" (PDF + DOCX per document)
- German-first copy; note under the Word option: "Ideal für eigene Anpassungen — Layout ist bewusst schlicht gehalten (ATS-optimiert)."

## 4. Implementation Steps

| # | Step | Files | Size |
|---|------|-------|------|
| 1 | Add `docx` dependency (`pnpm add docx --filter @applo/api` + lockfile in same PR) | `apps/api/package.json`, `pnpm-lock.yaml` | S |
| 2 | `DocxModule` + resume builder (sectionOrder + i18n labels) | `apps/api/src/docx/*` | M |
| 3 | Cover-letter HTML → docx builder + tag-subset mapper | `docx/cover-letter-docx.builder.ts`, `html-to-runs.util.ts` | M |
| 4 | `?format=` on both download endpoints + DTO + Swagger | `applications.controller.ts`, `applications.service.ts`, new DTO | S |
| 5 | Frontend download menu + copy-as-text + zip inclusion | `apiClient`, detail page, editor, `pdf-utils.ts` | M |
| 6 | Docs sync (mandatory: new backend module + endpoint change): README, ARCHITECTURE, copilot-instructions (Backend Modules, API Endpoints) | docs | S |

Suggested PR split (trunk-based, conventional commits):
1. `feat(docx): ATS-plain Word export for resume and cover letter` (steps 1–4, 6)
2. `feat(web): download format menu and copy-as-text` (step 5)

## 5. Testing Plan

- **Unit (vitest, `apps/api/src/docx/__tests__/`):**
  - Resume builder: render sample `ResumeTemplateData` (reuse the fixture shape from `section-order.unit.spec.ts`) → `mammoth.extractRawText` → asserts: all sections present, `sectionOrder` respected (index comparisons, same pattern as the PDF spec), DE vs EN labels correct
  - Cover-letter builder: Tiptap-typical HTML (`<p>`, `<strong>`, `<ul><li>`) → text round-trip preserves content + order; unknown tag degrades gracefully
  - Empty-field handling: missing projects/certs sections omitted without error
- **Controller:** format param validation (400 on `format=rtf`), correct Content-Type headers, ownership 404
- **Manual pass:** open generated files in Word, LibreOffice, and Google Docs (the three real targets); check umlauts, bullets, bold runs, spacing

## 6. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Users expect the DOCX to look like the chosen PDF design | Explicit UI copy ("bewusst schlicht — ATS-optimiert"); PDF remains the designed artifact |
| Tiptap HTML evolves beyond the mapped tag subset | Mapper degrades unknown tags to plain text, never throws; unit spec pins the subset |
| Product later wants DOCX Pro-gated | Single seam: add `@RequiresFeature`/tier check on the `format=docx` branch — flagged as a product decision, default = all tiers |
| Word export becomes a channel to bypass usage limits | Non-issue: export renders *already generated* content; generation stays metered |
| `docx` dependency bloat | Pure-JS, ~1 MB, no native/Chromium deps — consistent with v1.16 direction |

## 7. Explicit Non-Goals

- Pixel-faithful reproduction of the three react-pdf designs in OOXML
- DOCX **import**/round-trip editing (Applo's editor stays the source of truth; re-import is a different feature)
- ODT/RTF/Google-Docs-API exports (DOCX opens everywhere that matters)
- Photo embedding in DOCX v1 (follows the photo feature from `TEMPLATE_CUSTOMIZATION.md` once shipped)
- Server-side zip bundling (stays client-side with jszip)
