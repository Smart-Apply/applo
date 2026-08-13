# 05 — Re-scope the profile-redesign issue batch

**Issues:** #758, #759, #760, #761, #762, #763, #764, #765
**Phase:** 2 · **Effort:** ~2 h · **Owner:** dev

---

## Goal

Make eight issues describe the shipped application instead of a prototype, so
nobody builds against a spec that doesn't match reality.

## The problem

Issues #758–#765 were written by reading the design prototype in
[docs/design/](../design/) — `profile-applo.jsx`, `profile-shared.jsx`,
`profile.css` — not `apps/web`. Their "Current State" sections describe that
prototype's markup and CSS.

This was verified selector by selector, on `main`:

| Issue claim | Reality |
|---|---|
| #758: fixed 224 px sidebar, no hamburger, content pushed out of viewport ≤768 px | [layout.tsx](../../apps/web/src/app/%28dashboard%29/layout.tsx) already imports `Sheet` + `MobileBottomNav` and a `Menu` icon |
| #760: fonts loaded via Google Fonts `<link>`, blocked by CSP, degrades to `system-ui` | [layout.tsx](../../apps/web/src/app/layout.tsx) uses `next/font/google` (Inter, Archivo, IBM Plex Mono), which **self-hosts at build time**. The CSP problem cannot occur |
| #759: secondary text uses `--ink-400` (#94a3b8) | `--ink-400` does not exist in [globals.css](../../apps/web/src/app/globals.css) |
| #762: inline edit via `.sa-edit` contentEditable | `.sa-edit` exists only in `docs/design/`. The shipped app has `.sa-editor` — the *application* editor, a different component |
| #765: no ARIA on progress ring, icon-only buttons, checklist rows | **Confirmed real.** The shipped [profile page](../../apps/web/src/app/%28dashboard%29/profile/page.tsx) has **zero** `aria-label` or `role` attributes, and `role="progressbar"` appears nowhere in `apps/web/src` |

So one of the eight is accurate as written, one is entirely moot, and the rest
need their premises re-checked against real files.

## Why this matters more than it looks

These issues have real acceptance criteria attached to false premises. Anyone
picking up #760 would spend the afternoon "migrating off Google Fonts CDN" that
the app has never used in production. Worse, an agent working from the issue
body — which is exactly the delegation model now in use — has no way to notice.

## Scope

For each of #758–#765:

1. Re-read the issue's "Current State" against the actual files.
2. Rewrite that section to describe shipped behaviour, citing file paths.
3. Keep the "Redesign Tasks" that still apply; delete the ones that don't.
4. Close outright anything fully resolved, with a comment explaining which file
   made it moot — so the history stays intelligible.

## Actual outcome — completed 13 Aug 2026

Verified against `main` @ `aaa4562b`. Every claim was checked in code; none was
taken from an issue body. **3 closed, 4 re-scoped, 1 confirmed unchanged.**

| Issue | Outcome | What verification found |
|---|---|---|
| #758 Sidebar/responsive | **closed** (dup of #573) | Shell already has `Sheet` + `MobileBottomNav` + hamburger, with the drawer controlled so it auto-closes on navigation. Remaining mobile work belongs to #573 |
| #759 Contrast | **re-scoped** | Confirmed real. The issue's *number* was right and its *token* wrong: shipped token is `--muted-2` `#94A3B8`, measured **2.56:1** (issue said ~2.6:1), 24 usages. Also found: `--muted-2` is defined twice with different values — `#94a3b8` in `globals.css`, `#A0A0A0` in `home.css` |
| #760 Fonts | **closed** | `next/font/google` self-hosts at build time; zero `fonts.googleapis` references. The CSP failure it describes cannot occur |
| #761 Save model | **re-scoped** | Inconsistency real but differently shaped — **three** models, not two: per-dialog save on `/profile`, sticky `ProfileSaveBar` in `/settings`, silent autosave in the application editor. The claimed header Save button and inline edit don't exist |
| #762 Inline edit | **closed** | No `contentEditable` anywhere in profile. Editing is Dialog-based, which already gives discoverability, Cancel, and `Esc`. One valid leftover was split out as #780: soft-delete + undo toast |
| #763 Profile check | **re-scoped** | The claimed weight mismatch **does not exist** — both use 10/10/10/15/15/15/15/10 = 100. The real risk is duplication: `/profile` re-derives the score with its own `criteria` array instead of calling `calculateProfileStrength`, so the two agree by manual discipline rather than construction |
| #764 Field validation | **re-scoped** | Broader than reported. `contact-editor-dialog.tsx` is the **only** one of five profile dialogs with Zod/react-hook-form; `experience`, `education`, `project`, `certificate` have none. The profile feeds the generation pipeline, so unvalidated input reaches the produced PDF |
| #765 ARIA | **unchanged** | Confirmed exactly as written: 0 `aria-label`/`role` in the 1845-line profile page, `role="progressbar"` absent from all of `apps/web/src` |

### What this cost, and the lesson

One of eight issues described shipped code accurately. The rest were generated
by reading [docs/design/](../design/) rather than `apps/web`, so their premises
described a prototype. Two would have sent someone to fix a problem that does
not exist (#760, #762); one would have had them chase a mismatch that isn't
there (#763); one understated its own scope by 4× (#764).

**Rule going forward:** any issue batch generated from design files needs a
verification pass against the code before it enters the backlog — and
especially before an agent is handed the body as a spec.

## Acceptance criteria

- [ ] All eight issues either updated or closed, each with a comment naming the
      file that was checked.
- [ ] No remaining issue body describes a selector or file that exists only in
      `docs/design/`.
- [ ] Any issue kept has at least one acceptance criterion that can be checked
      by running something.
- [ ] Overlap between #758 and #573 explicitly resolved — merged or scoped
      apart, not left ambiguous.

## Risks and landmines

- **Don't over-close.** The prototype is a design *target*. "This selector
  doesn't exist yet" can mean the redesign hasn't been implemented, not that
  the issue is invalid. Distinguish "already solved differently" (#760) from
  "not built yet" before closing anything.
- Recent PRs (#745 `Design/profile`, #751 `Design/bewerbungen`) moved parts of
  the prototype into the app. Check `git log` for those before assuming a
  prototype selector is unshipped.

## Process note

The root cause is worth recording: these issues were generated from design
files rather than from code. Any future batch generated that way needs a
verification pass against `apps/web` before it enters the backlog — especially
now that issue bodies are being handed straight to agents as specs.
