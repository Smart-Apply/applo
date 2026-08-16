# Generation-output review — August 2026 (issue #572)

> Structured review of what Applo actually produces (résumé + cover letter) and where
> it is weak. Companion to the living tracker
> [LLM_OUTPUT_QUALITY.md](./LLM_OUTPUT_QUALITY.md); the prioritised follow-ups from
> this review are carried in that tracker's status table.
>
> **Reproduce every number below:** `pnpm --filter @applo/api run eval:probe`
> ([`scripts/eval/output-quality-probe.ts`](../../apps/api/scripts/eval/output-quality-probe.ts) —
> offline, no LLM, no database, no network, no cost).

---

## TL;DR

The pipeline has a lot of machinery — grounding validator, style linter, keyword
coverage loop, length governor, six guarded revision passes. The review's central
finding is that **most of that machinery cannot see the defects it was built to
catch**, and that the **exported cover letter is structurally incomplete** in a way no
prompt change can fix.

Three headline results:

1. **The grounding validator inspects 23 of 81 (28 %, 95 % CI 20–39 %) of the
   unambiguous impact claims that occur in the repo's own 24 fixtures.** Every miss is
   a percentage written as a word — `18 Prozent`, `93 percent`, `112 Prozent`.
   The extractor only matches the `%` *sign*
   ([`grounding-validator.service.ts:299`](../../apps/api/src/applications/grounding/grounding-validator.service.ts)).
   A German-first product whose anti-hallucination guard is blind to the German word
   for "percent" is not measuring what we think it measures.
2. **The exported cover letter has no closing formula, no date, no recipient block and
   no Betreffzeile.** All six templates render `data.closingPhrase` and `data.date`,
   but the only caller
   ([`application.processor.ts:166-182`](../../apps/api/src/jobs/processors/application.processor.ts))
   never sets either. Worse, `stripClosingPhrase()` actively deletes the LLM's own
   closing on the stated premise that "the PDF template adds the closing phrase
   automatically"
   ([`html-sanitizer.ts:40-47`](../../apps/api/src/common/services/html-sanitizer.ts)).
   The rendered PDF ends with the candidate's name floating under the last paragraph.
   For the German market this is a hard etiquette failure, and it ships today.
3. **The style linter misses the dominant cliché families in both languages.** It is
   well aligned with the forbidden list its own prompts carry (18/19 detectable), but
   that list is 19 phrases long. Classic German application boilerplate — *"mit großem
   Interesse habe ich Ihre Stellenanzeige gelesen"*, *"hiermit bewerbe ich mich"*,
   *"teamfähig und belastbar"* — and the equivalent English set — *"thrilled"*,
   *"results-driven"*, *"team player"*, *"hit the ground running"* — produce **zero**
   findings. So does every one of the four example openings shipped inside
   `prompts/v1/cover-letter.md`, three of which are near-identical and use the
   `[Company]` placeholder the same prompt forbids.

26 probes: **24 gaps, 2 passing positive controls**. The positive controls matter —
they show the checkers work exactly as designed on the narrow inputs they were designed
for. The problem is coverage, not correctness.

---

## Scope and method

### What was measured

| | |
|---|---|
| **Corpus** | The 24 committed eval fixtures — 24 profession/language pairs across 15 profession families, hand-written synthetic candidates + job ads ([`scripts/eval/fixtures/`](../../apps/api/scripts/eval/fixtures)) |
| **Languages** | DE + EN (the two generation languages), plus FR probes for the export locales |
| **Instruments** | `GroundingValidatorService`, `style-lint.util.ts`, `keyword-coverage.util.ts`, `job-facts.util.ts`, and the cover-letter PDF template data |
| **Method** | (a) static audit of all 13 `prompts/v1/*.md` generation prompts and the guard implementations; (b) a deterministic probe that feeds known-defective and known-clean inputs through the production checkers; (c) a real `@react-pdf/renderer` render using the exact data object the production processor builds, read back with `pdf-parse` |

### What was **not** measured, and why

**No paid LLM run was performed.** The sandbox has no Azure credentials, so no claim
in this document is about the quality of a *model's* output. Everything here is about
the pipeline, the prompts as authored, and the checkers.

That ordering is deliberate rather than a workaround. The plan for this issue
([docs/plans/10-issue-572-llm-output-review.md](../plans/10-issue-572-llm-output-review.md))
requires deterministic scores reported as pooled event counts with confidence
intervals — and those scores are produced *by the checkers audited here*. Spending
money to measure generation quality with an instrument that inspects 28 % of the
relevant claims would have produced a confidently wrong baseline. Fix the instruments
first, then buy the run. The ready-to-execute protocol for that run is in
[§7](#7-protocol-for-the-paid-measurement-run).

### Fixture matrix

15 profession families, 24 fixtures. Covers every family the plan asked for
(healthcare, manufacturing, sales, marketing, education, trades, IT) plus eight more.

| Profession family | DE | EN |
|---|---|---|
| Healthcare / Pflege | Stationsleitung Intensivpflege | Senior Charge Nurse / Care Manager |
| Manufacturing / Fertigung | Fertigungsleiter CNC-Bearbeitung | Production Manager |
| Sales / Vertrieb | Vertriebsleiter B2B | Regional Sales Manager |
| Marketing | Teamleitung Online-Marketing | Head of Digital Marketing |
| Education / Bildung | Grundschullehrkraft | Head of Mathematics Department |
| Finance | Teamleiter Finanzbuchhaltung | FP&A Manager |
| Hospitality / Gastronomie | Restaurantleiter | General Manager (Hotel) |
| Logistics / Logistik | Leiter Logistik und Disposition | Supply Chain Manager |
| IT | Senior Backend-Entwickler Java | Staff Backend Engineer |
| Skilled Trades / Handwerk | Elektrotechnikermeister / Bauleiter Elektro | — |
| Human Resources | HR Manager / Teamleitung Recruiting | — |
| Office Administration | Teamassistenz der Geschäftsleitung | — |
| Customer Service | — | Customer Support Manager |
| Data / Analytics | — | Analytics Lead |
| Project Management | — | Construction Project Director |

---

## 1. Faktentreue / Halluzination

### What works

The validator's design is sound where it applies. A fabricated `42 %` in a German cover
letter is caught (P03); a fabricated three-digit count in a résumé is caught (P07's
`"250 Bestandskunden"` against a profile stating 58 and 120); the
`STANDARD_DESIGNATION_CONTEXT` guard correctly refuses to treat the number in *"ISO 9001"*
as a claim; calendar years are excluded from the plain-number bucket; and the résumé corpus
is profile-only while the cover letter may also draw on the job posting, which is the right
asymmetry in principle.

### What does not

| Probe | Defect | Evidence |
|---|---|---|
| **P01** | **28 % detector recall** over the fixture corpus (23/81 distinct claims, 95 % CI 20–39 %). DE 30 %, EN 27 % | pooled over all 24 fixtures |
| **P03** | `"42 Prozent"` and `"42 percent"` → `checked=0`; the identical `"42 %"` → `checked=1` | percent regex is `/\d+(?:[.,]\d+)?\s*%/g` ([`:299`](../../apps/api/src/applications/grounding/grounding-validator.service.ts)) |
| **P04** | Fabricated head-counts (`"Team von 25"`, `"40 Betten"` against a profile stating 12 and 16) → `checked=0` | plain numbers need 3–6 digits ([`:317-330`](../../apps/api/src/applications/grounding/grounding-validator.service.ts)) |
| **P05** | Written-out impact (`"verdoppelt"`, `"halbiert"`, `"dreistelliger Zuwachs"`) → `checked=0` | no lexical bucket exists |
| **P06** | Unit collapse: `normalizeNumber()` strips every non-digit ([`:348`](../../apps/api/src/applications/grounding/grounding-validator.service.ts)), so `"45 %"` is "grounded" by a profile mentioning `"4,5 Millionen Euro"`, and `"1,2 Mio."` by `"1,2 Millionen"` | 2 claims checked, 0 unsupported |
| **P07** | Job-ad laundering: a letter claiming *the advert's own* figure (`"250 Bestandskunden"`, profile has 58 and 120) passes, while the identical résumé sentence is flagged | cover-letter corpus includes `job.fullText` ([`headless/generate.ts:705`](../../apps/api/src/applications/headless/generate.ts)) |
| **P08** | **Scorer parity:** the same letter scores **100** in production and **0** through the headless `--score` seam | [`scripts/headless-generate.ts:188-191`](../../apps/api/scripts/headless-generate.ts) omits the `jobPostingText` argument that [`scripts/eval/grounding.ts:19-23`](../../apps/api/scripts/eval/grounding.ts) and production both pass |

**Bad example** (constructed, but every element is a form the fixtures actually use):

> „In meiner jetzigen Position habe ich die Fluktuation um **42 Prozent** gesenkt, ein
> **Team von 25** Pflegekräften geführt und die Auslastung **verdoppelt**.“

Three fabrications, and each one is individually invisible to the validator — the
word-form percentage (P03), the two-digit head-count (P04) and the written-out doubling
(P05) are all `checked=0`. Rewrite the first one as `42 %` and it is caught. The guard is
closer to a spelling detector than a claims detector.

P07/P08 are the subtler pair. P07 says a letter may safely quote a number that exists
only in the job advert as if it were the candidate's own track record — the single most
plausible flattering hallucination, since the advert is right there in the prompt
context. P08 says our offline measurement of that behaviour disagrees with production
by 100 points on the same input, which would silently corrupt exactly the kind of
before/after comparison this review is meant to enable.

---

## 2. ATS-Keyword-Abdeckung

### What works

The coverage loop is conservative in the right direction: only priority-1 keywords the
profile genuinely supports (`source: 'both'`) are ever selected for the weave pass, and
at most `MAX_WEAVE_KEYWORDS = 3` per run. The intent — never inject a keyword the
candidate cannot back up — is correct and the code documents it clearly.

### What does not

| Probe | Defect | Evidence |
|---|---|---|
| **P15** | Profile support is checked against skills, experience *title + description*, projects and certificates — **not** `experience.achievements`, **not** `profile.summary`. healthcare-de's `"Einarbeitungskonzept"` and `"Beatmung"` appear only in achievements, so both are tagged `source: 'job'` and are excluded from the weave | [`keyword-coverage.util.ts:54-58`](../../apps/api/src/applications/keyword-coverage.util.ts) |
| **P16** | Substring over-match: `keyword.includes(skillName)` means the profile skill **"Go"** marks **"Django"** and **"Google Cloud"** as supported. The weave pass can therefore inject a keyword the candidate does not have — the exact fabrication the module's own docstring says it prevents. Same class: `"SQL"` → `"MySQL"`, `"NoSQL"` | [`:49-52`](../../apps/api/src/applications/keyword-coverage.util.ts) |
| **P17** | German morphology: a letter containing *"Qualitätsmanagementsystems"*, *"Wundmanagements"* and *"Dienstpläne"* scores **0 % coverage** against the base keywords and the weave pass selects all three for re-injection — measured coverage understated *and* a repetition risk in the output | `isKeywordPresent` requires non-alphanumeric boundaries, so a compounded or inflected form never matches ([`:98-109`](../../apps/api/src/applications/keyword-coverage.util.ts)) |
| **P18** | `matchAtsKeywordsToProfile` always returns `soft_skills: []` — soft-skill requirements are never measured | [`:89`](../../apps/api/src/applications/keyword-coverage.util.ts) |
| **P19** | Coverage is computed for the **cover letter only**. There is no résumé equivalent, although the résumé is what an ATS parses first | only call site is the cover letter in [`headless/generate.ts`](../../apps/api/src/applications/headless/generate.ts) |

P16 and P17 pull in opposite directions and compound: over-matching lets unsupported
keywords through, while under-matching makes genuinely covered ones look missing. Both
distort the ATS score shown to the user (item #9) as well as the weave decision.

---

## 3. Ton und Stil

### What works

`lintGeneratedStyle` reliably catches what it lists, and the guarded rewrite passes
built on top of it are correctly conservative (they ship only a strictly-cleaner,
ID-preserving, non-gutted result). The German Konjunktiv/hedging detector is a good
idea and fires correctly (P13).

### What does not

| Probe | Defect | Evidence |
|---|---|---|
| **P02** | 18 of the 19 phrases the v1 prompts explicitly forbid are detectable; **"Significantly improved"** (EN) is not, so the résumé style-rewrite pass can never be triggered for it | parsed from the prompts' own `FORBIDDEN AI-STYLE PHRASES` sections |
| **P11** | Classic German boilerplate — *"mit großem Interesse habe ich Ihre Stellenanzeige gelesen"*, *"hiermit bewerbe ich mich"*, *"teamfähig und belastbar"*, *"ein hohes Maß an Eigeninitiative"* → **0 findings** | `AI_PHRASES_DE` is 12 entries ([`style-lint.util.ts:37-49`](../../apps/api/src/applications/style-lint.util.ts)) |
| **P12** | English HR clichés — *"thrilled"*, *"dynamic, results-driven"*, *"team player"*, *"hit the ground running"*, *"fast-paced"*, *"leverage my skills"*, *"add value"* → **0 findings** | `AI_PHRASES_EN` is 8 entries ([`:52-61`](../../apps/api/src/applications/style-lint.util.ts)) |
| **P09** | **All four** example openings shipped in `prompts/v1/cover-letter.md` score 0 findings — they are made of the cliché families the same file forbids | see below |
| **P10** | **Three of four** of those openings contain the `[Company]` placeholder the same prompt bans | `prompts/v1/cover-letter.md:257-281` |
| **P14** | A French letter full of the equivalent clichés scores 0. `translation.service.ts:163` lints fr/es/pt/it translations with a DE+EN phrase list — structurally a no-op | [`translation.service.ts:163`](../../apps/api/src/applications/translation/translation.service.ts), [`style-lint.util.ts:119-120`](../../apps/api/src/applications/style-lint.util.ts) |

**Bad example — and it is our own prompt.** Three of the four few-shots the writer model
imitates are near-identical:

> *"Dear Hiring Manager,*
>
> *I am writing to express my strong interest in the Senior Full-Stack Developer position
> at **[Company]**. With over 6 years of experience …, **I am confident that** my technical
> expertise and **track record of** delivering high-impact solutions **align perfectly with**
> your team's needs."*

Same skeleton for the healthcare and manufacturing variants; only the nouns change.
Few-shots are the strongest signal in a prompt, so this teaches mode collapse *and*
teaches the placeholder the prompt bans two hundred lines earlier. The German example is
the single German few-shot in the file, it opens with the deadest opener in the German
canon (*"hiermit bewerbe ich mich"*), and it is an IT role.

**Good example** — the résumé prompt shows how it should be done: `resume-rewrite.md`
carries an explicit `## Domain Examples` section with healthcare, manufacturing and
marketing bullets. `cover-letter.md` has no equivalent; its guidance examples are
*"Reduced deployment time by 50 %"* and *"microservices migration"*.

---

## 4. Anschreiben-Struktur (Betreff, Anrede, Schluss)

### What works

The salutation chain is genuinely good. `job-facts.md` extracts the contact person,
`buildSalutation` composes the greeting deterministically instead of trusting the model,
and it degrades to *"Sehr geehrte Damen und Herren,"* when no contact exists. Verified
directly: `{contact_name: 'Anna Hoffmann', contact_salutation: 'Frau'}` → *"Sehr geehrte
Frau Anna Hoffmann,"*, and an empty contact → *"Sehr geehrte Damen und Herren,"*.

### What does not

| Probe | Defect | Evidence |
|---|---|---|
| **P22** | A **known** German contact name is discarded whenever the LLM returns no Frau/Herr marker: `buildSalutation({ contact_name: 'Alex Weber', contact_salutation: '' }, 'de')` → *"Sehr geehrte Damen und Herren,"*. English keeps it (*"Dear Alex Weber,"*). This hits exactly the diverse, non-binary and non-German-sounding names where personalization matters most | [`job-facts.util.ts:65-89`](../../apps/api/src/applications/job-facts.util.ts) |
| **P23** | **The exported PDF has no closing formula.** `stripClosingPhrase()` deletes the LLM's *"Mit freundlichen Grüßen"* because "the PDF template adds the closing phrase automatically"; the template only adds it when `data.closingPhrase` is set; the processor never sets it | [`html-sanitizer.ts:40-47`](../../apps/api/src/common/services/html-sanitizer.ts), [`application.processor.ts:166-182`](../../apps/api/src/jobs/processors/application.processor.ts), all six templates |
| **P26** | No Betreffzeile. `CoverLetterTemplateData` has no `subject` field at all | [`pdf-v2/template-data.ts:12-40`](../../apps/api/src/pdf-v2/template-data.ts) |
| **P21** | The length governor's `SALUTATION_LINE_RE` covers `sehr geehrte\|liebe\|dear\|hello\|hi` only, so for fr/es/pt/it exports `extractSalutationLine` returns `null` and the shorten guard's salutation-preservation check silently no-ops | [`style-lint.util.ts:254`](../../apps/api/src/applications/style-lint.util.ts) |

⚠️ **Landmine for whoever fixes P22:** adding a new German greeting form (e.g.
*"Guten Tag Alex Weber,"*) requires extending `SALUTATION_LINE_RE` in the same change.
Otherwise `countCoverLetterBodyWords` starts counting the greeting as body text and the
shorten/repair guards stop recognising the salutation they are supposed to preserve.

---

## 5. PDF-Formatierung und Edit-Preview-Konsistenz

Rendering the exact object the production processor builds through the default
`classic-ats` template yields this complete document:

```
SABINE KRÜGER
Stationsleitung Intensivpflege (m/w/d)
Lindenstraße 14, 20095 Hamburg | +49 151 23456789 | sabine.krueger@example.com
Sehr geehrte Frau Dr. Hoffmann,
die Leitung Ihrer Intensivstation reizt mich, weil Sie Weiterbildung strukturell verankern.
Über ein Gespräch freue ich mich.
Sabine Krüger
```

Missing versus a conventional German business letter (DIN 5008): **date** (P24),
**recipient block** (P25), **Betreffzeile** (P26), **closing formula** (P23). The
company name *is* passed to the template as `companyName` — no template renders it.
`date`, `recipientName` and `companyAddress` exist in the type and are never populated.
This is one data-mapping defect, not six: all six designs already render `data.date`
and `data.closingPhrase`.

Other formatting observations:

- **Cover-letter page count** is checked, but log-only
  (`warnIfCoverLetterMultiPage` in [`application.processor.ts`](../../apps/api/src/jobs/processors/application.processor.ts)).
  A two-page cover letter still ships; the warning is the only trace.
- **Résumé page count** is not checked at all — a long profile silently spills to
  page 3+.
- **Dates in the résumé** are handled well: re-derived from raw ISO values per target
  language (`localizeStoredResumeDates` → `formatDateRange`), so a DE→FR export produces
  French month names rather than translated German ones.
- **Edit preview vs PDF** is an approximation by design (CSS `zoom` for font scale,
  web-safe stacks for the bundled OFL families, `rd--density-*` classes for spacing) —
  acceptable. The real inconsistency is structural, not visual: no component under
  `apps/web/src/components/applications/` or `components/pdf/` references a closing
  phrase either, so the elements the PDF is *supposed* to add (closing, date, recipient)
  appear in neither surface. The preview is faithful — to a document that is incomplete.
  In practice this means nothing warns the user about P23 at any point in the flow.

---

## 6. Messbarkeit (was greift, was nicht)

Reconciliation of every deterministic guard against what it demonstrably catches:

| Guard | Fires on | Blind to | Probe |
|---|---|---|---|
| `GroundingValidatorService` | `%` sign, currency, magnitude suffixes, 3–6-digit plain numbers | word-form percentages, 1–2-digit counts, written-out magnitudes, unit mismatches, job-ad-sourced figures in the letter | P01, P03–P08 |
| `lintGeneratedStyle` | its 20 listed cliché phrases + 7 German hedging forms | the dominant DE/EN cliché families, its own prompts' example openings, all four export locales | P02, P09–P12, P14 |
| `matchAtsKeywordsToProfile` | skills, experience title/description, projects, certificates | achievements, summary, soft skills; over-matches on substrings | P15, P16, P18 |
| `computePriority1Coverage` | word-boundary-exact match in the cover letter | German compounds/inflections; the résumé entirely | P17, P19 |
| `lintCoverLetterLength` | DE/EN body-word budget, salutation + closing excluded | fr/es/pt/it salutations and closings | P20 (ok), P21 |
| `buildSalutation` | gendered DE contacts, all EN contacts | ungendered DE contacts | P22 |
| Cover-letter PDF data | body, name, contact, target title | date, recipient, subject, closing | P23–P26 |

**Guard outcomes are computed but discarded.** `headless/generate.ts` returns a
`guards` record (`applied` / `fallback` / `error` / `skipped`) for all eight guarded
passes — the free, high-signal "did the model produce something valid" proxy the plan
asks for. `GenerationService` never reads it. Production quality signal is limited to
free-text `logger.warn` lines that cannot be aggregated, so today the only way to answer
"is output quality drifting?" is to pay for an eval run.

---

## 7. Protocol for the paid measurement run

Pre-specified so the run is a measurement rather than an exploration. Execute **after**
R1–R3 land, so the instruments can resolve what they claim to measure.

1. **Smoke test first, one fixture.** `pnpm --filter @applo/api run eval:llm -- --only=healthcare-de --repeat=1`,
   then grep the output for `lane call failed` and confirm the serving model name is the
   one intended. A silent lane fallback compares a model to itself; this repo has already
   paid for that lesson once.
2. **Paired design.** Same 24 fixtures in both arms, same seed order. Item variance
   across professions dwarfs the effect sizes we care about.
3. **Pool the events, don't average the fixtures.** Report unsupported-claim counts,
   style findings and covered priority-1 keywords as pooled totals with Wilson intervals
   (≈60–80 events over 24 fixtures gives ±4–6 pp; a per-fixture binomial gives ±14 pp and
   cannot resolve anything we would act on).
4. **Fix the scorer first (R3).** Until `headless-generate.ts` passes `jobPostingText`,
   its grounding score is not the production score (P08).
5. **Record the serving model per arm.** If a lane points at a reasoning model, the
   tuned per-call temperatures are silently ignored and hidden reasoning tokens bill as
   output.
6. **Judge model pinned** for the whole comparison, pairwise A/B rather than absolute
   scores.

---

## 8. Prioritised follow-ups

Ordered by user-visible impact per unit of effort. Each has a criterion that can be
mechanically checked — for R1–R8 by flipping the named probe from `GAP` to `OK` in
`pnpm --filter @applo/api run eval:probe`.

| # | Improvement | Why now | Effort | Acceptance criterion |
|---|---|---|---|---|
| **R1** | **Complete the exported cover letter**: populate `date` + `closingPhrase` (localized for all six export locales) in the processor, render `companyName`/`recipientName`/`companyAddress` in the templates, add a `subject` field and a Betreffzeile | Ships a formally broken German business letter today; pure data-mapping, no LLM involved | S | P23–P26 OK; a rendered DE cover letter contains date, recipient, Betreff and *"Mit freundlichen Grüßen"* |
| **R2** | **Teach the grounding validator to read numbers as humans write them**: word-form percentages (DE/EN), written-out magnitudes, unit-aware normalisation, and 1–2-digit counts when attached to a countable noun | The anti-hallucination guard currently inspects 28 % of claims; every other quality metric built on it inherits the blind spot | M | P01 recall ≥ 90 %; P03–P06 OK; no new false positives on the 24 fixtures |
| **R3** | **Restore scorer parity**: pass `jobPostingText` in `headless-generate.ts --score`, and decide explicitly whether the job posting may ground a *candidate's own* claim (P07 suggests it should not) | Offline scores disagree with production by 100 points on the same input; every A/B built on them is unreliable | S | P07, P08 OK |
| **R4** | **Rewrite the `cover-letter.md` few-shots**: profession-diverse (nurse, CNC lead, account manager, teacher), each with a distinct structure, no `[Company]` placeholder, no forbidden phrases; add a `## Domain Examples` section mirroring `resume-rewrite.md` | The few-shots teach exactly the clichés and the placeholder the same prompt bans; only 1 of 4 is German, and it is an IT role | S | P09, P10 OK; the openings pass the linter after R5 |
| **R5** | **Expand the cliché lists** to the dominant DE and EN families (German application boilerplate, English HR-speak) and add `"significantly improved"` | The style guard has teeth but almost nothing to bite; expansion is a data change, the enforcement path already exists | S | P02, P11, P12 OK; no regression in fixture style scores |
| **R6** | **Fix keyword–profile matching**: include `experience.achievements` + `profile.summary`, replace the bidirectional substring test with token/word-boundary matching, add German compound + inflection handling | Simultaneously over- and under-reports; distorts the user-facing ATS score and can make the weave pass inject unsupported keywords | M | P15, P16, P17 OK; `"Go"` no longer supports `"Django"` |
| **R7** | **Keep the contact name when gender is unknown** (e.g. *"Guten Tag Alex Weber,"*) and extend `SALUTATION_LINE_RE` in the same change | Silently drops personalization precisely for diverse and non-German names | S | P22 OK; P20 still OK |
| **R8** | **Extend the deterministic guards to the export locales** (fr/es/pt/it): salutation/closing regexes and per-locale cliché lists, or make `lintGeneratedStyle` a no-op there instead of a silent one | Four shipped export languages run through guards that structurally cannot fire | M | P14, P21 OK |
| **R9** | **Make quality observable in production**: persist/emit the `guards` record `headless/generate.ts` already returns, plus structured grounding/style/length counters | Turns every future review from a paid batch into a query; the data is computed and thrown away today | M | Guard fallback rate and unsupported-claim count queryable per application without log scraping |
| **R10** | **Add résumé ATS coverage** (`computePriority1Coverage` equivalent over the résumé prose) and surface soft skills | The résumé is what an ATS parses first and it is the one document with no coverage metric | M | P18, P19 OK |

**Suggested sequencing.** R1 alone (S) removes a shipped, user-visible defect. R2 + R3 (M + S)
make the primary metric trustworthy and must land before any paid comparison. R4 + R5 (S + S)
are a cheap pair with compounding effect — better few-shots *and* a linter that can catch it
when the model ignores them. R6–R10 follow.

---

## 9. How to reproduce

```bash
pnpm install
pnpm --filter @applo/api run eval:probe              # all 26 probes (~30 s)
pnpm --filter @applo/api run eval:probe -- --no-pdf  # skip the PDF render
pnpm --filter @applo/api run eval:probe -- --fail-on-gaps   # exit 1 while gaps remain
```

The probe is offline: no LLM, no database, no network, no cost. Once a follow-up lands,
its probe should flip from `GAP` to `OK`; `--fail-on-gaps` is there so a fix PR can gate
on it.

The full offline chain can also be exercised end-to-end without credentials, which is
useful for checking guard wiring (though not output quality, since the provider is
deterministic and synthetic):

```bash
cd apps/api
LLM_PROVIDER=fake pnpm run generate:headless -- --in <fixture.json> --score --pretty
```
