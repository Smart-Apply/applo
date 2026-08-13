# Work Plans — non-delegated backlog

> **Created:** 13 Aug 2026. **Scope:** every open issue *except* the three
> delegated to the parallel Claude Code agent (#522, #533, #752 — all
> `apps/api`). This folder holds one plan per work item plus this ordering
> document.
>
> **Audit basis:** every "current state" claim in these plans was verified
> against the code on `main` at the time of writing, not read from the issue
> body. Where an issue's description disagrees with the code, the plan says so.

---

## How to use this folder

- **This file** decides *what order* things happen in and why.
- **Each `NN-*.md`** is a self-contained plan: goal, verified current state,
  scope, steps, acceptance criteria, and the repo landmines that apply.
- A plan is only "ready" when its acceptance criteria are mechanically
  checkable — a command that exits 0, a file that exists, an event that
  arrives in a dashboard. "Works correctly" is not an acceptance criterion.

Plans are written to be executable by someone (or something) with no prior
context on the discussion that produced them.

---

## Ordering

The ordering principle is **measurement before construction**. Four of the
first five items are cheap, and each one makes the work after it verifiable
rather than speculative. Building UX polish before you can see client-side
crashes or a signup funnel means you cannot tell whether any of it worked.

### Phase 0 — See what's happening (do first)

| # | Plan | Issue | Effort |
|---|---|---|---|
| 01 | [Finish + verify frontend error monitoring](./01-error-monitoring.md) | *none — file one* | ~3 h |
| 02 | [Product analytics](./02-product-analytics.md) | *none — file one* | ~1–3 h |

**Why first:** Sentry is half-wired today — the SDK initialises and the DSN is
live in both environments, but there are no source maps, no ad-blocker tunnel,
and the global error boundary never calls `captureException`. So errors arrive
minified and React render crashes are missed entirely. Analytics doesn't exist
at all, which means the `signup → first generation` funnel is invisible. Both
are small. Everything downstream is easier to judge once they're done.

### Phase 1 — Launch surface

| # | Plan | Issue | Effort |
|---|---|---|---|
| 03 | [SEO + social share assets](./03-seo-og.md) | *none — file one*, relates #332 | ~2 h |
| 04 | [Payments: decide in or out](./04-payments-decision.md) | *none — file one* | ~1 h or ~3 d |

**Why here:** These gate a public launch rather than the product itself. #03 is
two hours and currently costs you every social share. #04 is a decision, not an
implementation — make it explicitly, because the frontend already implies a
paid tier that has no checkout behind it.

### Phase 2 — Triage before building

| # | Plan | Issues | Effort |
|---|---|---|---|
| 05 | [Re-scope the profile-redesign batch](./05-issue-triage-758-765.md) | #758–#765 | ~2 h |

**Why before Phase 3:** Issues #758–#765 were written against the design
prototype in [docs/design/](../design/), not the shipped app. Verified: `.sa-edit`
and `--ink-400` exist only in the prototype; the shipped app self-hosts fonts via
`next/font/google`; the dashboard shell already has a drawer and bottom nav.
Working them as written means building against a spec that doesn't match reality.
#765 is the exception — it describes a real gap.

### Phase 3 — Product quality

| # | Plan | Issue | Depends on |
|---|---|---|---|
| 06 | [Accessibility: ARIA + focus](./06-issue-765-accessibility.md) | #765 | — |
| 07 | [Motion + loading foundation](./07-issue-571-motion-foundation.md) | #571 | — |
| 08 | [Page loading states](./08-issue-746-loading-states.md) | #746 | 07 |
| 09 | [Mobile design pass](./09-issue-573-mobile.md) | #573 | 05, 07 |

**Why this shape:** #746 and #573 both explicitly say they should build on
#571, so #571 lands first and defines the shared primitives. #765 is
independent — different concern, different files — and can run in parallel with
any of them.

### Deferred — planned, not scheduled

| # | Plan | Issue | Trigger to start |
|---|---|---|---|
| 10 | [LLM output quality review](./10-issue-572-llm-output-review.md) | #572 | After Phase 0, so quality changes are measurable |

Not yet planned, with rationale:

| Issue | Why deferred |
|---|---|
| #332 SSR for public pages | Overlaps plan 03; fold in only if 03 shows the landing page's CSR is actually hurting indexing |
| #570 Onboarding guide | Large, and its content depends on the UX that Phase 3 changes. Planning it now guarantees rework |
| #623 Eval platform | Separate repo, multi-week. Its enabler (headless generation entrypoint) is the real blocker; see [EVAL_PLATFORM_FABLE5_PROMPT.md](../implementation/EVAL_PLATFORM_FABLE5_PROMPT.md) |
| #133 Dark mode | Explicitly low-priority/post-MVP, and Phase 3 will move the design tokens it would depend on |
| #523 · #524 · #525 | All depend on #522, which is delegated and not merged yet |

---

## Issues that don't exist yet

Plans 01–04 have **no GitHub issue**. They came out of
[PUBLIC_LAUNCH_PLAN.md](../guides/PUBLIC_LAUNCH_PLAN.md), which is not the
tracker. File them before starting so the work is visible alongside everything
else, and link the issue number back into the plan's header.

That gap is itself worth noting: the four highest-priority items on the list
were invisible to anyone reading the issue tracker.

---

## Rules that apply to every plan here

These come from [.github/copilot-instructions.md](../../.github/copilot-instructions.md)
and are not restated in each plan:

- **Branch before the first edit.** Never commit on `main`.
- **Conventional Commits**, and the PR title must follow the same format
  (squash-merge makes it the commit message).
- One PR per concern.
- `package.json` and `pnpm-lock.yaml` change together, in the same PR.
- **0 ESLint errors *and* warnings** in anything authored here.
- `useWatch({ control, name })`, never `form.watch(...)` in a component body.
- Architecture changes require `README.md` + `ARCHITECTURE.md` updates in the
  same PR.
- German-first, profession-neutral user-facing copy. Any new UI string needs an
  entry in **all six** locale trees under [apps/web/messages/](../../apps/web/messages/).

### One constraint specific to this batch

`apps/web` deploys to **Cloudflare Workers**, and the frontend Sentry SDK was
originally removed to stay under the **3 MB free-tier script-size limit** (the
comment is still in [next.config.ts](../../apps/web/next.config.ts)). Several plans
here add client-side dependencies. Check the bundle size before merging any of
them — see plan 01 for the specific check.
