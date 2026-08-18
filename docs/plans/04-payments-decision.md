# 04 — Payments: decide in or out for v1

**Issue:** none yet — file one (`chore: decide payment strategy for public launch`)
**Phase:** 1 · **Effort:** ~1 h (option B) / ~3 d (option A) · **Owner:** dev + product

---

## RESOLVED — 2026-08-18: Option A (Stripe), shipped in test mode

Decision taken by the owner after a fee/merchant-of-record comparison. Summary
of the reasoning, because the landscape moved since this plan was written:

- **Stripe now sells its own Merchant-of-Record product** ("Managed Payments",
  3.5 % on top of payment fees, indirect-tax compliance in 75+ countries), and
  **Lemon Squeezy is being folded into it**. So the MoR escape hatch no longer
  requires a different vendor — it is a config change on the same integration.
- **Paddle was rejected on price shape, not price level.** Its 5 % + $0.50 is
  fine at €19.95 and punitive at €2.99, and its own pricing page routes
  sub-$10 products to custom pricing. Two of the three add-on packs are below
  that line.
- Fees on the actual price points (EEA standard card, gross prices): Stripe DIY
  keeps €7.84 of a €9.95 Pro subscription vs €7.61 on Stripe MoR and €7.40 on
  Paddle; on the €2.99 pack it is €2.20 / €2.11 / €1.90.
- Since Stripe standard → Stripe Managed Payments is not a migration, the VAT
  question does **not** have to be answered before taking the first payment.

**Shipped:** `apps/api/src/payments/` (Checkout, Customer Portal, webhook,
§ 312k cancellation), `apps/web/src/app/pricing/`,
`apps/web/src/app/kuendigung/`, `StripeEvent` idempotency model. Billing stays
behind `PAYMENTS_ENABLED=false` with test keys until the business registration
and Stripe activation are done.

**Still open (not code):** Gewerbeanmeldung + Steuernummer, Stripe account
activation, creating the tax-inclusive prices in the Stripe dashboard, and a
lawyer's read of the § 312k flow (specifically whether the cancellation page
may require login).

The original decision write-up follows for context.

---

## Goal

Resolve the gap between a product that enforces paid tiers and a product that
cannot take payment. This is a **decision**, not an implementation — the output
is a choice plus whatever small change makes the app honest about it.

## Verified current state

The backend fully enforces tiers. The frontend fully advertises them. Nothing
connects them to money.

| Piece | State |
|---|---|
| Tier enforcement (`@RequiresFeature`, `UsageLimitGuard`, `SubscriptionService`) | ✅ complete |
| `GET /subscription/tiers` returning the priced contract (Pro €9.95, Premium €19.95, add-on packs) | ✅ complete |
| Manual upgrade path `POST /admin/users/:email/tier` | ✅ complete |
| [FeatureGate](../../apps/web/src/components/subscription/feature-gate.tsx) + [UpgradePrompt](../../apps/web/src/components/subscription/upgrade-prompt.tsx) throughout the app | ✅ complete |
| `stripe` package | ❌ not a dependency |
| Checkout endpoint / webhook handler | ❌ do not exist |
| Pricing page | ❌ no `/pricing` route |

The upgrade CTA routes to **`/#preise`** — an anchor on the landing page. So a
user who hits a Premium gate is sent to a marketing section, with no way to
actually buy. Every paywall in the product is currently a dead end.

## The decision

### Option A — launch with Stripe
Install `stripe`, add a `payments` module with `POST /payments/checkout-session`
and `POST /payments/webhook` (signature-verified, timing-safe) that flips
`subscriptionTier`, plus a real pricing/checkout page.
**Cost:** ~3 days. **Benefit:** revenue from day one.

### Option B — launch free-tier only, manual upgrades *(recommended)*
Keep `/admin/users/:email/tier` as the upgrade mechanism. Make every paid
surface honest: either route the CTA somewhere that explains how to upgrade
(contact form), or present the tier as "coming soon" rather than as a purchase.
**Cost:** ~1 hour. **Benefit:** validate demand before building billing.

**Recommendation: B.** Three days of billing work is a poor bet before the
funnel from [plan 02](./02-product-analytics.md) shows whether anyone reaches a
paywall. Payment integration is also easier to justify and scope once you know
which gate people actually hit.

## Scope (option B)

1. Audit every upgrade CTA and decide, per surface, whether it should:
   - point at the contact form with a pre-filled subject, or
   - render as "in Vorbereitung" with no click target.
2. Fix the `/#preise` anchor — confirm that section exists on the landing page
   and actually describes the tiers. If it doesn't, the CTA is broken twice.
3. Document the manual upgrade flow on the FAQ page, in German.
4. Note the decision and its revisit trigger in
   [PUBLIC_LAUNCH_PLAN.md](../guides/PUBLIC_LAUNCH_PLAN.md).

## Acceptance criteria

- [ ] The decision is recorded in `PUBLIC_LAUNCH_PLAN.md` with a dated rationale.
- [ ] Every `UpgradePrompt` / `FeatureGate` destination leads somewhere that
      tells the user what to do next. Enumerate them in the PR body — a list of
      surfaces checked, not a claim that they were.
- [ ] Clicking upgrade from a Premium-gated page (Interview Coach, Email
      Tracking, Analytics) reaches an actionable destination. Test all three.
- [ ] The FAQ explains how to upgrade.
- [ ] No UI copy states or implies a price that cannot be paid.
- [ ] `pnpm --filter @applo/web lint` exits clean — 0 errors, 0 warnings.

## Risks and landmines

- **`GET /subscription/tiers` is public and returns real prices** (€9.95 /
  €19.95, add-on packs at €2.99/€6.99/€14.99). Advertising a price you cannot
  charge is a consumer-protection question in Germany, not just a UX one. If
  option B is chosen, make sure the UI frames these as planned pricing rather
  than an offer. Worth a look at the AGB text too.
- If option A is ever chosen: the webhook endpoint must be added to the CSRF
  skip-list, and its signature verification must be timing-safe with a
  timestamp check — the same pattern the Microsoft Graph webhook already uses.
- Do **not** put a Stripe secret key anywhere near `apps/web`. Checkout session
  creation belongs in `apps/api`, with only the public key on the client.

## Doc sync

If option A is taken, the new `payments` module is an architecture change:
`README.md`, `ARCHITECTURE.md`, and the backend-modules + env sections of
[.github/copilot-instructions.md](../../.github/copilot-instructions.md).
Option B needs only the launch-plan entry and the FAQ.
