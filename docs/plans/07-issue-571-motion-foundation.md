# 07 — Motion and loading foundation

**Issue:** #571 · **Phase:** 3 · **Effort:** ~2 days · **Owner:** web
**Blocks:** [plan 08](./08-issue-746-loading-states.md) (#746), [plan 09](./09-issue-573-mobile.md) (#573)

---

## Goal

Establish the shared motion and loading primitives that #746 and #573 both
depend on. This plan builds the vocabulary; the others apply it.

## Why this goes first

Both #746 and #573 explicitly state they should be consistent with #571. If
they land first, each invents its own spinner and its own transition, and #571
becomes a cleanup task instead of a foundation. One shared set of components,
built once.

## Verified current state

- Ad-hoc loading treatment; no shared skeleton or spinner component.
- The generation pipeline — the longest wait in the product — is driven by SSE
  (`PENDING → GENERATING → READY`) with persisted progress on
  `Application.generationProgress` / `generationMessage`.
- Design assets already exist and are unused: [docs/design/](../design/)
  contains `applo-motion-state-machine.html`,
  `smartapply-maskottchen-animationen.html`, and the mascot rigs.
- There is a `demo-loading` route under `(dashboard)`, worth reading before
  building anything new.

## Scope

1. **A shared loading vocabulary** in `apps/web/src/components/ui/`:
   - `Skeleton` variants matching the real content shapes — list row, card,
     form field. Skeletons that don't match the content they replace cause
     layout shift, which is the thing they exist to prevent.
   - One spinner, for genuinely indeterminate short waits only.
2. **Route transitions** that don't cause layout shift.
3. **Generation progress**, bound to the existing SSE status and the persisted
   progress fields — the one place a richer animation genuinely earns its cost,
   because the wait is long and real.
4. **`prefers-reduced-motion`** honoured throughout, as a first-class path and
   not an afterthought.
5. Optional: wire the existing mascot animations for the generation wait.

## Out of scope

- Page-level loading states (#746 — [plan 08](./08-issue-746-loading-states.md)).
- Mobile-specific layout (#573).
- A new animation library. Try CSS and existing primitives first; a framework
  is a bundle-size decision, see Risks.

## Steps

1. Branch `feat/web-motion-foundation`.
2. Read `docs/design/applo-motion-state-machine.html` and the existing
   `demo-loading` route before writing anything.
3. Build the skeleton variants against the three or four real content shapes
   that repeat most — applications list, dashboard cards, profile sections.
4. Bind generation progress to SSE. Do **not** re-derive progress client-side;
   the backend already persists it precisely so it survives across machines.
5. Add the `prefers-reduced-motion` path and test it with the OS setting on.
6. Document the primitives so #746 and #573 can consume them without guessing.

## Acceptance criteria

- [ ] Skeleton and spinner components exist in `components/ui/`, are used in at
      least two places, and are documented with a usage note.
- [ ] Cumulative Layout Shift measured on the applications list and dashboard
      is **≤ 0.1** before and after the loading state resolves. Measure with
      Lighthouse or the Chrome performance trace; put the numbers in the PR.
- [ ] With `prefers-reduced-motion: reduce` set at the OS level, no non-essential
      animation plays. Verify in the browser, not by reading the CSS.
- [ ] Generation progress reflects real SSE status, including a mid-generation
      page reload — this is what proves it reads the persisted progress rather
      than local state.
- [ ] `pnpm --filter @applo/web cf:build` exits 0; Worker script under 3 MB,
      size in the PR body.
- [ ] `pnpm --filter @applo/web lint` exits clean — 0 errors, 0 warnings.

## Risks and landmines

- **Bundle size.** `framer-motion` is ~30 KB gzipped and the Workers script
  limit is 3 MB with Sentry now also in the bundle. If an animation library is
  genuinely needed, measure before and after and justify it in the PR. CSS
  transitions cost nothing.
- **The React Compiler is on.** Never call `form.watch(...)` in a component
  body — use `useWatch({ control, name })`. Bare `watch()` returns an unstable
  ref and silently disables memoisation for the entire component.
- **Don't touch the SSE effect's dependency array.** There is a deliberate
  `eslint-disable` there depending on `application?.status` rather than the
  whole object, to avoid stream thrash. It is behaviour-correct.
- **Editing `globals.css` during a running dev session is unreliable.** Next 16
  enables `turbopackFileSystemCacheForDev` by default and can serve a stale
  compiled CSS chunk, so new class selectors appear not to apply. A dev-server
  restart is not enough: stop it, `rm -rf apps/web/.next`, restart. This recurs
  on *every* edit that adds new selectors, not just the first.
- Minimum display duration for loading states prevents flicker on fast loads,
  but adds latency on every fast load. If used, keep it under ~200 ms.

## Doc sync

Not an architecture change unless a new animation dependency is added — in
which case update the Tech Stack section of
[.github/copilot-instructions.md](../../.github/copilot-instructions.md).
