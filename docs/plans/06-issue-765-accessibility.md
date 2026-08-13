# 06 — Accessibility: ARIA semantics and focus handling

**Issue:** #765 · **Phase:** 3 · **Effort:** ~1 day · **Owner:** web

---

## Goal

Make the authenticated app usable with a screen reader and a keyboard. Start
with the profile page, then extend the same primitives across the shell.

## Verified current state

This is the one issue in the #758–#765 batch whose premise holds up. Verified
on `main`:

- [apps/web/src/app/(dashboard)/profile/page.tsx](../../apps/web/src/app/%28dashboard%29/profile/page.tsx)
  is 1845 lines and contains **zero** `aria-label` or `role` attributes.
- `role="progressbar"` appears **nowhere** in `apps/web/src`. The profile
  strength ring communicates its value visually only.
- Icon-only buttons throughout the profile and shell have no accessible name.

The issue's specific selectors come from the prototype (see
[plan 05](./05-issue-triage-758-765.md)), but the underlying finding is real and
applies to the shipped page.

## Why this is P1 rather than nice-to-have

Beyond the obvious: the **Barrierefreiheitsstärkungsgesetz (BFSG)** — Germany's
implementation of the European Accessibility Act — applies to consumer-facing
digital services. Applo is a paid consumer service targeting German job
seekers, including people whose disability is precisely why they need help
producing applications. Treat WCAG 2.1 AA as the target, not as aspiration.

Worth a proper legal read on whether Applo falls in scope, rather than my
assumption — but the engineering work is justified either way.

## Scope

1. **Progress semantics.** `role="progressbar"` with `aria-valuenow` /
   `aria-valuemin` / `aria-valuemax` on the profile-strength ring and any
   completion bars.
2. **Accessible names.** `aria-label` on every icon-only control — profile
   avatar edit, help "?" affordances, delete buttons, the shell's menu toggle.
3. **Real controls.** Checklist rows that navigate must be `<button>` or `<a>`,
   not click-handled `<div>`s.
4. **Focus.** Visible focus rings on all interactive elements; sensible tab
   order; no focus traps in the `Sheet` drawer.
5. **Live regions.** `aria-live="polite"` for status changes — save confirmed,
   generation progress.
6. **Documented screen-reader pass** over the profile page.

## Out of scope

- Colour contrast — that's #759, and it should be re-verified against the real
  token set first.
- Dark mode (#133).
- Full-app audit. Profile page and app shell only; later pages follow the
  primitives established here.

## Steps

1. Branch `fix/web-a11y-profile`.
2. Install and run an automated checker (`@axe-core/react` in dev, or
   `axe-playwright`) to get a baseline count. Record it.
3. Fix the mechanical findings — names, roles, semantic elements.
4. Keyboard-only pass: reach and operate every control on `/profile` using
   only Tab, Shift+Tab, Enter, Space, Escape.
5. Screen-reader pass with VoiceOver. Write findings into the PR body.
6. Re-run the checker; the count must be zero for the pages in scope.

## Acceptance criteria

- [ ] Automated axe scan of `/profile` and the dashboard shell reports **0
      violations**. Before/after counts in the PR body.
- [ ] Every interactive element on `/profile` is reachable and operable by
      keyboard alone, with a visible focus indicator.
- [ ] The profile-strength ring exposes `role="progressbar"` and a correct
      `aria-valuenow` that updates as the profile changes.
- [ ] No icon-only button lacks an accessible name — verify in the browser
      accessibility tree, not by grepping for `aria-label`.
- [ ] A save action is announced via a live region.
- [ ] VoiceOver walkthrough documented in the PR.
- [ ] `pnpm --filter @applo/web lint` exits clean — 0 errors, 0 warnings.

## Risks and landmines

- **Accessible names must be localised.** Every `aria-label` is user-facing
  copy and needs an entry in **all six** locale trees under
  [apps/web/messages/](../../apps/web/messages/) — de, en, fr, es, pt, it. The
  key trees must stay identical; a missing key in one locale is a runtime
  failure, not a fallback.
- The Applo mascot is correctly `aria-hidden`. Keep it that way — it's
  decorative, and announcing it adds noise.
- shadcn/ui primitives are built on Radix and mostly handle ARIA already. Don't
  add attributes that duplicate or fight what Radix emits; check the rendered
  output before adding anything to a `Dialog`, `Sheet`, or `Tooltip`.
- The profile page is 1845 lines. Resist refactoring it as part of this PR —
  a11y attributes and a restructure in one diff is unreviewable. If it needs
  splitting, that's a separate PR.

## Doc sync

Not an architecture change. If an accessibility statement
(Barrierefreiheitserklärung) turns out to be legally required, that's a
follow-up issue for the legal pages, not this PR.
