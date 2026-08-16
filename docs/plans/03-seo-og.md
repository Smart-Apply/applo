# 03 — SEO and social-share assets

**Issue:** none yet — file one (`feat(web): add sitemap, robots, and Open Graph assets`)
**Phase:** 1 · **Effort:** ~2 h · **Owner:** web · **Relates:** #332

---

## Goal

Make a shared link render a preview card, and let search engines index the
public pages while staying out of the authenticated app.

## Verified current state

All three are missing. Verified on `main`:

- No `apps/web/src/app/sitemap.ts`
- No `apps/web/src/app/robots.ts`
- No `apps/web/public/og-*` image
- `metadata.openGraph` is set only on the legal pages, not the root layout

Every link posted to LinkedIn, WhatsApp, Reddit, or Slack currently renders as
a bare URL. For a product whose growth channel is word of mouth among job
seekers, that is a direct, measurable cost on click-through.

## Scope

1. `apps/web/src/app/sitemap.ts` listing the public routes only:
   `/`, `/login`, `/register`, `/impressum`, `/datenschutz`, `/agb`, `/faq`.
2. `apps/web/src/app/robots.ts` allowing those and disallowing the
   authenticated surface — `/dashboard/*`, `/profile/*`, `/applications/*`,
   `/settings/*`, `/interviews/*`, `/analytics/*`, `/validate/*`,
   `/job-postings/*`, `/onboarding/*`.
3. One 1200×630 PNG at `apps/web/public/og-default.png`, under 300 KB.
4. `metadata.openGraph` + `metadata.twitter` in the root layout, with
   `metadataBase` set so relative image URLs resolve.

## Out of scope

- Converting the landing page to a server component (#332). Related but
  separate; see Notes.
- Per-page OG images. One default is enough until there's evidence otherwise.
- Structured data / JSON-LD.

## Steps

1. Branch `feat/web-seo-og`.
2. Enumerate the actual public routes from
   [apps/web/src/app/](../../apps/web/src/app/) rather than trusting the list
   above — the route groups are `(auth)`, `(dashboard)`, `(legal)`. Anything
   under `(dashboard)` is authenticated and must be disallowed.
3. Set `metadataBase` from an env var so staging doesn't advertise prod URLs.
4. Generate the OG image. German-first copy, profession-neutral — no IT-centric
   imagery. It represents a product used by nurses and CNC operators as much as
   developers.
5. Verify against staging with <https://www.opengraph.xyz/>.

## Acceptance criteria

- [ ] `pnpm --filter @applo/web lint` exits clean — 0 errors, 0 warnings.
- [ ] `pnpm --filter @applo/web cf:build` exits 0.
- [ ] `curl -s https://<staging>/sitemap.xml` returns valid XML containing every
      public route and **no** authenticated route.
- [ ] `curl -s https://<staging>/robots.txt` disallows every `(dashboard)` route.
- [ ] opengraph.xyz renders a card with title, description, and image for the
      staging URL.
- [ ] `og-default.png` is exactly 1200×630 and under 300 KB (`identify` / `ls -l`).
- [ ] `metadataBase` resolves to the staging host on staging, not `applo.ai`.

## Risks and landmines

- **The staging Worker must not be indexed.** It is a `*.workers.dev` URL
  serving a full copy of the product. If `robots.ts` returns the same allow
  list on staging as prod, Google can index staging and split ranking. Gate on
  the environment and return a blanket `Disallow: /` for staging.
- `metadataBase` defaulting to prod on a staging build produces OG cards that
  point at the wrong host — the same class of bug as the `PUBLIC_API_URL` trap
  already documented in
  [.github/copilot-instructions.md](../../.github/copilot-instructions.md).
- Route groups `(auth)` / `(dashboard)` / `(legal)` do **not** appear in URLs.
  Don't write `/(legal)/faq` into the sitemap; the real path is `/faq`.

## Notes on #332

**Status:** #332 shipped separately (landing page converted to Server
Components, with page-level metadata and JSON-LD). This plan's scope is
untouched by it: `sitemap.ts`, `robots.ts`, and `og-default.png` still don't
exist, and the landing page still points OG/Twitter at `/Logo/Full Logo.png`
rather than a purpose-built 1200×630 card.

#332 proposes converting the landing page from CSR to SSR for SEO. Do this plan
first and measure: if Google Search Console shows the landing page indexed with
its real content, the CSR is not actually blocking indexing and #332 becomes a
performance task rather than an SEO one — which changes both its priority and
its acceptance criteria. Don't do them together; you'd learn nothing about
which one worked.

## Doc sync

Not an architecture change, so `ARCHITECTURE.md` is unaffected. Do add the new
`metadataBase` env variable to `apps/web/.env.example` and to both deploy
workflows.
