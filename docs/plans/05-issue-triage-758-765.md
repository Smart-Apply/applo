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

## Expected disposition

| Issue | Likely outcome |
|---|---|
| #758 Sidebar/responsive | Re-scope to whatever mobile gaps genuinely remain; much is done. Overlaps #573 — consider merging |
| #759 Contrast | Re-verify against the real token set, then keep. Contrast work is probably still needed, just not on `--ink-400` |
| #760 Fonts | **Close.** `next/font/google` already self-hosts |
| #761 Save model | Verify against the real profile page — does it use a save button or autosave? Keep if the inconsistency is real |
| #762 Inline edit | Re-scope to the actual editing pattern, or close if the profile page doesn't use inline edit |
| #763 Profile check | Verify the displayed weights against `calculateProfileStrength`; the mismatch may be prototype-only |
| #764 Field validation | Likely still valid — check whether the profile form already uses Zod |
| #765 ARIA | **Keep as-is.** Confirmed real. Proceed to [plan 06](./06-issue-765-accessibility.md) |

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
