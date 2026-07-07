---
mode: 'agent'
description: 'Push the current feature branch and open a pull request following the trunk-based flow (lint + lockfile + doc-sync gates, Conventional-Commit title).'
---

# Open a pull request

Push the current short-lived branch and open a PR into `main`, following Applo's
trunk-based, squash-merge workflow.

## First, gather the live state

Run these and read the output before proceeding:

- `git status --short --branch` — confirm the branch and that nothing important is unstaged.
- `git rev-parse --abbrev-ref HEAD` — the branch name (must NOT be `main`).
- `git log main..HEAD --oneline` — the commits that will land in this PR.
- `git diff main...HEAD --stat` — the file-level scope of the PR.

## Pre-flight gates (block the PR until these pass)

1. **Not on `main`.** If `HEAD` is `main`, stop — create a `feat/`·`fix/`·`chore/`·`docs/`·
   `ci/`·`test/` branch, move the commits onto it, then continue.
2. **Lint clean on touched workspaces.** If the diff touches `apps/api`, run
   `pnpm --filter @applo/api lint`; if it touches `apps/web`, run
   `pnpm --filter @applo/web lint`. New code must land with **0 errors AND 0 warnings**.
3. **Lockfile sync.** If `package.json` changed anywhere, confirm `pnpm-lock.yaml` is in the
   diff. Run `pnpm install --lockfile-only` and confirm it produces no diff — CI fails on drift.
4. **Doc sync.** If this is an architecture change, confirm `README.md` + `ARCHITECTURE.md` +
   `.github/copilot-instructions.md` are part of the diff. If not, add them before opening.
5. **Migration present.** If `schema.prisma` changed, confirm the generated `migration.sql`
   is committed (forward-only — no `down` migrations).

## Push + open

- Push with upstream tracking: `git push -u origin <branch>`. **Never** `--force` to a
  shared branch; **never** push to `main`.
- Open the PR (via `gh pr create` or the GitHub PR tooling).
- **PR title MUST be a Conventional Commit** — squash-merge uses it as the final commit
  subject that `release-please` parses (e.g. `feat(profile): add languages section`).
- PR body: a short **what + why**, the testing done, and any follow-ups. Link issues with
  `Closes #NNN` when applicable.

## After opening

- CI (`ci.yml`) runs lint + lockfile check + unit tests (non-blocking) + a Neon migration
  dry-run (only when the schema changed). Wait for green checks before merging.
- Merge strategy is **squash only** (linear history is required for `release-please`).
- Delete the branch after merge.

## Never do

- Direct push to `main`, `git push --force` to `main`, or `--no-verify`.
- A PR title that isn't a Conventional Commit.
- A grab-bag PR covering multiple unrelated concerns.
