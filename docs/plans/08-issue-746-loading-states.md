# 08 — Page loading states

**Issue:** #746 · **Phase:** 3 · **Effort:** ~1 day · **Owner:** web
**Depends on:** [plan 07](./07-issue-571-motion-foundation.md) (#571)

---

## Goal

Replace empty or half-rendered screens during data fetch with loading states
that match the content shape, using the primitives built in plan 07.

## Verified current state

Data-dependent pages render without a dedicated loading treatment, so the user
sees an empty or partial screen until everything resolves. The app fetches
server state through TanStack Query via the typed `apiClient`, which already
exposes `isPending` / `isError` — the hooks are there, the UI treatment isn't.

## Scope

Apply plan 07's primitives to the data-heavy routes, in rough order of traffic:

1. `/dashboard`
2. `/applications` (list) and `/applications/[id]`
3. `/profile`
4. `/job-postings`
5. `/interviews`, `/validate`, `/analytics`

For each: a loading state, an error state with a retry affordance, and a
transition to loaded content that doesn't shift layout.

Prefer App Router `loading.tsx` where the route is a server component; use
TanStack Query's `isPending` where the fetch is client-side. Don't mix both on
one route — pick per route and note which and why.

## Out of scope

- Building new skeleton components — that's plan 07. If a shape is missing,
  add it to the shared set rather than defining one locally.
- Empty states (no data) — a different concern from loading; see
  [docs/features/EMPTY_STATES.md](../features/EMPTY_STATES.md), which suggests
  this already has a pattern.
- Mobile layout (#573).

## Steps

1. Branch `feat/web-loading-states`. **Do not start before plan 07 has merged** —
   starting early guarantees divergent components.
2. For each route, identify whether data is fetched server-side or via TanStack
   Query, and choose the matching mechanism.
3. Build the loading state to mirror the loaded layout's dimensions. A skeleton
   whose height differs from the real content trades a blank screen for a
   layout jump.
4. Add the error path. Every one needs a retry — TanStack Query's `refetch` is
   already available.
5. Measure CLS per route before and after.

## Acceptance criteria

- [ ] Every route listed above shows a loading state on a cold load with a
      throttled connection (Chrome DevTools "Slow 4G").
- [ ] CLS **≤ 0.1** on `/dashboard` and `/applications`, measured before and
      after the transition. Numbers in the PR body.
- [ ] Every listed route has a visible error state with a working retry.
      Verify by forcing a failure (offline mode or a blocked request), not by
      inspecting the code.
- [ ] No route introduces its own one-off spinner or skeleton — all use plan
      07's components. `grep` for locally-defined loading markup as a check.
- [ ] `pnpm --filter @applo/web lint` exits clean — 0 errors, 0 warnings.
- [ ] `pnpm --filter @applo/web cf:build` exits 0.

## Risks and landmines

- **Loading states must be localised.** Any visible string ("Wird geladen…",
  "Erneut versuchen") needs an entry in all six locale trees under
  [apps/web/messages/](../../apps/web/messages/), with identical key trees.
- **The generation flow is not a normal loading state.** `/applications/[id]`
  during generation is driven by SSE with persisted progress, handled in plan
  07. Don't replace it with a generic skeleton.
- Suspense boundaries around `useSearchParams` have bitten this repo before —
  a missing boundary broke the Cloudflare static prerender *after* the parent
  PR had merged. If you add or move a Suspense boundary, confirm
  `pnpm --filter @applo/web cf:build` passes, not just `next build`.
- Free-tier downloads deliberately wait 15 seconds. That is a product decision,
  not latency to hide — it needs an honest, explained loading state, not a
  disguise.

## Doc sync

Not an architecture change.
