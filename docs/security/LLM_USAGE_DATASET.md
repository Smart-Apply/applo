# LLM Usage Dataset — export, schema and anonymity guarantees

> **Scope.** This document describes the **export** of `llm_usage_events`
> (issue [#523](https://github.com/Smart-Apply/applo/issues/523)) — the portable
> artefact used for ML work and shown to due-diligence reviewers. It is *not* a
> description of the live table, which is handled differently (§1).

---

## 1. What is anonymous, and what is not

There are two datasets, and conflating them is the mistake this document exists
to prevent.

| | Live table `llm_usage_events` | Export produced by `/admin/llm-usage/export` |
|---|---|---|
| Actor key | `actorHash` = HMAC-SHA256(`LLM_USAGE_HASH_SALT`, `userId`) — stable per user, forever | Re-keyed with a random per-export salt, or omitted entirely |
| Timestamp | `createdAt`, millisecond precision | Truncated to the start of a UTC hour / day / month |
| Row id | `cuid` (embeds a millisecond timestamp) | Not exported |
| Status | **Pseudonymous personal data under GDPR** | Anonymised to the degree described in §4, under the configuration in §5 |

The live table is *not* anonymous, and the [13 Aug 2026 audit](./SECURITY_AUDIT_2026-08-13.md)
(finding **F11**) is explicit about why: `actorHash` is stable per user, and the
table sits beside `applications`, `validations` and `interview_sessions`, which
carry a `userId` and a millisecond `createdAt`. A burst of usage rows therefore
time-correlates back to the row that triggered it **without knowing the salt**.
That is why the live table has an erasure hook on account deletion and a
retention sweep (`LLM_USAGE_RETENTION_DAYS`, default 90).

The export closes exactly that gap: dropping the row id, bucketing the
timestamp, rounding the latency, re-keying or dropping the actor, and
suppressing thin quasi-identifier groups (§4).

**Never describe an export with `actor=pseudonym` as anonymous.** It still
supports per-actor grouping within the file, which is what makes it useful for
ML — and what keeps it personal data. Use `actor=none` for anything that leaves
the company (§5).

---

## 2. Producing an export

Both endpoints are admin-only: `JwtAuthGuard` + `AdminGuard`, i.e. the caller's
email must be in `ADMIN_EMAILS` (fail-closed when that variable is empty).

```bash
# The dataset itself (JSON Lines by default, CSV on request)
curl -sS --cookie "access_token=$ADMIN_JWT" \
  "$API/admin/llm-usage/export?format=csv&from=2026-08-01T00:00:00Z&to=2026-09-01T00:00:00Z&actor=none&bucket=day&k=5" \
  -o applo-llm-usage-2026-08.csv

# The manifest that describes THAT export — ship the two together
curl -sS --cookie "access_token=$ADMIN_JWT" \
  "$API/admin/llm-usage/export/manifest?from=2026-08-01T00:00:00Z&to=2026-09-01T00:00:00Z&actor=none&bucket=day&k=5" \
  -o applo-llm-usage-2026-08.manifest.json
```

| Parameter | Values | Default | Meaning |
|---|---|---|---|
| `format` | `jsonl`, `csv` | `jsonl` | Serialisation. Parquet: see §7. |
| `from` / `to` | ISO 8601 | none | Source `createdAt` window — `from` inclusive, `to` exclusive. |
| `bucket` | `hour`, `day`, `month` | `hour` | UTC bucket the timestamp is truncated to. **There is no raw-timestamp option.** |
| `actor` | `pseudonym`, `none` | `pseudonym` | Per-export re-keyed pseudonym, or no actor value at all. |
| `k` | 1–1000 | `5` | Minimum distinct actors per quasi-identifier group. `1` disables suppression. |
| `limit` | 1–200000 | `50000` | Maximum source rows read. Rows are buffered to compute k-anonymity, so this is a memory bound; the manifest reports `truncated: true` when the window held more. |

The manifest is the due-diligence artefact: it records the parameters, the row
and suppression counts, the column schema, the guarantees and the residual
risks for the exact export those parameters produce. It is computed by running
the same export again, so request it with **identical parameters over a closed
window** — otherwise its counts describe a slightly different run than the file
you shipped.

The data response is a download (`Content-Disposition: attachment;
filename="applo-llm-usage-<date>.<ext>"`, `Cache-Control: no-store`) and repeats
the headline numbers in headers, so a scripted export can assert on them without
parsing the body: `X-Applo-Export-Schema-Version`, `X-Applo-Export-Rows`,
`X-Applo-Export-Suppressed-Rows`.

---

## 3. Schema (`schemaVersion: 1`)

One row per logical LLM call. The schema is fixed — `actorId` stays a column
even under `actor=none` (its value is then always empty), so consumers do not
have to branch on the configuration. Absent values are `null` in JSONL and an
empty cell in CSV.

| Column | Type | Notes |
|---|---|---|
| `timeBucket` | timestamp | Start of the UTC bucket (ISO 8601). |
| `actorId` | string | Per-export pseudonym (16 hex chars); empty under `actor=none` and for calls made outside any user context. |
| `feature` | string | Product surface (`APPLICATION_COVER_LETTER`, `VALIDATION_CHECK`, `INTERVIEW_FEEDBACK`, …). Derived from the prompt template at write time. |
| `provider` | string | `AZURE_OPENAI`, `AZURE_AI_FOUNDRY`, `MISTRAL`, `MOCK`. |
| `model` | string | Deployment/model that actually served the call (after lane fallback). |
| `lane` | string | `MAIN`, `FAST`, `MID` — the lane that actually served the call. |
| `tier` | string | `FREE`, `PRO`, `PREMIUM`, or empty when unresolved. |
| `language` | string | Document language, allow-listed at write time (`de`/`en`/`fr`/`es`/`pt`/`it`). |
| `promptTokens` | integer | Empty when the provider reported no usage. |
| `completionTokens` | integer | Empty when unreported. |
| `totalTokens` | integer | `promptTokens + completionTokens`. |
| `cachedTokens` | integer | Prompt tokens served from the provider's cache. |
| `latencyMs` | integer | Rounded to the nearest 10 ms. |
| `success` | boolean | Whether the call returned a usable result. |
| `circuitState` | string | `CLOSED`, `OPEN`, `HALF_OPEN` at dispatch. |
| `errorKind` | string | Error **class** name on failure — never a message, which could echo prompt text. |
| `estimatedCostUsd` | float | Modelled from `llm-pricing.ts`; empty for unpriced models. |

Columns that exist in the live table and are deliberately **not** exported:
`id` (cuid — read for cursor pagination only), `actorHash`, `createdAt`.

---

## 4. Anonymisation transforms

Implemented in
[`llm-usage-export.service.ts`](../../apps/api/src/llm/usage/llm-usage-export.service.ts);
every one of them is covered by
[`llm-usage-export.unit.spec.ts`](../../apps/api/src/llm/__tests__/unit/llm-usage-export.unit.spec.ts).

1. **Explicit source column allow-list.** The exporter selects named columns, so
   a column added to `llm_usage_events` later cannot reach an export without
   someone adding it on purpose. The table itself never stores prompt or
   response content, and there is no `User` foreign key to follow.
2. **Row id dropped.** `id` is a cuid, which embeds a millisecond timestamp;
   exporting it would silently undo the bucketing.
3. **Timestamp bucketing.** `createdAt` is truncated to the start of its UTC
   hour, day or month. No sub-bucket timestamp leaves the system, which is what
   breaks the millisecond time-correlation described in §1.
4. **Latency rounding.** `latencyMs` is rounded to the nearest 10 ms so a single
   request cannot be fingerprinted against an external log line.
5. **Actor re-keying.** The stored `actorHash` is never exported. Under
   `actor=pseudonym` it is re-keyed with a random 32-byte salt generated for
   that export and discarded immediately after — so two exports cannot be joined
   to each other, and neither can be joined back to the live table. Under
   `actor=none` no actor value is emitted at all.
6. **k-anonymity.** A row that carries an actor is released only if its
   quasi-identifier group holds at least `k` **distinct actors**. The
   quasi-identifiers are `timeBucket`, `feature`, `tier`, `language`, `model` —
   the attributes an outsider could plausibly already know. Distinct *actors*,
   not rows: counting rows would let one heavy user's `k` calls pass as a crowd.
   Rows with no actor carry no personal data and are always released.
7. **Deterministic output order.** Rows are sorted by their exported column
   values only. Emitting them in database read order would leak the sub-bucket
   sequence of calls — part of what the bucketing removes — and would make the
   output depend on paging.
8. **CSV formula-injection neutralisation.** A cell starting with `=`, `+`, `-`,
   `@`, tab or CR is prefixed with `'`. No current column can produce one; the
   guard is there because these files get opened in Excel by reviewers.

### Residual risks (state these, don't hide them)

- Token counts, cost and latency are per-call measurements. A party that already
  holds a user's prompts could in principle match them.
- Under `actor=pseudonym`, per-actor grouping inside one file remains possible.
  Combined with outside knowledge of when a specific person used the product, a
  small `k` can be insufficient.
- An export is a point-in-time **copy**. The retention sweep and the
  account-deletion erasure hook act on the live table only — every copy has to
  be tracked and deleted separately (§8).

---

## 5. The two configurations we actually use

| Purpose | Parameters | Status of the artefact |
|---|---|---|
| Internal ML / analysis (per-actor sequences needed) | `actor=pseudonym&bucket=hour&k=5` | Pseudonymous personal data. Stays inside the company, on company-controlled storage. |
| External artefact (due diligence, data room, a model trained by a third party) | `actor=none&bucket=day&k=5` | No actor dimension, no sub-day timestamps, thin groups suppressed. |

`k=1` disables suppression entirely. The manifest says so in its `guarantees`
list ("k-anonymity is DISABLED") — if you see that line in a manifest attached
to an artefact that left the company, that is a finding.

---

## 6. Reproducibility

- Rows are read with a deterministic keyset order and emitted in a total order
  derived only from the exported columns, so the output does not depend on
  paging, on database plan choice, or on the read order.
- With `actor=none`, the same parameters over an unchanged, closed time window
  produce **byte-identical** output. This is the reproducibility claim to make
  in a data room.
- With `actor=pseudonym`, the *content* is identical but the pseudonyms (and
  therefore the row order among otherwise-equal rows) differ per export — by
  design, see §4.5. Two exports of the same window are not diff-able; that is
  the price of unlinkability.
- Windows must be closed (`from` and `to` both in the past) for the claim to
  hold: an open-ended export picks up rows written since the last run, and the
  retention sweep removes rows older than `LLM_USAGE_RETENTION_DAYS`.

---

## 7. Parquet

Not produced by the API — adding a Parquet writer to the backend would pull in a
heavyweight dependency for a job the consumer's tooling already does. Convert
the JSONL locally:

```bash
duckdb -c "COPY (SELECT * FROM read_json_auto('applo-llm-usage-2026-08.jsonl'))
           TO 'applo-llm-usage-2026-08.parquet' (FORMAT PARQUET);"
```

Keep the manifest next to the converted file; the conversion changes the
container, not the anonymity properties.

---

## 8. Handling a copy

An export is personal data unless it was produced with `actor=none` (§5), and
even then it is commercially sensitive. Therefore:

- Store it in company-controlled storage, never in a repository, an issue, or a
  chat message.
- Record who received it and when. GDPR erasure requests reach the live table
  automatically (`LlmUsageService.deleteEventsForActor`) but cannot reach a copy
  you handed out.
- Delete copies on the same cadence as the source retention window
  (`LLM_USAGE_RETENTION_DAYS`, default 90 days) unless there is a documented
  reason to keep one longer.
- Always ship the manifest with the data. A dataset without its manifest has no
  documented anonymisation parameters, and its guarantees cannot be checked.

---

## 9. Changing the export

The export schema is a published contract; treat a change like a migration.

1. Add the source column to `EXPORT_SOURCE_SELECT` **and** to
   `LLM_USAGE_EXPORT_COLUMNS` (the second one drives the CSV header, the JSONL
   key order and the manifest — they cannot drift apart).
2. Decide whether the new column is a quasi-identifier. If an outsider could
   plausibly know it about a person, add it to `QUASI_IDENTIFIERS` so
   k-anonymity accounts for it.
3. Bump `LLM_USAGE_EXPORT_SCHEMA_VERSION`.
4. Update §3 and §4 of this document, and extend the unit spec — the
   "never exports the row id, the raw timestamp or the stored actorHash" test is
   the regression guard for the whole guarantee set.

---

## Related

- [SECURITY_AUDIT_2026-08-13.md](./SECURITY_AUDIT_2026-08-13.md) — finding F11,
  the pseudonymity analysis this export answers to.
- [SECRETS_ROTATION.md](./SECRETS_ROTATION.md) — rotating `LLM_USAGE_HASH_SALT`
  (rotating it orphans older rows from the erasure hook; the retention sweep
  mops them up).
- [ARCHITECTURE.md](../../ARCHITECTURE.md) — where `LlmUsageEvent` sits in the
  data model.
