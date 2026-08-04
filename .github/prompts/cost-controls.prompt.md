---
mode: 'agent'
description: 'Implement the remaining LLM cost controls and the final tier contract (2026-08-03): Free 3 checks + trimmed bullets across six locales, Premium 20 interviews, interview scoring on the fast lane, tier-scoped voice minutes, voice token telemetry. Four sequential PRs.'
---

# Cost controls — remaining items from the 2026-08-02 review

Implement the four open items below as **four separate short-lived branches → PRs, in
order** (each builds on the previous merge; trunk-based, squash-merge, Conventional
Commit titles). Do NOT combine them into one PR.

## Context you must not re-litigate (evidence from the 2026-08-02 eval, PR #726)

- Prose stays on `gpt-4.1`. Mistral was **rejected for candidate-facing writing**
  (fabricated impact metrics: Small 10 / Large 22 audited instances vs gpt-4.1 0;
  half-length letters). Decision record: `docs/guides/LLM_MODEL_SELECTION.md`.
- Mistral Small is **adopted for structured extraction** via the fast lane
  (`LLM_FAST_MODEL=mistral-small-latest` + `LLM_FAST_PROVIDER=mistral`, live in prod
  since v4.13.0). The fast lane has its own circuit breaker and falls back to the
  main provider on any failure (`LLMService.callRouted`). Never weaken that fallback.
- Measured costs: application $0.0403/gen (split) · text interview ≈ $0.26 on gpt-4.1
  (20 questions) · voice ≈ $0.014/min on `gpt-realtime-mini`.
- Tier revenue net of 19% USt + payment fees: Pro €9.95 → ~€7.98 · Premium €19.95 → ~€16.38.

## Global guardrails (apply to every task)

- **Six-locale parity is mandatory.** Since PR #728 the catalogs are
  `apps/web/messages/{de,en,fr,es,pt,it}/*.json` and all six key trees must stay
  identical. After ANY message edit run the parity check for each touched namespace:
  ```bash
  node -e "const fs=require('fs');const ns=process.argv[1];const L=['de','en','fr','es','pt','it'];const keys=(o,p='')=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'?keys(v,p+k+'.'):[p+k]);const t=Object.fromEntries(L.map(l=>[l,new Set(keys(JSON.parse(fs.readFileSync('apps/web/messages/'+l+'/'+ns+'.json'))))]));for(const a of L)for(const b of L){const d=[...t[a]].filter(k=>!t[b].has(k));if(d.length)console.log(a+'→'+b,d)}" landing
  ```
- Tier numbers are asserted in
  `apps/api/src/subscription/__tests__/unit/subscription-tiers.unit.spec.ts` — update
  it in the same PR as any `TIER_LIMITS` change and run it
  (`npx vitest run <spec>` from `apps/api`).
- The public tier contract lives in FOUR places that must move together:
  `TIER_LIMITS` (`apps/api/src/subscription/subscription.service.ts`), the
  `GET /subscription/tiers` features arrays
  (`apps/api/src/subscription/subscription.controller.ts`), the six
  `landing.json`/`faq.json` catalogs, and the docs (`README.md`,
  `.github/copilot-instructions.md` Data Model + Subscription lines, `ARCHITECTURE.md`
  if topology text mentions limits).
- Prisma: forward-only migrations, expand→contract, never `migrate reset`. New columns
  nullable.
- 0 new ESLint errors AND warnings. TypeScript strict — no `any`.
- Don't route any candidate-facing prose template to the fast lane. Extraction and
  internal scoring only.

---

## PR 1 — `feat/tier-contract-v2` (final tier contract + six-locale bullet trim)

**⚠️ The earlier `feat/tier-features` branch is stale — do not merge it.** It trimmed
the tier bullets in de/en only; PR #728 then added fr/es/pt/it catalogs translated
from the PRE-trim copy, so main now carries the removed bullets in all six locales
(`grep -l noWatermark apps/web/messages/*/landing.json` → 6 files). Redo everything
below from scratch on a fresh branch off current main; afterwards delete the stale branch.

**The final tier contract (decided 2026-08-03):**

| | Free | Pro | Premium |
|---|---|---|---|
| KI-Bewerbungen / Monat | 3 (unchanged) | 50 | 100 |
| Bewerbungs-Checks / Monat | **3** (was 5) | 15 | 35 |
| Mock-Interviews / Monat | 0 | 5 | **20** (was 45) |
| Bullets removed | `profile`, `noWatermark` | `ingestion`, `pipeline` | — |
| Bullets kept/changed | `adDownload` stays | `export` → rename key to `adFree`, text „Werbefrei“ only | interviews text „20 Mock-Interviews (Gespräch & Text)“ |

1. **Limit changes in `TIER_LIMITS`** (`apps/api/src/subscription/subscription.service.ts`):
   - `FREE.validationsPerMonth: 5 → 3`
   - `PREMIUM.interviewSessionsPerMonth: 45 → 20`
   - Applications stay 3/50/100. No migration needed — remaining-quota math
     (`Math.max(0, limit - used)`) clamps mid-period users who already exceeded the
     new caps.
   - Update `subscription-tiers.unit.spec.ts` (asserts `validationsPerMonth: 5` and
     `interviewSessionsPerMonth: 45`) and run it.
2. **Landing pricing (`pricing.plans.*` in ALL SIX `landing.json`):**
   - Free: delete `profile` + `noWatermark` keys; `validations` text → „3
     Bewerbungs-Checks / Monat“ (+ five translations); keep `applications` +
     `adDownload`.
   - Pro: delete `ingestion` + `pipeline`; rename `export` → `adFree` with text
     „Werbefrei“ / "Ad-free" (+ fr/es/pt/it); keep the rest.
   - Premium: `interviews` text → „20 Mock-Interviews (Gespräch & Text)“ (+ translations).
   - Drop the watermark claim from `pricing.lead` in all six.
   - Update `apps/web/src/components/landing/pricing-section.tsx`: remove the deleted
     feature rows, rename the `export` reference to `adFree`.
3. **Every other place the numbers are quoted** (verified list — grep to confirm no
   new ones appeared):
   - `apps/web/messages/*/faq.json` — the pricing answer quotes 5 checks + 45
     interviews (×6 locales).
   - `apps/web/messages/*/validation.json` — `freeHistoryDescription` hardcodes
     „5 Checks pro Monat“ (×6 locales) → 3.
   - `apps/api/src/subscription/subscription.controller.ts` — features arrays
     (Free checks bullet → 3, Pro gains 'Werbefrei', Premium interviews → '20
     Mock-Interviews (Gespräch & Text)', deletions as above).
   - `apps/api/src/validation/validation.service.ts` + `validation.controller.ts` —
     docblocks/Swagger text mention „Free: 5“.
   - `README.md` (Subscriptions bullet: checks 5/15/35 → 3/15/35; interviews line
     „Premium includes 45“ → 20) and `.github/copilot-instructions.md` (Subscription
     model line, `/subscription/tiers` line, validation module + endpoint sections,
     interviews section „Pro 5, Premium 45“ → 20).
4. Run the locale-parity check for `landing`, `faq`, and `validation`; `pnpm lint` in
   both workspaces.

**Commit/PR title:** `feat(subscription): final tier contract — Free 3 checks, Premium 20 interviews, trimmed bullets`

---

## PR 2 — `feat/interview-fast-lane` (item 2: interview unit cost)

After PR 1, Premium's worst case is 20 text interviews × 20 questions ≈ $5.20/user on
gpt-4.1 — no longer tier-breaking, but still the priciest unit. Route the scoring to
the fast lane; the marketed counts (Pro 5 / Premium 20, set in PR 1) do not change here.

1. Add `'interview-'` to `LLMService.FAST_MODEL_TEMPLATES`
   (`apps/api/src/llm/llm.service.ts`, currently
   `['ats-keywords', 'job-facts', 'skill-selector']`; matching is `includes()`, so the
   prefix covers all three templates: `interview-question.md`,
   `interview-answer-analyzer.md`, `interview-feedback.md`). These emit structured
   JSON scores/questions — internal, not candidate-facing documents.
2. **Verify each consumer degrades gracefully on malformed output** (the fast lane
   means a weaker model): read
   `apps/api/src/interviews/services/{question-generator,answer-analyzer,feedback-generator}.service.ts`.
   Each must clamp scores to valid ranges and fall back to a heuristic/default on
   parse failure without failing the session. Add guards where missing — mirror the
   `isValidTailoredProfile` / escalate-once pattern from
   `apps/api/src/applications/tailored-profile.util.ts` +
   `GenerationService.selectTailoredProfile` if a hard guarantee is needed
   (an explicit `options.model = llmService.defaultModel` retry escapes the fast lane).
3. Update the routing docs: copilot-instructions "Per-task model routing" bullet,
   `docs/guides/LLM_MODEL_SELECTION.md` (Mixed routing section + changelog entry).
4. **Verification:** run one full text interview locally
   (`LLM_FAST_MODEL=mistral-small-latest LLM_FAST_PROVIDER=mistral`, real keys) and
   confirm in the logs that the three interview templates are served by Mistral,
   scores land in range, feedback renders. Then one run with `MISTRAL_API_KEY` unset
   to prove the fallback path. Expected effect: ~$0.26 → ~$0.02 per 20-question
   interview; Premium worst case (post-PR-1) ~$5.20 → ~$0.40.

**Commit/PR title:** `feat(interviews): route interview scoring to the fast lane`

---

## PR 3 — `feat/tier-scoped-voice-minutes` (item 3)

Today `VOICE_INTERVIEW_MINUTES_PER_MONTH` is one global env (default 60) read in
`config.service.ts` — Pro and Premium get identical voice minutes by accident, and
raising it for Premium would silently raise Pro.

1. Add `voiceMinutesPerMonth` to `TierLimits` + `TIER_LIMITS`
   (`subscription.service.ts`): FREE `0`, PRO `60` (today's effective value — no
   user-visible regression), PREMIUM `120`. Update the tiers unit spec.
2. `VoiceInterviewService.getBudget()`
   (`apps/api/src/interviews/voice/voice-interview.service.ts`) resolves the cap from
   the user's tier via `SubscriptionService.getTierLimits(...)` (check
   `InterviewsModule` imports; it already depends on the subscription module for
   usage gating). The env var becomes a **global emergency clamp**: effective cap =
   `min(tierCap, envCap)` when the env value is ≥ 0. Change the schema default
   (`env.schema.ts`) from `'60'` to `'-1'` (no clamp) — the var is NOT set on Fly, so
   no ops change is needed, but state this in the PR description.
3. `GET /interviews/voice/config` already serves remaining minutes from `getBudget` —
   verify it reflects the tier split (Pro user 60, Premium user 120).
4. Docs: copilot-instructions voice-interview section (mentions the monthly cap),
   `apps/api/.env.example`, README interviews bullet. Cost note for the PR: at
   `gpt-realtime-mini` rates Premium's 120 min ≈ $1.68/month worst case (20 sessions
   post-PR-1, minute cap binds first).

**Commit/PR title:** `feat(interviews): tier-scoped voice minute caps (Pro 60 / Premium 120)`

---

## PR 4 — `feat/voice-usage-telemetry` (item 4)

Voice is the most expensive unit with zero token telemetry: the browser talks WebRTC
to Azure directly, so the server never sees the `response.done` usage payloads. The
transcript endpoint already receives duration — extend it to carry usage.

1. **Frontend** (`apps/web/src/components/interviews/interview-voice.tsx`):
   `handleRealtimeEvent` already processes data-channel events. Accumulate usage from
   every `response.done` event (`event.response.usage` — verify the exact field names
   against the current Azure Realtime event shape before coding: total input/output
   tokens plus `*_token_details` splitting text/audio/cached). Keep a running sum in a
   ref; include it in the existing `useSubmitVoiceTranscript` payload.
2. **DTO** (`apps/api/src/interviews/dto/submit-voice-transcript.dto.ts`): optional
   `usage` object — `textInputTokens`, `audioInputTokens`, `cachedInputTokens`,
   `textOutputTokens`, `audioOutputTokens`; each `@IsInt() @Min(0)` with a sanity
   `@Max(10_000_000)`, whole object optional (older clients / filtered events send
   nothing). Client-reported numbers are telemetry, not billing — never trust them for
   quota enforcement (the minute cap from PR 3 stays authoritative).
3. **Persistence:** nullable `voiceUsage Json?` on `InterviewSession`
   (`apps/api/prisma/schema.prisma`) — expand-only migration
   (`npx prisma migrate dev --name add_voice_usage_telemetry`, commit the SQL).
   Store the validated object; on finalize, log one line with the derived cost at
   `gpt-realtime-mini` rates (audio in $10/M, audio out $20/M, text in $0.60/M,
   text out $2.40/M, cached $0.30/M) so `flyctl logs` can answer "what does a voice
   minute really cost" — the $0.014/min figure is currently an assumption.
4. No audio, no transcripts in the usage payload — token counts only (the existing
   no-audio-persistence promise in README/copilot-instructions stays true; extend the
   sentence to mention token-usage telemetry).

**Commit/PR title:** `feat(interviews): capture voice token usage via the transcript endpoint`

---

## Explicitly out of scope

- Ads infrastructure and any change to the Free application count (stays 3).
- Routing any of `cover-letter`, `resume-rewrite`, editor/style/translate passes to
  the fast lane (eval-rejected).
- Price changes (€9.95 / €19.95) and add-on packages.
- The application-pipeline eval harness — it does not cover interviews; PR 2 is
  verified by the manual smoke + fallback drill described there.

## Delegation notes (cloud agent)

- Everything in PR 1 and PR 3 is verifiable headlessly: unit specs, `pnpm lint`, the
  locale-parity one-liner. Run them before opening each PR.
- For changed user-facing strings, write fr/es/pt/it translations consistent with the
  existing catalog tone (European Portuguese for `pt`); never leave a locale behind —
  identical key trees across all six are CI-relevant.
- PR 2's live smoke and fallback drill, and PR 4's real WebRTC session, need local
  secrets a cloud agent doesn't have. Implement + unit-test headlessly, then list
  those two checks explicitly in the PR description under "post-merge verification"
  for a human to run on staging.
- Never commit secrets; `apps/api/.env` is gitignored and stays untouched.
