# Fix Plan: Template Customization Gap (Fonts, Sizing, Photo, Layout Breadth)

> **Status:** In progress — shipped so far: §3.1 catalog fix (✅ 2026-07-22), §3.2+§3.3 per-application design settings (✅ 2026-07-22: `Application.templateSettings` + shared `TemplateSettings` type, `PATCH /applications/:id/template-settings`, `pdf-v2/design-tokens.ts` scale helpers, all 3 templates consume `resolveDesignTokens`, settings matrix in the validate script), §3.4 font bundling (✅ 2026-07-22: OFL TTFs for Lato/Source Sans 3/Merriweather under `apps/api/assets/fonts/`, lazy `Font.register` in `react-pdf-loader.ts`, `resolveFontStack` threads the family through all templates incl. rich-text `<strong>`/`<em>` cuts, Docker copies the assets, graceful fallback to built-in faces). Next: §3.5 photo, §3.6 design panel, §3.7 new layouts. · **Priority:** P2 (competitor-parity; contained one real P1 bug in §2.5 — **✅ fixed 2026-07-22**, see §3.1)
> **Affected area:** `apps/api/src/pdf-v2/*` (renderer, registry, meta contract), `apps/api/src/templates`, `apps/api/prisma/schema.prisma`, edit-page design UI
> **Related competitor feedback:** jobstep.io review — *"Die Templates sind nett, aber leider nur sehr eingeschränkt anpassbar. Farbe und Schriftgröße ändern geht — viel mehr nicht."* Applo currently offers **less** than that: color variants yes, font size **no**.

---

## 1. Problem Statement

Applo's per-application design customization surface is thinner than every mainstream competitor:

| Knob | Applo today | jobstep.io | resume.io | kickresume |
|---|---|---|---|---|
| Layout designs | **3** real layouts | ~10 | 30+ | 44+ |
| Accent color | fixed variant swatches | fixed palettes | color themes | fully free |
| Font family | ❌ hardcoded Helvetica | limited | several fonts | 15+ fonts |
| Font size | ❌ | ✅ (per review) | ✅ | ✅ |
| Line spacing / density | ❌ | ❌ | partial | ✅ (locker/standard/eng) |
| Photo (DACH standard) | ❌ | ✅ optional | ✅ toggle | ✅ incl. shapes |
| Section reordering | ✅ `sectionOrder` | ✅ drag & drop | ✅ | ✅ |

Our genuine advantages (AI pipeline quality, `sectionOrder`, ATS focus) are undermined by a customization story that loses the feature-table comparison — and by marketing "50 variants" that are really 3 designs × colors × languages.

## 2. Current State Analysis (verified in code)

### 2.1 Only 3 registered designs

`pdf-v2/template-registry.ts` registers `classic-ats`, `harvard-classic`, `elegant-sidebar`. Since v1.16 removed the Puppeteer/Handlebars fallback, **every** active DB template must resolve to one of these factories or `PdfService.generateResumePDF` **throws** (`pdf.service.ts:54,71`).

### 2.2 The customization contract is DB-row-shaped, not user-shaped

`ReactPdfTemplateMeta` (`pdf-v2/types.ts`) carries only `{ language, accentColor, colorVariantName, atsOptimized }`, built exclusively from the **DB Template row** (`react-pdf-renderer.service.ts#buildMeta`). There is no per-application override channel: a user "picks a color" by selecting a *different template row* (wizard groups rows by `baseTemplateId` and shows variant swatches, `configure-step.tsx:66-105`). Consequences:

- Free color choice is impossible without minting DB rows (design × color × language row explosion)
- No place to express font size / family / density even though the plumbing (`meta` → `buildStyles(rp, accent)`) would carry it naturally

### 2.3 Fonts: hardcoded Helvetica, bundling already planned but never done

Every template hardcodes `fontFamily: 'Helvetica'` with fixed `FS`/`SP` px-derived constants (`classic-ats.tsx:57-75`). The file header explicitly documents the debt: *"The HTML version uses Lato/Source Sans 3 — registering those via `Font.register()` is deferred to the font-bundling follow-up."* The skill recipe (`.github/skills/pdf-react-pdf-template.md`) likewise says *"Adding fonts … defer for now."* That follow-up never happened.

### 2.4 No photo support

- `User.avatarUrl` exists (`schema.prisma:23`, OAuth-populated) but never reaches `ResumeTemplateData` — no `photo` field anywhere in `pdf-v2/template-data.ts`
- No upload UI in the profile, no `<Image>` usage in any template
- A Bewerbungsfoto is a **DACH-market default expectation**; jobstep/resume.io/kickresume all support it. (US/UK + strict ATS contexts want it *off* — must stay a toggle.)

### 2.5 🐛 Catalog can offer templates that crash generation

`TemplatesService.findAll` returns **all** `isActive` DB rows with **no check against the react-pdf registry**. The legacy seeds (`seed-templates.ts`: "Modern Professional", "Tech Modern", "Modern Clean", "Executive Classic", … — 16 entries, `isActive: true`) don't resolve to any registered key. Any environment where those rows survive lets a user pick a template whose generation later fails with `"Resume template … has no react-pdf implementation registered."` This is a real bug independent of the enhancement work.

### 2.6 What already works in our favor

- `sectionOrder` end-to-end (editor → stored JSON → all 3 templates, regression-tested in `section-order.unit.spec.ts`)
- `color-utils.ts` derives sidebar/secondary/text shades from a **single accent hex** — the exact foundation a free color picker needs
- `PreviewRendererService` renders PNG previews without Chromium — cheap to re-preview
- The skill recipe + `PDF-Template-Agent` give us a repeatable process for authoring new TSX designs

## 3. Solution Design

### Guiding decisions

1. **Per-application design settings, not more DB template rows.** Introduce `Application.templateSettings` and thread it through `meta`. The DB `Template` row keeps defining the *design*; the settings define the *user's tuning* of it. Long-term this lets us collapse the color-variant row explosion (rows become design × language only; colors become presets).
2. **Bounded knobs, not a free-form editor.** Enum scales (`fontScale: 'sm'|'md'|'lg'`, `density: 'compact'|'normal'|'relaxed'`, curated font pairs) keep every combination testable and every output ATS-safe — deliberately kickresume-lite, jobstep-plus.
3. **Photo is profile data + a per-application toggle**, mirroring how DACH users actually work (one photo, per-application decision to include it).
4. **Fix the catalog/registry integrity bug first** — it's small and independent.

### 3.1 Catalog integrity fix (bug, ship first) — ✅ Implemented (2026-07-22)

- `TemplatesService.findAll`: filter rows through `resolveReactPdfTemplate` (or the existing `ReactPdfRendererService.supports()`) so unregistered designs never reach the client. Log a warning listing hidden rows.
- One-off cleanup guidance (no migration): deactivate legacy seed rows in staging/prod DBs; delete the dead legacy seeds (`seed-templates.ts`, `seed-multilingual-templates.ts`) in favor of the autodiscover/TSX-era seeding, or mark their entries `isActive: false`.
- Defense in depth: keep the `PdfService` throw (correct last line of defense).

> **Implementation deltas:** shipped as `fix(templates)` with a type-aware pure helper (`isRenderableTemplate` in `template-registry.ts`) filtering `findAll`, `findByCategoryAndLanguage` (both language + EN-fallback picks — a same-category legacy row could previously win the language resolution and crash the export processor) and `findDefault`. The "autodiscover" seed turned out to be HBS-era and dead (read a deleted `src/pdf/templates` folder), and `seed-all.ts` (the `prisma db seed` hook) was still re-seeding the legacy multilingual rows — all three legacy seeds were deleted and replaced by the canonical `prisma/seed-react-pdf-templates.ts`, which upserts the 18 registered rows and idempotently **deactivates** any active row without a TSX factory (the staging/prod cleanup, expressed as seed logic instead of manual SQL). Compiled-seed paths in `seed-all`/`package.json#prisma.seed` were fixed en route (they pointed at the wrong `prisma/dist` depth).

### 3.2 Schema + DTO

```prisma
// Application
templateSettings Json? // TemplateSettings — per-application design tuning
```

```ts
// packages/shared (used by web + api)
interface TemplateSettings {
  fontFamily?: 'default' | 'lato' | 'source-sans' | 'merriweather'; // curated set
  fontScale?: 'sm' | 'md' | 'lg';        // md = today's sizes; sm/lg = ×0.92 / ×1.08
  density?: 'compact' | 'normal' | 'relaxed'; // scales SP constants + lineHeight
  accentColor?: string;                   // free hex, overrides template variant
  showPhoto?: boolean;                    // default false
}
```

- New `PATCH /api/v1/applications/:id/template-settings` (thin controller + DTO: `@IsIn` enums, hex `@Matches(/^#[0-9a-fA-F]{6}$/)`, ownership-scoped service) — or fold into the existing update-resume call; decide during implementation, PATCH preferred (settings ≠ content, avoids autosave coupling).
- Expand-only migration: `npx prisma migrate dev --name application_template_settings`.

### 3.3 Renderer meta extension

- Extend `ReactPdfTemplateMeta` with `fontFamily?`, `fontScale?`, `density?`, `photoUrl?` (resolved server-side to a fetchable URL/absolute path for react-pdf `<Image>`); `accentColor` precedence: `settings.accentColor ?? template.accentColor`.
- `buildMeta(meta, options, settings)` merges DB row + per-application settings. Callers (`application.processor.ts` via `PdfService`) pass `application.templateSettings`.
- Templates: parametrize the existing constants —
  ```ts
  const FS = scaleFonts(meta.fontScale);   // shared helper in pdf-v2/design-tokens.ts
  const SP = scaleSpacing(meta.density);
  const family = resolveFamily(meta.fontFamily); // falls back to Helvetica
  ```
  Shared helper module so all three (and future) templates stay consistent. `wrap={false}`-based page-break behavior is scale-safe.

### 3.4 Font bundling (the deferred follow-up, finally)

- Bundle OFL-licensed TTFs under `apps/api/assets/fonts/`: **Lato** + **Source Sans 3** (what the original HTML designs used) + **Merriweather** (serif option for Harvard-style designs). Regular/Bold/Italic cuts only (~6 files/family).
- Register lazily in `react-pdf-loader.ts` after namespace load (`Font.register({ family, fonts: [...] })` — global, idempotent, safe across concurrent renders).
- Verify Docker image copies `assets/fonts` (multi-stage `infra/Dockerfile`) and PDF size stays acceptable (react-pdf subsets embedded TTFs; expect +50–150 KB/doc).
- Update the skill file: fonts are no longer "deferred"; document the curated set + how to add one.

### 3.5 Photo support (DACH)

- `Profile.photoUrl String?` (separate from `User.avatarUrl` — account avatar ≠ Bewerbungsfoto) + upload via the existing `uploads`/`storage` modules (whitelist `image/jpeg|png`, ≤ 2 MB, stored under `profiles/<id>/photo.*` in R2/disk; served to the renderer via signed URL or direct storage read)
- Profile UI: photo upload/crop-to-portrait/remove (react-dropzone already in stack)
- Templates: `elegant-sidebar` (natural fit — sidebar header) and `harvard-classic`/`classic-ats` (optional right-aligned header block) render `<Image>` only when `meta.photoUrl && settings.showPhoto`
- Guardrails: wizard/editor shows an ATS note when enabling the photo ("Für ATS-Systeme und Bewerbungen außerhalb der DACH-Region empfohlen: ohne Foto"); GDPR: photo is personal data — include in existing account-deletion cascade + document in privacy policy (storage keys deleted with profile)

### 3.6 Frontend design panel

- Edit page: new "Design" panel (shadcn `Select`/`RadioGroup`/color picker) → `PATCH template-settings` (TanStack Query mutation, optimistic update, existing `apiClient`)
- Live preview approximation: `template-preview.tsx` mimic applies font-family/scale/density CSS variables so users see the effect immediately; exact rendering remains the exported PDF (unchanged principle)
- Wizard (`configure-step.tsx`): keep simple — design + color presets; free color + typography live in the editor to avoid wizard overload
- German-first, profession-neutral copy per repo conventions

### 3.7 Layout breadth (content workstream, parallel)

- Author 2–3 new TSX designs from scratch via the skill recipe + `PDF-Template-Agent`: a **modern two-column** (sidebar-left, sans-serif), a **minimal single-column** (generous whitespace), an **executive serif** (Merriweather). Legacy HTML sources are gone (v1.16) — the old seed names ("Tech Modern", "Modern Clean", …) serve as design briefs only.
- Each new design: factory + registry entry + DB seed (design × language rows, color as presets) + preview PNG + colocated unit spec (mirror `section-order.unit.spec.ts` + `language-precedence.unit.spec.ts` patterns) + validation via `npx ts-node -r tsconfig-paths/register scripts/validate-react-pdf-templates.ts`
- Marketing honesty follow-up: present the catalog as "N Designs × Farben" rather than counting variants.

## 4. Implementation Steps

| # | Step | Files | Size |
|---|------|-------|------|
| 1 | 🐛 Catalog filters unregistered designs + legacy seed cleanup | `templates.service.ts`, seeds | S |
| 2 | Shared `TemplateSettings` type + Prisma column + migration | `packages/shared`, `schema.prisma` | S |
| 3 | `PATCH /applications/:id/template-settings` (DTO, service, Swagger) | `applications/*` | S |
| 4 | Meta extension + `design-tokens.ts` scale helpers + template consumption | `pdf-v2/types.ts`, `react-pdf-renderer.service.ts`, 3 template files, `pdf.service.ts`, `application.processor.ts` | M |
| 5 | Font bundling + lazy registration + Docker asset check + skill-file update | `assets/fonts/*`, `react-pdf-loader.ts`, `infra/Dockerfile`, `.github/skills/pdf-react-pdf-template.md` | M |
| 6 | Photo: `Profile.photoUrl` + upload endpoint + profile UI + template `<Image>` + deletion cascade | `schema.prisma`, `uploads`/`profile`, templates, web profile page | L |
| 7 | Editor "Design" panel + live preview approximation | `edit/page.tsx`, `template-preview.tsx`, hooks | M |
| 8 | New designs ×2–3 (parallel content work) | `pdf-v2/templates/*`, registry, seeds | L |
| 9 | Docs sync (mandatory): README, ARCHITECTURE, copilot-instructions (Data Model, API Endpoints, pdf-v2 module) | docs | S |

Suggested PR split (trunk-based, conventional commits):
1. `fix(templates): hide catalog designs without a registered react-pdf factory` (step 1)
2. `feat(pdf): per-application design settings — font scale, density, accent override` (steps 2–4, 9)
3. `feat(pdf): bundle OFL font families for resume templates` (step 5)
4. `feat(profile): optional application photo with per-application toggle` (step 6, 9)
5. `feat(web): design panel in application editor` (step 7)
6. `feat(pdf): add <design-name> template` (step 8, one PR per design)

## 5. Testing Plan

- **Unit (vitest, colocated in `pdf-v2/templates/`):**
  - `design-tokens`: scale math (`sm`/`lg` multipliers, density spacing) — pure function tests
  - Per template: render with `fontScale: 'lg'` + `density: 'compact'` → parses via `pdf-parse`, all sections present, page count sane (pattern: `section-order.unit.spec.ts`)
  - Font registration: render with `fontFamily: 'lato'` succeeds and falls back to Helvetica when family unknown
  - Photo: renders with/without `photoUrl`; absent photo leaves layout intact
  - Registry filter: `findAll` excludes a fabricated unregistered active row
- **DTO validation:** invalid hex, out-of-enum values → 400
- **Standalone check:** `scripts/validate-react-pdf-templates.ts` extended to iterate settings matrix (3 designs × 3 scales × 3 densities × fonts)
- **Manual staging pass:** DE/EN exports with photo on/off; visual check of all knob combinations on one-page and multi-page profiles

## 6. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Scaled fonts break page-break layout on long profiles | Bounded scale range (±8%); `wrap={false}` blocks unchanged; matrix test in validate script |
| Embedded fonts bloat PDFs / break ATS text extraction | react-pdf subsets TTFs; keep `pdf-parse` assertions in specs (extraction = ATS proxy) |
| `Font.register` global state across concurrent renders | Families are registered once by unique name; no per-render mutation |
| Photo hurts ATS parsing / non-DACH conventions | Off by default; explicit UI warning; ATS-optimized flag can force-suppress |
| Photo = sensitive personal data (GDPR) | EU R2 bucket (existing), deletion cascade, documented in privacy policy; never in logs |
| Color-variant row collapse breaks existing applications' `resumeTemplateId` | Do the row collapse **later** as a separate migration with id-mapping; this plan only *adds* the override channel |
| Legacy seed cleanup deactivates a row some old application references | `onDelete: SetNull` semantics unaffected (we deactivate, not delete); processor falls back to default template |

## 7. Explicit Non-Goals

- Free-form drag-and-drop layout editor (kickresume-level) — bounded knobs only
- Custom user-uploaded fonts (licensing/rendering risk)
- Per-section font overrides or arbitrary spacing values
- Reviving the Handlebars/Puppeteer template pipeline
- Template marketplace / user-shared designs
- Collapsing the color-variant DB rows (follow-up migration once settings-based colors are proven)
