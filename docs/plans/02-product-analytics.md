# 02 — Product analytics

**Issue:** none yet — file one (`feat(web): add product analytics for the signup funnel`)
**Phase:** 0 · **Effort:** ~1 h (Plausible) / ~3 h (PostHog) · **Owner:** web

---

## Goal

Be able to answer: *of the people who sign up, how many save a profile, and how
many get a finished application?* Right now that is unanswerable.

## Verified current state

No analytics of any kind in `apps/web`. Verified: no `plausible`, `posthog`,
`umami`, or `gtag` in [apps/web/package.json](../../apps/web/package.json) or
anywhere under `apps/web/src`.

The consequence is specific, not abstract. The generation pipeline is the
product, and it has a long funnel — register → verify email → build profile →
add a job posting → generate → download. A drop-off anywhere in that chain is
currently invisible. So is the effect of every UX change planned in Phase 3.

## Decision: which tool

| | Plausible | PostHog |
|---|---|---|
| Bundle cost | ~1 KB | ~50 KB+ |
| Cookie banner needed | No | Yes (already have one) |
| Funnels | Basic | Full |
| Session replay | No | Yes |
| EU hosting | Yes | Yes (EU cloud) |

**Recommendation: Plausible.** The Cloudflare Workers 3 MB script limit is a
live constraint here (see [plan 01](./01-error-monitoring.md)), the app is
GDPR-sensitive by nature — users upload résumés — and the four events below are
all that's needed to answer the funnel question. PostHog's replay would
duplicate the privacy problem already declined for Sentry.

Revisit PostHog only if funnel analysis proves insufficient.

## Scope

Four custom events, fired from existing code paths:

| Event | Fired when |
|---|---|
| `signup_completed` | registration succeeds |
| `profile_first_save` | first successful `PUT /profile` for a user |
| `application_created` | `POST /applications` returns |
| `application_ready` | SSE stream reports status `READY` |

Plus default pageview tracking on public pages.

## Out of scope

- Any event carrying user content, résumé text, job-posting text, or email.
- Per-user identification. Aggregate funnel only.
- Backend-side analytics — LLM token/cost tracking is issue #522, delegated.

## Steps

1. Branch `feat/web-product-analytics`.
2. Add the Plausible script to the root layout, gated on a
   `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` env var so local dev and contributors without
   the var are a no-op — same pattern the Sentry DSN already uses.
3. Add a thin `trackEvent(name)` helper in `apps/web/src/lib/`. Do **not**
   scatter raw `window.plausible` calls through components.
4. Wire the four events at their existing call sites. `application_ready`
   belongs in the SSE handler — note the existing `eslint-disable` there about
   depending on `application?.status` rather than the whole object; do not
   "fix" it, it is behaviour-correct.
5. Add `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` to both deploy workflows' build env, next
   to the existing `NEXT_PUBLIC_SENTRY_DSN` line.
6. Update `apps/web/.env.example`.

## Acceptance criteria

- [ ] `pnpm --filter @applo/web lint` exits clean — 0 errors, 0 warnings.
- [ ] `pnpm --filter @applo/web cf:build` exits 0; Worker script still under
      3 MB, size recorded in the PR body.
- [ ] With the env var **unset**, no network request to any analytics host is
      made. Verify in the browser network tab, not by reading the code.
- [ ] On staging, all four events appear in the Plausible dashboard after one
      manual end-to-end run (register → profile → job posting → generate).
- [ ] No event payload contains an email address, user id, résumé text, or job
      posting text.
- [ ] Cookie/consent posture confirmed: Plausible is cookieless, so the
      existing banner needs no new category — state this explicitly in the PR
      rather than assuming it.

## Risks and landmines

- **Privacy is not optional here.** The product handles CVs. An analytics event
  that includes a job title or company name is personal data. Keep event names
  static strings with no dynamic properties for this first pass.
- `application_ready` fires from an SSE handler that can reconnect. Guard
  against double-firing on stream re-establish, or the funnel over-counts.
- `profile_first_save` needs a "first" signal. The cheapest correct source is
  the backend (`Profile.updatedAt == createdAt`); firing on every save and
  de-duplicating in the dashboard is *not* equivalent and will inflate the
  number. Decide this explicitly during implementation.

## Doc sync

Adding a third-party service is an architecture change: update `README.md`,
`ARCHITECTURE.md`, and the env-variable section of
[.github/copilot-instructions.md](../../.github/copilot-instructions.md).
Also add the new variable to the Datenschutz page if the legal review
determines a cookieless analytics tool requires disclosure — check, don't assume.
