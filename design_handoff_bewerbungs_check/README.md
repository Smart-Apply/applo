# Handoff: Bewerbungs-Check Redesign

## Overview
A redesign of the **Bewerbungs-Check** (application check) feature in SmartApply. The current screen is a dense two-column form (giant always-visible textareas dumping the full résumé) sitting next to an empty result panel. The redesign replaces it with a **guided 3-step flow** that shows one focused task at a time, plus a polished, scannable result view.

Flow: **Step 1 Unterlagen → Step 2 Zielstelle → (loading) → Ergebnis**, with a separate **Frühere Checks** (history) view.

The redesign also adds a new capability requested by the team: in Step 2 the user can **analyze a job posting by link**, with a **paste-text fallback** when the link can't be fetched.

## About the Design Files
The files in this bundle are **design references created in HTML/CSS/JS** — a clickable prototype showing the intended look and behavior. They are **not production code to copy directly**.

The task is to **recreate this design inside the existing SmartApply web app** (`apps/web`, Next.js App Router + React + Tailwind + shadcn/ui), reusing its established components, hooks, and design tokens. The HTML mirrors those tokens already, so most of the work is wiring the same structure into React with the existing primitives.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, and interactions are intended to ship as-is. Recreate pixel-faithfully using the codebase's existing UI primitives (`@/components/ui/*`) rather than hand-rolling new ones. Exact values are listed under **Design Tokens** below; they already match `apps/web/color palette.json`.

## Target files in the codebase
- `apps/web/src/app/(dashboard)/validate/page.tsx` — **the page.** Currently a single form + result + history. Becomes the 3-step wizard host (stepper + step state machine + history view).
- `apps/web/src/components/validation/validation-result-view.tsx` — **the result.** Already receives the right data shape; restyle it to the new hero / categories / recommendations / strengths layout.
- New (suggested): `apps/web/src/components/validation/check-stepper.tsx`, `document-input.tsx`, `job-context-input.tsx` to keep `page.tsx` small.
- Hooks already present and reused unchanged: `useValidations`, `useValidation`, `useCreateValidation`, `useDeleteValidation`, `useSubscription`, `api.validation.extractText`.

---

## Screens / Views

### Shared chrome
- **Sidebar + dashboard layout** are provided by `(dashboard)/layout.tsx` — do **not** rebuild them. The prototype draws its own sidebar only for context.
- **Page header**: shield icon in a `48px` rounded square (bg `--primary-soft #E5E9F2`, icon `--primary #1B2A49`), `h1` "Bewerbungs-Check" (27px/700), subtitle (15px, `--muted-foreground`). On the right, a secondary **"Frühere Checks"** button (outline, history icon) that switches to the history view.
- **Stepper** below the header, visible on step1/step2/loading/result (hidden on history): three nodes `1 Unterlagen · 2 Zielstelle · 3 Ergebnis` joined by connector lines.
  - Inactive node: white circle, `1.5px` border `--border`, muted number.
  - Active node: filled `--primary`, white number, `4px` ring of `--primary-soft`.
  - Done node: filled `--success #16A34A`, white check icon; connector line to its left fills `--success`.

### Screen 1 — Unterlagen (Documents)
- **Purpose**: collect the résumé (required) and optionally a cover letter.
- **Layout**: single centered card (`max-width: 820px` content column, card `border-radius: 18px`, padding `28px 30px`).
- **Components**:
  - Card head: "Deine Unterlagen" (19px/700) + helper line (14px muted).
  - **Lebenslauf** field, label with red `*`. A **segmented toggle** "Datei hochladen | Text einfügen" (only one pane visible).
    - *Upload pane*: dropzone — `1.5px` dashed `#C7D0E4`, bg `--accent-soft #EAF1FE`, centered icon tile + "**Datei auswählen** oder hierher ziehen" + "PDF oder DOCX · max. 10 MB". After a file is chosen, the dropzone is replaced by a **file chip**: doc icon (primary-soft tile), filename + green "Erkannt" pill, size + "Text erfolgreich gelesen", and an `×` remove button (hover → destructive).
    - *Text pane*: a textarea (min-height 150px) with a live char counter `n / 24.000 Zeichen`.
  - **Anschreiben (optional)**: a dashed **"+ Anschreiben hinzufügen"** button. Clicking expands a block with its own "Entfernen" control and the same upload/text toggle. Keeps the first screen simple.
  - Footer: primary **"Weiter zur Zielstelle"** (arrow icon), **disabled** until the résumé is valid (file uploaded OR ≥50 chars pasted).

### Screen 2 — Zielstelle & Feedback
- **Purpose**: optionally add job context (to score role-fit) plus title and feedback language, then run the check.
- **Components**:
  - **Zielstelle / Stellenanzeige (optional)** with a **toggle "Link analysieren | Text einfügen"**.
    - *Link pane*: a URL field (globe icon + input) and a primary **"Analysieren"** button.
      - On analyze: button shows a spinner ("Analysiere…") ~1.1s, then:
        - **Success** → collapses to a chip showing the parsed posting title + source host (e.g. "openai.com · Anzeige erfolgreich gelesen") + green "Analysiert" pill + remove `×`.
        - **Failure** → an amber warning note: "Der Link konnte nicht gelesen werden… **Text der Anzeige einfügen →**" (the link switches to the text pane).
      - There is always a path to the text fallback so the feature degrades gracefully.
    - *Text pane*: textarea for pasting the full posting.
  - Row of two: **Titel (optional)** input + **Sprache des Feedbacks** select (`Automatisch / Deutsch / English`).
  - Info note (accent-soft) about privacy / what changes without job context.
  - Footer: ghost **"Zurück"** + primary **"Bewerbung prüfen"** (sparkle icon).

### Screen 3a — Loading
- **Purpose**: feedback while the check runs.
- **Components**: centered card with a spinning ring + shield core, "Deine Bewerbung wird geprüft …", and a 4-item checklist that advances: *Dokumente werden gelesen → Qualität wird bewertet → ATS-Tauglichkeit wird geprüft → Empfehlungen werden erstellt*. Current item shows a small spinner; completed items turn green with a check.

### Screen 3b — Ergebnis (Result)
- **Purpose**: present the score and actionable feedback. This is `validation-result-view.tsx`.
- **Components, in order**:
  1. **Result top bar**: green-check icon + "Dein Ergebnis", and a ghost **"Neuer Check"** button (resets to step 1).
  2. **Hero card** (`grid: auto 1px 1fr`): left = an **SVG score ring** (124px, 11px stroke, track `#EDEFF4`, progress colored by score) with the animated number + "Gesamt-Score", and a secondary **ATS-Score** stat. Divider. Right = a **verdict pill** + **summary** paragraph.
     - Verdict pill colors: `strong` → `--success` bg/white; `good` → `--warning` bg/white; `needs_work` → `--destructive` bg/white. Label text comes from the result (`Bereit zum Absenden` etc.).
  3. **Categories card**: header "Bewertung nach Kategorie", then rows sorted (prototype shows highest-first; current code sorts lowest-first — keep whichever the team prefers, but be consistent). Each row: status icon + label, score number, and a thin animated progress bar. Color by score: ≥80 green, 60–79 amber, <60 red.
  4. **Recommendations card**: header "Empfehlungen · zum Abhaken". Each item is a card with a **checkbox** (click toggles done → strikethrough + muted), title, and detail. (Optional enhancement: the "done" state is local UI only unless you persist it.)
  5. **Strengths card**: header (green) + list with circular check icons.
  6. Footnote: "*Der ATS-Score ist eine KI-Einschätzung, kein echter ATS-Parser-Durchlauf."

### Screen 4 — Frühere Checks (History)
- **Purpose**: list saved checks; open or delete.
- **Components**: card with a list. Each row: a colored verdict dot, title + sub ("date · Lebenslauf + Anschreiben"), score (colored by band), an **"Öffnen"** outline button, and a delete (trash) button. Top-right primary **"Neuer Check"**. Maps to the existing `useValidations()` / `useDeleteValidation()` data.

---

## Interactions & Behavior
- **Navigation**: a single `screen` state drives which view shows. `goStep(1|2)` for the wizard; `runCheck()` goes to loading then result; the header button / row buttons switch to history.
- **Stepper** reflects the current screen (loading and result both = step 3) and is hidden on history.
- **Step-1 validation**: "Weiter" disabled until résumé present — file uploaded **or** pasted text ≥ 50 chars (matches the existing zod schema: `resumeText.min(50)`).
- **Link analysis**: validate URL shape client-side, but **perform the fetch + HTML extraction server-side** (see State/Data). Always offer the text fallback on failure.
- **Animations**: result ring + count-up (~1.1s, `cubic-bezier(.4,0,.2,1)`); category bars fill staggered (~90ms apart); screens fade-in (translateY 10px, 0.35s). Respect `prefers-reduced-motion` when porting.
- **Loading checklist** advances ~700ms per step in the prototype; in production drive it off real request progress or keep it as a timed affordance until the response resolves.

## State Management
Existing (reuse as-is):
- `useValidations()` → history list; `useValidation(activeId)` → one record; `useCreateValidation()` → run a check; `useDeleteValidation()`; `useSubscription()` → quota/limit; `api.validation.extractText(file)` → PDF/DOCX → text.

New for this redesign:
- `step: 'step1' | 'step2' | 'loading' | 'result' | 'history'` (and `activeId` as today).
- Form values (keep react-hook-form + zod): `resumeText`, `coverLetterText?`, `jobContext?`, `title?`, `language`.
- Per-field **input mode**: `resumeMode: 'upload'|'text'`, `coverMode`, `jobMode: 'link'|'text'`; `coverVisible: boolean`.
- Job link: `jobUrl`, `jobFetchStatus: 'idle'|'loading'|'success'|'error'`, parsed `{title, host}`.

### New data requirement — job link fetching (server-side)
- Add an endpoint, e.g. `POST /api/validations/fetch-job` `{ url }` → `{ title, text, host }`, that fetches the page, strips boilerplate, and returns posting text. **Do not fetch from the browser** (CORS + needs server HTML parsing). On success, populate `jobContext` with the extracted text; on failure return an error and the UI shows the paste fallback. If this endpoint isn't built yet, ship the text-paste path first — the link toggle can be feature-flagged.

## Design Tokens
(Values match `apps/web/color palette.json` and `globals.css`.)

**Colors**
- Primary `#1B2A49` · primary-hover `#243757` · primary-soft `#E5E9F2`
- Accent `#3B82F6` · accent-soft `#EAF1FE`
- Foreground/text `#1B2A49` · secondary `#6B6969` · muted-foreground `#6B6969`
- Background `#FFFFFF` · muted `#F5F6F8` · border `#E6E8EE` (subtle), input `#E0E0E0`
- Success `#16A34A` / soft `#E7F6EC` · Warning `#D9920A` / soft `#FBF1D9` · Destructive `#DC2626` / soft `#FCEBEB`
- Ring track `#EDEFF4` · dashed dropzone border `#C7D0E4`

**Score color bands**: ≥80 success · 60–79 warning · <60 destructive.

**Typography**
- Sans: **Geist** (400/500/600/700). Display (headings like brand/h1): **Poppins** 600/700. Mono: Geist Mono.
- h1 27px/700, -0.025em · card h2 19px/700 · body 14–15px · labels 14.5px/600 · section eyebrow 13px/700 uppercase 0.06em · footnote 12px italic.

**Radius**: cards 18px · inputs/buttons 12–14px · pills 999px · small tiles 9–11px.

**Shadows**
- soft `0 2px 10px -2px rgba(27,42,73,.06), 0 10px 25px -5px rgba(27,42,73,.04)`
- card `0 1px 2px rgba(27,42,73,.04), 0 6px 16px -8px rgba(27,42,73,.10)`
- medium `0 4px 20px -4px rgba(27,42,73,.10), 0 18px 40px -10px rgba(27,42,73,.08)`

**Spacing**: content column max 820px; card padding 28–30px; field groups ~24px apart; consistent 4px-based gaps.

## Component mapping (HTML → codebase)
- Segmented toggles → small custom segmented control, or reuse `Tabs` from `@/components/ui` if present.
- Dropzone/file chip → existing `<FileUpload>` (`@/components/ui/file-upload`) + a chip styled per above.
- Textareas/inputs/select → `@/components/ui/{textarea,input,select,label}`.
- Buttons → `@/components/ui/button` (variants: default=primary, outline=ghost). Note the existing Button supports `loading`.
- Progress bars → `@/components/ui/progress`. Score ring is a custom SVG (no existing component).
- Badges/pills → `@/components/ui/badge`.
- Icons → `lucide-react` (ShieldCheck, Upload, FileText, Link2, Globe, Sparkles, Check, AlertTriangle, RotateCcw, Trash2, ArrowRight, ArrowLeft, Plus, History).

## Assets
No bitmap assets. All icons are inline SVG in the prototype → replace with `lucide-react` equivalents. Brand logo/colors come from the existing app — use those, not the prototype's inline mark.

## Files in this bundle
- `Bewerbungs-Check Redesign.html` — the full clickable prototype (all screens + interactions). Open it in a browser; use the bottom **ANSICHT** bar to jump between states.

A developer who wasn't in this conversation should be able to implement the feature from this README alone, using the HTML as the visual source of truth.
