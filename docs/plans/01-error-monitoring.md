# 01 — Finish and verify frontend error monitoring

**Issue:** none yet — file one (`fix(web): complete the frontend Sentry integration`)
**Phase:** 0 · **Effort:** ~3 h · **Owner:** web

---

## Goal

Make client-side errors *actionable*. Today they are captured but arrive
minified, incomplete, and partially blocked.

## Verified current state

This is **not** a greenfield "add Sentry" task. The integration is half-restored
and internally contradictory. Verified on `main`:

| Piece | State |
|---|---|
| `@sentry/nextjs` ^10.69.0 in [apps/web/package.json](../../apps/web/package.json) | ✅ present |
| [apps/web/src/instrumentation-client.ts](../../apps/web/src/instrumentation-client.ts) | ✅ initialises Sentry, 10 % traces, replay off, `sendDefaultPii: false` |
| `SENTRY_DSN_WEB` repo variable + both env scopes | ✅ set (`o4511288476958720.ingest.de.sentry.io`) |
| `NEXT_PUBLIC_SENTRY_DSN` / `_RELEASE` injected at build | ✅ in [deploy-prod.yml](../../.github/workflows/deploy-prod.yml) and [deploy-staging.yml](../../.github/workflows/deploy-staging.yml) |
| `withSentryConfig` in [next.config.ts](../../apps/web/next.config.ts) | ❌ **absent** — no source-map upload, no tunnel |
| `captureException` in [global-error.tsx](../../apps/web/src/app/global-error.tsx) | ❌ **absent** — comment says to restore it; never was |
| `captureException` in [error.tsx](../../apps/web/src/app/error.tsx) | ❌ absent |
| Comments in `next.config.ts` / `global-error.tsx` | ❌ stale — both claim Sentry "was removed from the frontend" |

**Consequence:** errors do reach Sentry, but stack traces point at minified
bundle offsets, events are dropped for anyone running an ad blocker, and the
React render crashes most worth catching — the ones the global error boundary
handles — are never reported at all.

## Scope

1. Add `withSentryConfig` to `next.config.ts` for source-map upload, with
   `tunnelRoute` so events bypass ad blockers.
2. Restore `Sentry.captureException(error)` in `global-error.tsx` (inside a
   `useEffect`) and add it to `error.tsx`.
3. Delete the stale "Sentry was removed" comments in both files — they actively
   mislead the next reader.
4. Verify a deliberately thrown error arrives in Sentry **with a readable stack
   trace**, within 30 s, from staging.

## Out of scope

- Session replay. Deliberately off: users' résumés and cover-letter drafts are
  in the DOM. Revisit only with a considered privacy posture.
- `sendDefaultPii`. Stays `false`.
- Backend Sentry — already working via `@sentry/node` in `apps/api`.

## Steps

1. Branch `fix/web-sentry-completion`.
2. Wrap the config export in `withSentryConfig` with `silent: true`,
   `widenClientFileUpload: true`, and `tunnelRoute: '/monitoring'`. Source-map
   upload needs a `SENTRY_AUTH_TOKEN` **secret** (not a variable — it's
   write-scoped); add it to the repo and reference it in both deploy workflows
   alongside the existing `NEXT_PUBLIC_SENTRY_*` env block.
3. Restore the capture calls in both error boundaries.
4. Remove the stale comments.
5. **Check the bundle-size constraint** (see Risks): run `pnpm --filter @applo/web cf:build`
   and record the reported Worker script size.
6. Ship to staging, trigger a test error, confirm in Sentry.

## Acceptance criteria

- [ ] `pnpm --filter @applo/web cf:build` exits 0 and the emitted Worker script is
      **under 3 MB compressed**; the measured size is written into the PR body.
- [ ] `pnpm --filter @applo/web lint` exits clean — 0 errors, 0 warnings.
- [ ] A thrown error from a staging page appears in Sentry within 30 s.
- [ ] That event's stack trace names **`.tsx` source files and line numbers**,
      not minified chunk offsets. This is the criterion that proves source-map
      upload actually worked — a captured-but-minified event is the current
      state and would otherwise look like success.
- [ ] An error thrown during render (not in an event handler) is reported —
      proves the `global-error.tsx` path.
- [ ] No occurrence of "Sentry was removed" remains in `apps/web`.

## Risks and landmines

- **The 3 MB Workers script limit is why Sentry was removed in the first
  place.** The comment is still in `next.config.ts`. Someone re-added the SDK
  without addressing that constraint, so it is currently untested against it.
  `withSentryConfig` adds more client code. If the build breaches the limit,
  the fallback is to keep the tunnel and error-boundary capture (both cheap)
  and drop `widenClientFileUpload`. Do not silently ship a build that only
  passes because Cloudflare hasn't rejected it yet.
- `tunnelRoute` creates a same-origin API route. Confirm it doesn't collide
  with the existing `apps/web/src/app/api` routes, and that the CSP in
  [next.config.ts](../../apps/web/next.config.ts) allows it.
- The DSN is `NEXT_PUBLIC_*` and therefore **baked into the client bundle at
  build time** — it is public by design, which is fine, but it also means a
  changed DSN needs a rebuild, not just a variable update.

## Doc sync

Adding a third-party monitoring integration is an architecture change:
update `README.md` and `ARCHITECTURE.md`, and correct the "Monitoring" line in
[.github/copilot-instructions.md](../../.github/copilot-instructions.md), which
currently lists Sentry only for the backend.
