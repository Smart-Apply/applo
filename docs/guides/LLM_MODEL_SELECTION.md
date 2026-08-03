# LLM Model Selection — Decision Record & Cost Model

> **Applo's generation quality and unit cost both live or die on the model behind
> `LLM_PROVIDER`.** This document is the single source of truth for *which* model we
> run, *where* we run it (Azure AI Foundry vs. a vendor platform), and the pricing +
> GDPR reasoning behind that call.
>
> ## 📌 How to use this document
> Update this file whenever the model decision changes, a price is re-verified, or a
> provider is added/removed. Concretely:
> 1. Update the **[Decision](#decision)** line + the **[Changelog](#changelog)** (newest first).
> 2. Re-date any pricing table you re-verify (prices drift — never trust an old table).
> 3. Keep the `LLM_PROVIDER` matrix in sync with [ARCHITECTURE.md](../../ARCHITECTURE.md),
>    [README.md](../../README.md) and [.github/copilot-instructions.md](../../.github/copilot-instructions.md).
>
> Same discipline as the mandatory `README.md` / `ARCHITECTURE.md` doc-sync rule.

---

## Decision

**DECIDED 2026-08-02 (24-fixture A/B on the real prompt chain): prose stays on
`gpt-4.1`; Mistral is REJECTED for candidate-facing writing and ADOPTED for the
extraction fast lane.**

- Runtime: `LLM_PROVIDER=azure-openai` → `gpt-4.1` for `cover-letter`,
  `resume-rewrite` and every editor/style/translation pass.
- **Extraction split (shipped):** `LLM_FAST_MODEL=mistral-small-latest` +
  `LLM_FAST_PROVIDER=mistral` routes `ats-keywords` / `job-facts` /
  `skill-selector` to Mistral Small on La Plateforme through a second provider
  instance with its own circuit breaker; any fast-lane failure falls back to the
  main provider on its default model. The `skill-selector` hand-off is guarded
  (`isValidTailoredProfile` / `isDegradedTailoredProfile`, escalate-once).
- **Why Mistral lost prose** (full data below): both Small and Large fabricated
  impact metrics the profile doesn't support (10 and 22 instances vs. **0** for
  gpt-4.1) and wrote half-length cover letters (157/183 body words vs. 240–247
  on a 350 budget). Large was *worse* than Small at 3× its price — the judge's
  higher "quantified" score came precisely from the invented numbers (Goodhart).
- The earlier recommendation (move prose to Mistral Large 3 via Foundry) is
  **retired**. The Foundry Marketplace blocker (2026-07-23, below) is therefore
  moot for prose; La Plateforme serves the fast lane.
- Still true: if cost pressure returns for prose, `gpt-4.1-mini` / `gpt-5-mini`
  on the existing Azure resource remain the zero-migration candidates — but any
  such switch takes the same eval gate this decision used.

<details>
<summary>Superseded decision text (2026-07-23)</summary>

**Primary recommendation: keep the pipeline on Azure and, when we optimise for cost,
move prose generation to `Mistral Large 3` via _Azure AI Foundry_ (EU Data Zone
Standard) — _gated_ on passing a strict `json_schema` A/B eval on the real German
prompt chain first.**

- Runtime today: `LLM_PROVIDER=azure-openai` → `gpt-4.1`.
- A `mistral` provider is now scaffolded (`LLM_PROVIDER=mistral`) so we can A/B test
  Mistral **without** committing — see [How to A/B test](#how-to-ab-test-right-now).
- If cost is the *only* driver and we want **zero migration risk**, switching the
  Azure deployment to **`gpt-4.1-mini`** or **`gpt-5-mini`** gives ~5× savings with
  no provider change and no schema-parity risk. Mistral wins when we *also* want the
  EU-vendor sovereignty story and flagship-tier prose at the lowest price.
- **⚠️ Foundry blocker (our subscription, 2026-07-23):** we currently have **no quota /
  Marketplace enablement** to deploy Mistral on Azure Foundry. Mistral is a *partner*
  model transacted through Azure Marketplace, so serverless deployment needs Marketplace
  purchases enabled on the subscription/tenant — it does **not** draw the normal Azure
  OpenAI TPM quota. **Until that's unblocked, run the A/B on Mistral La Plateforme**
  (`MISTRAL_ENDPOINT=https://api.mistral.ai/v1`, no api-version) — no code change, and
  GDPR is unaffected (Mistral is an EU/France vendor). Foundry stays the target if/when
  enablement lands; see [Foundry vs. La Plateforme](#foundry-vs-la-plateforme).

</details>

---

## Eval results (2026-08-02) — the gate ran; prose said no

Full 24-fixture runs (12 DE / 12 EN) of the real v1 chain on La Plateforme,
judge **pinned to gpt-4.1** (`EVAL_JUDGE_PROVIDER`), deterministic scorers
throughout. Two same-config gpt-4.1 runs first established the **noise floor**
(grounding pass swings ±13 pts, OVERALL ±0.08, words ±7 — deltas inside those
bands are meaningless). Fabrication counts below are **audited**: every flagged
number was re-classified offline against the job-posting text, which exposed
that the pre-fix grounding metric was 100% false positives on the baseline
(job-ad quotes + ISO designations; validator fixed the same day — cover-letter
numbers now ground against profile ∪ job posting, résumé numbers against the
profile only).

| Metric | gpt-4.1 (noise band) | Mistral Small 4 | Mistral Large 3 |
|---|--:|--:|--:|
| **Truly fabricated numbers** (audited) | **0** | 10 (9 EN / 1 DE) | **22** (18 EN / 4 DE) |
| Mean cover-letter body words (350 budget) | 240–247 | **157** | **183** |
| Coverage before weave | 80.9–89.9% | 66.1% | 52.1% |
| Coverage after weave | 92.5–100% | 89.2% | 100% (weave ×13) |
| Judge OVERALL | 4.88–4.96 | 4.83 | 4.71 |
| `quantified_or_qualitative` | 4.21–4.25 | 4.75 | 4.79 ⬅ the fabrications |
| Style violations (deterministic) | 0–1 | 0 | 0 |
| $/gen at list rates | $0.0624 | $0.0054 | $0.0167 |

Readings:
- **The judge alone would have shipped this.** OVERALL stayed within noise while
  the models invented candidate metrics — the deterministic scorers (audited
  grounding, length floor, coverage-before-weave) carried the decision.
- **Half-length letters were invisible** until the floor check
  (`COVER_LETTER_FLOOR_FACTOR = 0.6`, added 2026-08-02) — the old lint only
  measured overruns.
- **Extraction is safe**: the three fast-lane templates emit structured data
  (two under strict `json_schema`), no prose, no impact numbers — none of the
  failure modes apply, and the guarded hand-off escalates a bad selection.
- Cost effect of the split: ~38% of input tokens move from $2.00/M to $0.15/M ≈
  **$0.0624 → ~$0.042/gen (≈ −⅓)** — not the 11× of a full switch, but with
  zero prose risk.

Runs: `eval-baseline-gpt41-*`, `eval-mistral-small-full-*`,
`eval-mistral-large-full-*` under `apps/api/scripts/eval/results/` (gitignored;
re-run with the commands in [How to A/B test](#how-to-ab-test-right-now)).

---

## Why this exists

We priced a full application run (~9 LLM calls, **~40K input + ~11K output tokens**)
against every credible option and asked two questions:

1. **Which model** gives the best €/quality for German-first CVs + cover letters?
2. **Foundry or the vendor's own platform** (Mistral La Plateforme) — which do we host on?

The answer has a hard dependency: our pipeline relies on **strict structured outputs**
(`response_format: json_schema`) resolved by template path in
[`llm/schemas/v1-schemas.ts`](../../apps/api/src/llm/schemas/v1-schemas.ts). Any model
swap that regresses `json_schema` fidelity breaks generation. So the decision is
"cheapest model **that keeps schema parity**", not "cheapest model".

---

## Pricing (verified 2026-07-23)

> ⚠️ Prices drift and vary by region/tier. These are **list** prices per **1M tokens**.
> Re-verify against the Azure Foundry model catalog / Mistral pricing page before acting.

### OpenAI on Azure — Global Standard (USD / 1M tokens)

| Model | Input | Cached input | Output |
|---|--:|--:|--:|
| `gpt-4.1` | $2.00 | $0.50 | $8.00 |
| `gpt-4.1-mini` | $0.40 | $0.10 | $1.60 |
| `gpt-4.1-nano` | $0.10 | — | $0.40 |
| `gpt-5` | $1.25 | $0.13 | $10.00 |
| `gpt-5-mini` | $0.25 | $0.03 | $2.00 |
| `gpt-5-nano` | $0.05 | — | $0.40 |

> **EU Data Zone** deployments run ~10% above Global Standard (e.g. `gpt-4.1` ≈
> $2.20 / $0.55 / $8.80). Batch API is ~50% off input+output. Prompt caching is
> automatic — see [PROMPT_CACHING.md](../implementation/PROMPT_CACHING.md).

### Mistral — La Plateforme (USD / 1M tokens)

| Model | API name | Input | Output |
|---|---|--:|--:|
| **Mistral Large 3** | `mistral-large-latest` | $0.50 | $1.50 |
| Mistral Medium 3.5 | `mistral-medium-latest` | $1.50 | $7.50 |
| Mistral Small 4 | `mistral-small-latest` | $0.15 | $0.60 |

> Batch = −50%. Enterprise APIs = +75%. Mistral on **Azure Foundry** is priced by
> Azure (roughly La Plateforme + a hosting margin) — verify in the Foundry catalog.

### ⚠️ Pricing contradiction we resolved

Mistral's public **FAQ** still quotes Large at **"$2 in / $6 out"** — that is **stale
boilerplate**. The authoritative **model-card / pricing configurator** confirms
**Mistral Large 3 = $0.50 in / $1.50 out**. The $0.50/$1.50 numbers stand; ignore the FAQ.

---

## Cost per application (~40K in / ~11K out, no caching)

| Model | Input $ | Output $ | **Per app** | vs. GPT-4.1 |
|---|--:|--:|--:|--:|
| **Mistral Small 4** | 0.006 | 0.007 | **$0.013** | ~13× cheaper |
| `gpt-5-mini` | 0.010 | 0.022 | **$0.032** | ~5.3× cheaper |
| `gpt-4.1-mini` | 0.016 | 0.018 | **$0.034** | ~4.9× cheaper |
| **Mistral Large 3** | 0.020 | 0.017 | **$0.037** | ~4.5× cheaper |
| Mistral Medium 3.5 | 0.060 | 0.083 | $0.143 | ~1.2× cheaper |
| `gpt-5` | 0.050 | 0.110 | $0.160 | ~1.05× cheaper |
| **`gpt-4.1` (today)** | 0.080 | 0.088 | **$0.168** | — |

At ~30,000 generations/month that is roughly **$5,000/mo on `gpt-4.1`** vs
**~$1,100/mo on Mistral Large 3** vs **~$1,000/mo on `gpt-4.1-mini`** — before prompt
caching (which cuts the input half further on OpenAI).

**Reading of the table**
- **`gpt-4.1` is the most expensive credible option.** We are overpaying if quality holds elsewhere.
- **Mistral Medium 3.5 is a trap** — its output price ($7.50) makes it barely cheaper than GPT-4.1. Skip it.
- **The OpenAI minis (`gpt-4.1-mini`, `gpt-5-mini`) are the zero-risk win** — ~5× cheaper, *no provider swap, no schema-parity risk*.
- **Mistral Large 3 matches the minis on price** but is a **flagship-tier** model and unlocks the **EU-vendor** story.
- **Mistral Small 4 is the absolute cheapest**, viable for the JSON/extraction calls in a mixed-routing setup — but it is **La Plateforme only** (not sold by Azure Foundry).

---

## Foundry vs. La Plateforme

| Dimension | Azure AI Foundry (Mistral) | Mistral La Plateforme |
|---|---|---|
| **GDPR / residency** | ✅ EU Data Zone — data processed in EU; same posture as our OpenAI deployment | ✅ EU vendor (France), EU processing; stronger "EU sovereignty" narrative |
| **Vendor surface** | ✅ One vendor (Azure) — one bill, one key story, one support path | ➕ Second vendor + second key to rotate/monitor |
| **Auth** | `Authorization: Bearer` **or** `api-key`; needs `?api-version=` | `Authorization: Bearer`, **no** api-version |
| **Model availability** | Large 3 + Medium 3.5 only. **No Small 4.** Version lag vs. day-one | ✅ Full catalog incl. Small 4; day-one new models |
| **Wire format** | OpenAI-compatible `/chat/completions` | OpenAI-compatible `/chat/completions` |
| **Best when** | Lowest operational friction, one-vendor simplicity, GDPR parity | You need Small 4 (mixed routing), EU-vendor sovereignty, or newest models first |

Both endpoints speak the same OpenAI wire format, so the **same `MistralProvider`
covers both** — you only change `MISTRAL_ENDPOINT` (+ `MISTRAL_API_VERSION` for Foundry).

### GDPR / EU availability (verified 2026-07-23)

- `Mistral-Large-3` and `mistral-medium-3-5` are on **EU Data Zone Standard** in
  `francecentral`, `germanywestcentral`, `italynorth`, `polandcentral`, `spaincentral`,
  `swedencentral`, `westeurope` (and Global Standard). EU Data Zone = data processed
  within the EU — same residency guarantee we rely on for the OpenAI deployment.
- **Mistral Small 4 is _not_ sold by Azure** — only Large 3 and Medium 3.5 are. Small 4
  requires La Plateforme.

**Why Foundry is the default recommendation:** lowest friction (one vendor, one bill,
reuse our Azure auth + monitoring), GDPR parity with what we run today, and the Foundry
version-lag is not a blocker for a stable flagship like Large 3. Pick La Plateforme only
if a concrete need (Small 4 routing / EU-vendor sovereignty / day-one models) outweighs
the second-vendor overhead.

> **⚠️ Reality check (our subscription, 2026-07-23):** Foundry Mistral is **not
> deployable for us today** — Mistral is a Marketplace-transacted *partner* model and
> Marketplace purchasing isn't enabled on the subscription/tenant. This surfaces as a
> "no quota" / can't-deploy error even though serverless Mistral doesn't consume the
> normal subscription TPM quota. **Interim default: La Plateforme.** To unblock Foundry:
> (1) enable Azure Marketplace purchases on the subscription (Cost Management + any
> blocking Azure Policy), (2) confirm Large 3 is offered as a *serverless API* in your
> EU region/project, then (3) if you later hit the per-deployment 200K TPM / 1K RPM cap,
> raise an Azure Support request. Re-evaluate Foundry vs. La Plateforme once enabled.

---

## The hard gate before we switch

**Do not flip `LLM_PROVIDER` in prod without passing this gate.**

1. **`json_schema` parity.** The pipeline depends on strict structured outputs
   ([`v1-schemas.ts`](../../apps/api/src/llm/schemas/v1-schemas.ts)) for
   `ats-keywords`, `resume-rewrite`, `job-facts`, translation, and validation. Confirm
   Mistral honours `response_format: { type: 'json_schema', strict: true }` for **every**
   schema — not just JSON mode. A model that silently downgrades strict schema to loose
   JSON will pass smoke tests and fail in production on edge cases.
2. **German prose quality A/B.** Run the real v1 prompt chain on a fixed set of German
   profiles+postings through both providers and compare against the style/grounding
   linters (AI-cliché, Konjunktiv/hedging, verb-first bullets, grounding). See
   [LLM_OUTPUT_QUALITY.md](../implementation/LLM_OUTPUT_QUALITY.md).
3. **Latency + circuit-breaker behaviour.** Verify p95 latency and that the opossum
   breaker thresholds still make sense for the new endpoint.

Only after 1–3 are green do we change the default provider.

---

## How to A/B test right now

The provider is scaffolded — no code change needed to try Mistral.

**Mistral La Plateforme:**

```bash
LLM_PROVIDER=mistral
MISTRAL_ENDPOINT=https://api.mistral.ai/v1
MISTRAL_API_KEY=<la-plateforme-key>
MISTRAL_MODEL=mistral-large-latest
# MISTRAL_API_VERSION stays UNSET for La Plateforme
```

**Mistral via Azure AI Foundry (EU Data Zone):**

```bash
LLM_PROVIDER=mistral
MISTRAL_ENDPOINT=https://<your-foundry-resource>.services.ai.azure.com/models
MISTRAL_API_KEY=<foundry-key>
MISTRAL_MODEL=Mistral-Large-3
MISTRAL_API_VERSION=2024-05-01-preview   # Foundry requires an api-version
```

`MistralProvider` builds `${MISTRAL_ENDPOINT}/chat/completions` and only appends
`?api-version=` when `MISTRAL_API_VERSION` is set, so the single provider serves both.

---

## Mixed routing — cheap model for extraction (opt-in)

Not every step needs the flagship. The pipeline's **mechanical extraction /
classification** steps — `ats-keywords`, `job-facts`, `skill-selector` — and the
**mock-interview scoring** templates — `interview-question`,
`interview-answer-analyzer`, `interview-feedback` (added 2026-08-03) — emit small,
structured JSON and carry no candidate-facing prose, so they can run on a much
cheaper model while the **writing** steps (cover letter, résumé rewrite, the
editor/style/translation passes, validation) stay on the flagship. The interview
consumers all clamp score ranges and fall back to heuristics on malformed output,
so a weaker model can only degrade a score — never fail a session.

`LLMService.resolveTaskModel()` implements this centrally by template path — **no call
site changes** — and it's **opt-in + provider-agnostic** via a single env var:

```bash
# Route the three extraction tasks to a cheaper model; writing stays on the default.
LLM_FAST_MODEL=mistral-small-latest
```

- **Unset (default) = zero behaviour change** — every task uses the provider's default model.
- The value is passed straight through as the request `model`, so it's a **Mistral model
  name** on La Plateforme *or* an **Azure deployment name** on Azure OpenAI / Foundry.
  (Mistral **Small 4 is La Plateforme-only** — see the availability matrix above.)
- Extraction on Small 4 + writing on Large 3, all on La Plateforme:

  ```bash
  LLM_PROVIDER=mistral
  MISTRAL_ENDPOINT=https://api.mistral.ai/v1
  MISTRAL_API_KEY=<la-plateforme-key>
  MISTRAL_MODEL=mistral-large-latest   # writing steps (flagship)
  LLM_FAST_MODEL=mistral-small-latest  # extraction steps (cheap)
  ```

**The same gate applies.** Small models more easily regress **strict `json_schema`
adherence on German** extraction, so run the [json_schema parity + German A/B](#the-hard-gate-before-we-switch)
on the three extraction templates before trusting a routed setup in prod. The
`parseJsonResponse` regex repair stays as the safety net and the deterministic
downstream validators (`validateTailoredProfile`, `validateAtsKeywords`) still clamp the
output. To widen the routed set later, add template basenames to
`LLMService.FAST_MODEL_TEMPLATES` (e.g. `extract-resume` for the résumé-parser bootstrap).

---

## Sources & verification notes

- Prices cross-checked against the Azure AI Foundry model catalog and Mistral's pricing
  configurator on **2026-07-23**. The Mistral **FAQ** ($2/$6) is stale — the model card
  ($0.50/$1.50) is authoritative.
- EU Data Zone availability from the Azure Foundry model catalog region list (2026-07-23).
- Per-app token estimate (~40K in / ~11K out) from the [PROMPT_CACHING.md](../implementation/PROMPT_CACHING.md)
  cost model — the same basis used for the GPT-4.1 ~$0.17/app figure.

---

## Changelog

- **2026-08-03** — Routed the three **mock-interview scoring** templates
  (`interview-question` / `interview-answer-analyzer` / `interview-feedback`) to the
  fast lane via the `interview-` prefix in `FAST_MODEL_TEMPLATES`. Guard audit:
  all three consumers already clamp scores and fall back to heuristics on parse
  failure. Effect at Small rates: ~$0.26 → ~$0.02 per 20-question text interview;
  Premium worst case (20 sessions) ~$5.20 → ~$0.40. Branch
  `feat/interview-fast-lane`.

- **2026-08-02** — **DECISION: prose stays on `gpt-4.1`; Mistral rejected for
  writing, adopted for extraction.** Ran the full gate: 24-fixture A/B (Small +
  Large 3, La Plateforme, judge pinned to gpt-4.1) after establishing a
  same-config noise floor. Small/Large fabricated 10/22 audited impact numbers
  (gpt-4.1: 0) and wrote 157/183-word letters on a 350 budget; Large was worse
  than Small at 3× the price. Shipped the split: `LLM_FAST_PROVIDER` (second
  provider instance + own breaker + fallback-to-main), guarded `skill-selector`
  hand-off, cover-letter length floor (`under` severity), grounding validator
  corpus fix (cover letter grounds against profile ∪ job posting; ISO/DIN
  designations excluded), provider-aware eval pricing, judge pinning
  (`EVAL_JUDGE_PROVIDER`). Prices re-verified 2026-08-02 (unchanged from
  2026-07-23). Branch `feat/mistral-provider-eval`.
- **2026-07-23** — Added **per-task model routing** (`LLM_FAST_MODEL`): the mechanical
  extraction steps (`ats-keywords`, `job-facts`, `skill-selector`) can run on a cheaper
  model while the writing steps stay on the flagship. Opt-in, provider-agnostic, no-op
  when unset. See [Mixed routing](#mixed-routing--cheap-model-for-extraction-opt-in).
- **2026-07-23** — Foundry Mistral is **not deployable on our subscription** (no
  Marketplace/quota enablement). Set **La Plateforme as the interim A/B default** and
  documented how to unblock Foundry (Marketplace purchase enablement → serverless
  region check → Azure Support for the rate limit). Target recommendation (Foundry
  Large 3) unchanged.
- **2026-07-23** — Initial decision record. Recommended Azure AI Foundry → Mistral
  Large 3 (EU Data Zone) as the cost-optimised primary, gated on a `json_schema`
  A/B eval; noted `gpt-4.1-mini` / `gpt-5-mini` as the zero-migration ~5× alternative.
  Scaffolded the `mistral` provider (`LLM_PROVIDER=mistral`) for A/B testing.
  Branch `feat/mistral-llm-provider`.
