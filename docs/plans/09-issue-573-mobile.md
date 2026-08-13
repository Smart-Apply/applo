# 09 — Mobile design pass

**Issue:** #573 · **Phase:** 3 · **Effort:** ~3 days · **Owner:** web
**Depends on:** [plan 05](./05-issue-triage-758-765.md) (triage), [plan 07](./07-issue-571-motion-foundation.md) (#571)

---

## Goal

Make the core job — build a profile, add a posting, generate an application —
fully doable on a phone, and make it feel deliberate rather than like a shrunk
desktop layout.

## Verified current state

Better than issue #758 claims, and unmeasured overall.

- The dashboard shell **already has** a mobile path: [layout.tsx](../../apps/web/src/app/%28dashboard%29/layout.tsx)
  imports `Sheet`, `MobileBottomNav`, and a `Menu` icon.
- What's unverified is everything else — forms, the PDF preview/editor, the
  wizard, iOS Safari behaviour. No measurements exist.

**Start by measuring, not by fixing.** #573's task list was written from an
impression ("wirkt wie ein verkleinertes Desktop-UI"), and the one concrete
structural claim in the related #758 turned out to be false. Establish which
screens are actually broken before committing three days.

## Scope

### Phase A — audit (~half a day, do first)

Walk the core flow at 375 / 390 / 414 px on a real iOS device and a real
Android device:

1. Register → verify → onboarding
2. Profile: add experience, skill, education
3. Add a job posting (text, URL, file)
4. Generate → watch progress → preview PDF → download
5. Settings, including 2FA enrolment

Record, per screen: horizontal overflow, tap targets under 44 px, input zoom on
focus, safe-area clipping, unreachable controls. **The audit output is the real
scope of Phase B** — this plan deliberately does not pre-commit to a fix list.

### Phase B — fix what the audit found

Likely candidates, to be confirmed:

- PDF preview/editor on small screens — the most probable genuine failure,
  since it's a desktop-shaped surface with `react-pdf` and a Tiptap editor.
- The application wizard's multi-step layout.
- Long forms with inline validation.
- iOS specifics: `100vh` under the dynamic toolbar, input zoom below 16 px
  font-size, safe-area insets.

## Out of scope

- A native app. This is responsive web on Cloudflare Workers.
- PWA install polish — separate, optional.
- Redesign. This is a fit-and-function pass, not a visual overhaul.

## Steps

1. Do Phase A and write the findings into the issue **before** branching. If
   the audit shows the app is largely fine, this drops from P1 and the
   remaining three days go to Phase 0/1 work instead.
2. Branch `fix/web-mobile-pass`.
3. Fix in audit-severity order: broken-and-unusable, then awkward, then polish.
4. Use plan 07's primitives for anything involving motion or loading.
5. Re-run the full flow on both devices.

## Acceptance criteria

- [ ] Audit findings recorded in #573, per screen, with device and viewport.
- [ ] No horizontal scroll at 360 / 375 / 390 / 414 px on any route in the core
      flow.
- [ ] No input zoom on focus in iOS Safari — all inputs ≥ 16 px font-size.
- [ ] Safe-area insets respected; nothing clipped by notch or home indicator.
- [ ] All interactive targets ≥ 44×44 px in the core flow.
- [ ] The complete flow — register through PDF download — is achievable on a
      real iPhone and a real Android device. Not an emulator; the failures that
      matter here (toolbar height, input zoom, safe area) are the ones
      emulators get wrong.
- [ ] `pnpm --filter @applo/web lint` exits clean — 0 errors, 0 warnings.
- [ ] `pnpm --filter @applo/web cf:build` exits 0.

## Risks and landmines

- **The PDF preview is the highest-risk surface, for a non-obvious reason.**
  [pdf-preview-modal.tsx](../../apps/web/src/components/pdf/pdf-preview-modal.tsx)
  takes the pdf.js *API* from `react-pdf` but loads the *worker* from
  `apps/web`'s own `pdfjs-dist`. pdf.js refuses to run when those versions
  differ, and the failure is a generic "PDF konnte nicht geladen werden" with
  no source-code footprint. This has taken down production twice. If you touch
  anything near it, run `pnpm --filter @applo/web run check:pdfjs`, and never
  bump `pdfjs-dist` independently of `react-pdf`.
- Overlap with #758 must be resolved in plan 05 first, or the same layout work
  gets done twice under two issue numbers.
- Viewport-unit fixes for iOS (`100vh` → `100dvh`) can regress desktop. Test
  both.
- Any new UI string needs all six locale trees.

## Doc sync

Not an architecture change.
