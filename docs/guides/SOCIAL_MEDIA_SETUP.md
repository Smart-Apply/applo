# 📣 Social Media & `social@applo.ai` Setup

> **Status (Aug 2026):** Planning runbook — no accounts exist yet. This is a
> process guide, not a record of completed work. Update the status line
> once accounts are live and fill in [`apps/web/src/lib/social-links.ts`](../../apps/web/src/lib/social-links.ts).

Account creation itself (phone verification, CAPTCHA, ToS acceptance) has to
be done by a human owner — it can't be automated. This doc gives the exact
steps, DNS records, and drafted copy so that part takes minutes, not hours.

## 1. `social@applo.ai` mailbox

### Current DNS state (verified 2026-08-03)

`applo.ai` is on Cloudflare DNS (see [DOMAIN_CLOUDFLARE_SETUP.md](./DOMAIN_CLOUDFLARE_SETUP.md)). Checked live via `dig`:

| Record                          | Value                                          |
| -------------------------------- | ----------------------------------------------- |
| `applo.ai` MX                    | **none** — domain can't receive mail today      |
| `applo.ai` TXT                   | **none** — apex has no SPF record               |
| `send.applo.ai` MX/TXT           | Resend's isolated sending subdomain (`feedback-smtp.eu-west-1.amazonses.com`, `v=spf1 include:amazonses.com ~all`) |
| `resend._domainkey.applo.ai` TXT | Resend's DKIM public key                        |

**Why this matters:** Resend deliberately keeps all its sending records under
the `send.` subdomain, so the apex (`applo.ai`) is a clean slate. Adding a
mailbox provider's MX + SPF at the apex **cannot conflict** with Resend — no
record-merging needed. (If this ever changes, remember only one SPF TXT
record is allowed per name — merge `include:` mechanisms into one string,
never add two `v=spf1` TXT records on the same name.)

### Provider: use a European mailbox host, not Cloudflare Email Routing

Cloudflare Email Routing (free forwarding) was the obvious first idea, but
it's a US company and only forwards — it doesn't give you an EU-hosted inbox
you can log into. Since Applo already markets "EU-Hosting · DSGVO" on the
landing page itself, match that with the mailbox too:

| Provider                                              | HQ / hosting          | Custom domain plan   | Notes                                                                 |
| ------------------------------------------------------ | --------------------- | -------------------- | ---------------------------------------------------------------------- |
| **[mailbox.org](https://mailbox.org/en/business) (recommended)** | Berlin, DE            | "Standard" **€4/mo**  | ISO 27001 + BSI C5 certified, ad-free, no annual contract, up to 50 aliases on the custom domain. Verified pricing 2026-08-03. |
| Proton Mail for Business                              | Geneva, CH             | paid tier             | Well-known brand, end-to-end encryption. Couldn't verify current pricing page at review time — check protonmail.com/business before committing. |
| Infomaniak (kSuite)                                    | Geneva, CH             | paid tier             | Full workspace suite (mail+drive+meet), popular EU alternative to Google Workspace. |

**Recommendation: mailbox.org "Standard" (€4/month).** It's the cheapest
plan that supports custom domains, is fully GDPR/German-law hosted, and a
single alias is all `social@applo.ai` needs — no per-seat team migration
required.

### Setup steps

1. Sign up at mailbox.org (or your chosen provider) and add `applo.ai` as a
   custom domain in their admin panel.
2. The provider's dashboard will show the exact records to add (MX, SPF TXT,
   DKIM TXT, and possibly an autoconfig CNAME). Copy them.
3. In Cloudflare → DNS → Records for the `applo.ai` zone, add each record
   **as given** (Cloudflare's proxy toggle doesn't apply to MX/TXT records —
   they're always DNS-only, so there's no "orange cloud" gotcha like the
   `api.applo.ai` CNAME has).
4. Wait for propagation (usually minutes on Cloudflare), then verify:
   ```bash
   dig +short MX applo.ai
   dig +short TXT applo.ai
   ```
5. Create the `social@applo.ai` mailbox/alias in the provider's admin panel.
6. Use `social@applo.ai` as the recovery/contact email for every social
   account below — keeps ownership centralized instead of tied to one
   person's personal inbox.

## 2. Platform accounts

### Handle availability — checked 2026-08-03

The plain `applo` handle is **already contested** on 2 of the 4 platforms:

| Platform  | `applo` status                                                                 |
| --------- | ------------------------------------------------------------------------------ |
| TikTok    | ❌ Taken — `@applo` exists (private, 242 following / 7 followers, no bio; looks dormant/unrelated, not ours) |
| LinkedIn  | ❌ Taken — `/company/applo` belongs to an unrelated existing business ("Applo Multimedia Group") |
| Instagram | ⚠️ Inconclusive — Instagram blocks unauthenticated checks; verify manually before signing up |
| X         | ⚠️ Inconclusive — X blocks unauthenticated checks; verify manually before signing up |

**Recommendation:** don't fight for `applo` — pick one consistent alternate
handle and confirm it's free on **all four** platforms before creating any
account, so the brand stays identical everywhere. Good candidates (in
preference order): `getapplo`, `applohq`, `useapplo`.

### Draft bios (German-first, adjust once a handle is picked)

**X (Twitter)** — 160 char limit:
> Bewerbungen aus deinem echten Profil: ehrlich, ATS-optimiert, DSGVO-konform. Kostenlos starten → applo.ai

**LinkedIn Company Page:**
- Tagline: "Bewerbungen aus deinem echten Profil – ehrlich, ATS-optimiert, in der EU gehostet."
- About: "Applo hilft dir, aus deinem echten Profil maßgeschneiderte Bewerbungen zu erstellen – ATS-optimiert, ohne erfundene Angaben, vollständig in der EU gehostet (DSGVO-konform). Für alle Branchen, von Pflege bis Projektmanagement."

**Instagram:**
> 📝 Bewerbungen aus deinem echten Profil
> ✅ ATS-optimiert · 🇪🇺 EU-Hosting
> 👇 Kostenlos starten

**TikTok:** same as Instagram, shortened to fit.

### Account creation checklist (per platform, do this yourself)

1. Sign up with `social@applo.ai` as the account/recovery email.
2. Generate a unique password with your password manager — never reuse
   passwords across platforms, never store credentials in the repo, `.env`,
   or any doc.
3. Enable 2FA (authenticator app over SMS where the platform allows it).
4. Switch to the platform's business/creator mode (X Pro, Instagram
   Business, TikTok Business Suite, LinkedIn Company Page) — unlocks
   analytics and multi-admin access instead of one shared personal login.
5. If more than one teammate needs access, add them as a page/business
   admin natively rather than sharing the single login.
6. Set the bio + profile photo (use `apps/web/public/Logo/` assets) + link
   to `https://applo.ai`.

## 3. Activating the links in code

Once an account exists, fill in its URL in
[`apps/web/src/lib/social-links.ts`](../../apps/web/src/lib/social-links.ts):

```ts
export const SOCIAL_LINKS = {
  x: 'https://x.com/<handle>',
  linkedin: 'https://www.linkedin.com/company/<slug>',
  instagram: 'https://www.instagram.com/<handle>',
  tiktok: 'https://www.tiktok.com/@<handle>',
};

export const X_HANDLE = '<handle>'; // without the @
```

Empty strings hide that icon in the landing page footer and omit the
`twitter:site` meta tag, so partial rollout (e.g. X and LinkedIn live before
Instagram/TikTok) works with no extra code changes.
