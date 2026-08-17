# Programmatic SEO

162 indexable pages generated from a hand-written, per-locale content set:
12 professions × 2 page families × 6 locales, plus 12 family hubs and 6 guide
hubs. Everything is server-rendered, localized end to end, and discoverable
through `/sitemap.xml`.

---

## Why it is built the way it is

Two constraints shaped every decision here.

**1. Applo had no locale routing.** The app resolves language from the
`NEXT_LOCALE` cookie with no URL prefix, which is a perfectly good design for
an authenticated product — and unusable for SEO, because six languages sharing
one URL cannot be indexed separately and have no way to declare hreflang. The
SEO surface therefore introduces prefixed URLs *for itself only*, without
changing how the rest of the app resolves locale.

**2. Google demotes scaled content.** The March 2026 core update named "scaled
content abuse" explicitly, and template-substitution pages — a profession name
dropped into an otherwise identical page — are the exact pattern it targets.
Every field in the content model therefore holds something a reader could only
get from a page about *that* profession: the credentials it is actually
screened on, the ATS terminology used in its postings, the questions it really
gets asked and what each one tests.

A consequence worth stating plainly: **the copy is market-adapted, not
translated.** The German nursing page discusses the Berufsurkunde, the
Anerkennungsbescheid and TVöD-P grading; the English one discusses NMC
registration, IELTS/OET and band. Running the German text through a translator
would have produced six pages of advice that is wrong in five markets.

---

## URL scheme

```
/{locale}                          guide hub      /de              /en
/{locale}/{family}                 family hub     /de/bewerbung-schreiben
/{locale}/{family}/{profession}    entity page    /en/interview-questions/nurse
```

All six locales carry a prefix, German included. Exempting the default locale
is common, but it breaks hreflang symmetry — the `de` variant would sit at a
path shaped differently from its five siblings — and needs a second route tree
for one language.

Family and profession slugs are localized, and they are **permanent
identifiers**: changing one invalidates every indexed URL and inbound link, so
treat an edit as a migration that needs a redirect.

| Family        | de                            | en                   | fr                            | es                             | pt                             | it                          |
| ------------- | ----------------------------- | -------------------- | ----------------------------- | ------------------------------ | ------------------------------ | --------------------------- |
| `application` | `bewerbung-schreiben`         | `cover-letter`       | `lettre-de-motivation`        | `carta-de-presentacion`        | `carta-de-apresentacao`        | `lettera-di-presentazione`  |
| `interview`   | `vorstellungsgespraech-fragen`| `interview-questions`| `questions-entretien-embauche`| `preguntas-entrevista-trabajo` | `perguntas-entrevista-emprego` | `domande-colloquio-lavoro`  |

Slugs are ASCII: umlauts transliterate (`ae/oe/ue/ss`) and accents drop.
Percent-encoded paths are legal but unreadable once shared or pasted.

A slug from the wrong locale **404s** (`/de/cover-letter/nurse`,
`/de/bewerbung-schreiben/nurse`). Without that, each page would be reachable at
several near-duplicate URLs.

---

## Locale resolution

`src/i18n/request.ts` resolves in this order:

1. an explicit locale passed to `getTranslations({ locale })`
2. the `/{locale}` URL prefix — `middleware.ts` parses it and forwards it as the
   `x-applo-locale` request header
3. the `NEXT_LOCALE` cookie
4. `Accept-Language`
5. German

Step 2 is the load-bearing addition. Without it, a visitor carrying a German
cookie — including Googlebot, once it has been served a `Set-Cookie` — would be
shown German content at `/en/interview-questions/nurse`, collapsing all six
hreflang variants onto one language and making the whole cluster worthless.

Paths outside `app/(seo)` are never prefixed, so step 2 never fires there and
the app's cookie behaviour is untouched. Verified both ways:

```
GET /en/interview-questions/nurse   Cookie: NEXT_LOCALE=de   → <html lang="en">, English content
GET /de/vorstellungsgespraech-…     Cookie: NEXT_LOCALE=en   → <html lang="de">, German content
GET /                               Cookie: NEXT_LOCALE=fr   → <html lang="fr">
```

The header is a language selector and nothing else — it grants no access and
changes no data, and `isLocale()` rejects anything outside the six-value
allow-list — so a client setting it themselves can only pick a UI language they
could already pick with a cookie.

---

## Content model

`src/data/seo/types.ts` defines the shape; each locale file is typed as
`ProfessionCatalog`, so a missing profession or a missing field is a **compile
error**, not a half-empty page in production.

| Family        | Fields                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `application` | `atsKeywords`, `hardSkills[]`, `softSkills[]`, `certifications[]`, `cvFocus[]`, `coverLetterOpener`, `mistakes[]`, `faq[]`           |
| `interview`   | `questions[]` (each with `why` — what is being tested — and `tip` — how to answer), `redFlags[]`, `askThem[]`, `faq[]`               |

Both carry `slug`, `metaTitle`, `metaDescription`, `heading` and `intro`.
Entity pages land at ~590 words of body copy (median), hubs at ~200.

### Adding a profession

1. Add its id to `PROFESSION_IDS` in `src/data/seo/types.ts`.
2. Add its record to **all six** catalogs — the compiler will list what is
   missing. Write German first, then adapt (do not translate) the other five.
3. Add it to `RELATED` in `src/data/seo/index.ts`.
4. Run `pnpm --filter @applo/web check:seo`.

No routing, sitemap or metadata change is needed; all of it derives from the
data.

---

## Metadata and structured data

Every page emits a canonical plus a complete hreflang cluster (six locales and
`x-default`, pointing at English as the version most likely to be readable by a
visitor whose language Applo does not support).

Hreflang has three non-negotiable rules — every page self-references, every
annotation is symmetric, every code is valid — and Google discards the *entire*
cluster if any one of them is broken. So exactly one function builds them:
`lib/seo/urls.ts#alternatesFor`, from a single `locale → path` function.
`sitemap.ts` reuses the same builders, which is why the sitemap and the
documents can never disagree.

Structured data (`lib/seo/json-ld.ts`) is limited to types that honestly
describe the page:

| Page        | JSON-LD                                     |
| ----------- | ------------------------------------------- |
| Entity page | `BreadcrumbList`, `Article`, `FAQPage`      |
| Family hub  | `BreadcrumbList`, `ItemList`                |
| Guide hub   | `BreadcrumbList`, `ItemList`                |

No `HowTo` (Google retired the rich result) and no `QAPage` (that type
describes user-generated question threads, which these are not).

---

## Discovery and internal linking

- `sitemap.ts` — 167 URLs, each SEO entry carrying its full `xhtml:link`
  alternates set. `lastModified` is deliberately omitted: the content changes
  only when the repo does, and stamping every URL with the build time would
  claim the whole site changed on every deploy.
- `robots.ts` — allows public routes, disallows the authenticated app (crawl
  budget, not secrecy — those routes redirect anyway). `/login` and `/register`
  stay crawlable.
- The landing footer links to the guide hub and both family hubs, so the pages
  inherit internal link equity from the site's strongest page rather than
  hanging off the sitemap alone.
- Each entity page links to its sibling in the other family, its family hub and
  three related professions.

---

## Data integrity check

`scripts/check-seo-data.mjs` (`pnpm --filter @applo/web check:seo`, wired into
CI and `cf:build`) covers the failure modes TypeScript cannot see, because they
exist *between* records rather than inside one:

- two professions sharing a slug within a (locale, family) — the second page
  becomes unreachable and both emit the same sitemap URL
- slugs that are not URL-safe
- duplicate meta titles or descriptions — the template-substitution signature
- sections below a minimum length
- **prose that appears identically in two locales** — the signature of a record
  that was copied and never translated

It runs on Node's native type stripping, so it imports the `.ts` catalogs with
no build step.

---

## Known limitation: no static prerendering

These pages are server-rendered per request, like every other route in the app.
The root layout calls `cookies()` through next-intl, which opts the entire
route tree out of static generation — `.next/prerender-manifest.json` lists
only `/_global-error`, `/icon.svg`, `/robots.txt` and `/sitemap.xml`.

**They are also uncacheable at the edge.** `middleware.ts` stamps
`Cache-Control: no-cache` on every navigable document (deliberately — it is
what stops a shared cache pinning an old HTML document that references the
previous build's content-hashed chunks). Combined with dynamic rendering, no
Cloudflare edge cache, tiered cache or Cache Reserve can serve these pages, so
every crawl is a cold Worker render. That is the main lever left on TTFB for
this surface, and it needs the prerendering work below before it can move.

That is a pre-existing property of the app rather than something this feature
introduced, and the pages are cheap to render (all data is imported at build
time; there is no I/O on the request path). Making the SEO tree prerenderable
would mean the root layout could no longer read cookies — a larger refactor
than this surface justifies today. The design is ready for it: every component
under `app/(seo)` takes its locale as a prop and resolves translations with an
explicit `getTranslations({ locale })`, so nothing in the route group reads a
request API of its own.
