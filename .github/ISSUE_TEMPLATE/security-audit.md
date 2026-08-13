---
name: Security audit
about: Run the 20-point security checklist against the current state of the repo
title: 'chore(security): security audit YYYY-MM-DD'
labels: security
assignees: ''
---

## Scope

<!-- e.g. "full repo" or "delta since the last audit, covering what issue #NNN and #MMM added" -->

## Checklist

Every item needs a verdict — `PASS`, `FAIL`, `PARTIAL`, or `N/A` — with a file:line
reference or an explicit note on why it can't be verified from the repo (e.g. an
operator-only action). Do not leave an item unchecked with no reasoning: an unexecutable
item still gets a documented verdict, not a skip.

- [ ] `.env` not committed to the repo; git history scanned; any exposed keys rotated
- [ ] No API keys in the frontend bundle; external calls only go through backend routes
- [ ] Tenant/row isolation is enforced and tested with a second, non-privileged account
      <!-- Applo is Prisma + Neon (no Postgres RLS) — see docs/security/SECURITY_AUDIT_2026-08-13.md §2
           row 3 for why "RLS per table" doesn't apply to this stack, and what the
           equivalent verification looks like (an IDOR e2e test with a real foreign account). -->
- [ ] Permissions are checked server-side, not just hidden in the frontend
- [ ] Rate limiting is active globally, tightened on login and on expensive/LLM endpoints
- [ ] No SQL string concatenation — parameterized queries / ORM only
- [ ] Input is validated server-side for body, query params, and headers
- [ ] No raw user HTML rendered without sanitizing; CSP header is set
- [ ] Passwords are hashed with argon2id (or bcrypt); no plaintext in logs
- [ ] Auth tokens live in httpOnly cookies, not localStorage
- [ ] The admin panel enforces auth + a role check, including on direct URL access
- [ ] CORS is restricted to concrete origins — no wildcard
- [ ] Email verification is enforced where it matters (state which endpoints, and why
      others are intentionally left open pre-verification, if any)
- [ ] IDs are not predictable (cuid/uuid, not autoincrement); an IDOR test with a foreign
      ID/account passes
- [ ] No full request body is persisted via spread — allowlisted fields only
- [ ] Webhook signatures are verified, compared timing-safely, and either carry a
      timestamp/expiry check or are deduplicated at the DB level
- [ ] No stack traces reach the client in production; source maps are not publicly served
- [ ] Dependencies are current — `pnpm audit` has no High/Critical findings reachable at
      runtime; Dependabot is active
- [ ] Password strength is enforced server-side; ideally checked against known-leaked
      password corpora
- [ ] File uploads are validated by magic bytes (not just client-supplied MIME type),
      size-limited, and stored under names that don't leak the original filename

### Split by app (only if the repo has more than one deployable)

Applo has two deployables with different infra — a check can be true for one and false
for the other:

- **`apps/api`** — Fly.io. Secrets are Fly secrets. Rate limiting is in-process
  (`@nestjs/throttler`), not edge-level.
- **`apps/web`** — Cloudflare Workers (`opennextjs-cloudflare`). Secrets go through
  `wrangler secret`. State the split explicitly rather than assuming one infra story
  for the whole repo.

## Acceptance criteria

- [ ] All checklist items above have a verdict and evidence (or a documented reason they
      don't apply)
- [ ] Every actionable finding is written up with severity, location, data flow, impact,
      and remediation — as its own linked sub-issue if it isn't fixed in the audit PR
      itself
- [ ] Confirmed-critical findings (secrets, auth, tenant isolation, IDOR) are fixed and
      re-verified before the audit PR merges, not just documented
- [ ] Any key that was ever exposed (not just currently tracked) is rotated, not merely
      removed from history
- [ ] IDOR and mass-assignment checks are reproducible — a runnable test or an exact
      command sequence, not prose
- [ ] Secret scanning and Dependabot are confirmed active on the repository — check it,
      don't assume: `gh api repos/:owner/:repo -q '.security_and_analysis'`
- [ ] Lint is clean for every workspace the audit touched (`pnpm --filter @applo/api lint`,
      `pnpm --filter @applo/web lint`). The repo carries a known warning baseline, so
      state the baseline and confirm no *new* errors or warnings rather than claiming
      zero — and say so explicitly in the audit rather than omitting it
