---
mode: 'agent'
description: 'Stage changes and create a Conventional Commit on a short-lived feature branch (trunk-based, squash-merge safe).'
---

# Commit my changes

Create one focused [Conventional Commit](https://www.conventionalcommits.org/) for the
work in progress, following Applo's trunk-based workflow.

## First, gather the live state

Run these in the terminal and read the output before doing anything else:

- `git status --short --branch` — current branch + what's staged/unstaged/untracked.
- `git diff --staged` and `git diff` — the actual changes.
- `git log --oneline -10` — recent commit style on this branch.

## Branch safety (do this BEFORE the first commit)

- There is exactly **one** long-lived branch: `main`. **Never** commit directly to it.
- If `git status` shows you are on `main`, create a short-lived branch FIRST:
  `git checkout -b <type>/<short-thing>` — then commit there.
- Branch prefixes: `feat/` · `fix/` · `chore/` · `docs/` · `ci/` · `test/` · `refactor/` · `perf/`.
- One concern per branch/commit. If the diff mixes unrelated changes (e.g. a CI tweak
  **and** a feature), stage and commit them separately, or stop and ask which to commit.

## Compose the message

Format: `<type>(<scope>): <summary>` — imperative, ≤ 72 chars, no trailing period.

- `feat:` → minor bump · `fix:` → patch · `feat!:` or a `BREAKING CHANGE:` footer → major.
- `chore:` `docs:` `ci:` `refactor:` `test:` `perf:` → no bump, still in the CHANGELOG.
- Scope = the touched area: `auth`, `profile`, `applications`, `pdf`, `interviews`,
  `mailbox-sync`, `web`, `api`, `ci`, etc.
- `release-please` parses these to bump SemVer + generate the CHANGELOG, so be accurate.

## Paired-change guardrails (check the staged diff)

- **Lockfile pairing**: if `package.json` changed, `pnpm-lock.yaml` MUST change in the
  same commit (and vice versa). If only one is staged, run `pnpm install` and stage the
  lockfile before committing — CI's `lint-and-typecheck` job blocks on lockfile drift.
- **Prisma pairing**: if `apps/api/prisma/schema.prisma` changed, the matching
  `apps/api/prisma/migrations/**/migration.sql` should be in the same commit (use the
  `/prisma-migrate` prompt to generate it).
- **Doc sync**: if this is an architecture change (new module/route, schema change,
  pluggable provider, new third-party service, deploy topology), `README.md` +
  `ARCHITECTURE.md` + `.github/copilot-instructions.md` must be updated in the same
  change set. Flag it if they're missing.

## Then

- Stage intentionally with `git add <paths>` (avoid blanket `git add -A` if untracked
  junk is present — never stage `.env`, `*-secrets.env`, `*.bak`, or anything gitignored).
- Commit with the composed message.
- **Never** use `--no-verify`, **never** `git push --force`, **never** push to `main`.
- Report the branch name, the commit subject, and whether a PR is the next step
  (`/open-pr`).

## Never do

- `wip`, `update`, `fixed bug`, or any non-Conventional-Commit message.
- Grab-bag commits spanning multiple concerns.
- Committing secrets or gitignored files.
