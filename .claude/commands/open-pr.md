---
description: Push the current feature branch and open a PR following Applo's trunk-based flow (lint + lockfile + doc-sync checks, Conventional-Commit PR title for squash-merge).
argument-hint: [optional PR title]
disable-model-invocation: true
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *) Read Grep
---

## Current state
- Branch: !`git branch --show-current`
- Commits ahead of main: !`git log origin/main..HEAD --oneline`
- Changed files vs main: !`git diff --name-only origin/main...HEAD`

## Task
Open a pull request for the current branch. Optional title from me: $ARGUMENTS

Applo runs **trunk-based** with one long-lived branch (`main`) and **squash-merge only**, so the PR title becomes the squashed commit message.

1. **Refuse to continue on `main`.** If the branch is `main`, stop and tell me to move the work to a `feat/`|`fix/`|`chore/`|`docs/`|`ci/`|`test/` branch first.
2. **Pre-flight (block the PR on failures):**
   - If `apps/web/**` changed: `pnpm --filter @smart-apply/web lint` → must exit clean (0 errors AND 0 warnings).
   - If `apps/api/**` changed: `pnpm --filter @smart-apply/api lint`.
   - If any `package.json` changed: confirm the matching `pnpm-lock.yaml` change is committed in this branch (CI's `lint-and-typecheck` job blocks on lockfile drift).
   - If `apps/api/prisma/schema.prisma` changed: confirm a `migration.sql` exists for it.
3. **Doc-sync gate:** if this branch changes architecture (new module/route group, Prisma model, pluggable provider, endpoint, deploy topology, major dep), confirm `README.md`, `ARCHITECTURE.md`, and `.github/copilot-instructions.md` were updated in the same branch. Treat missing doc updates as a blocker.
4. Push with `git push -u origin <branch>` (never `--force`, never `--no-verify`).
5. Create the PR with `gh pr create`. The **title MUST be a Conventional Commit** (`<type>(<scope>): <summary>`) because squash-merge feeds it to `release-please`. Write a concise body: what changed, why, and how it was verified.

**Never:** push to `main`, `git push --force`, `--no-verify`, or propose adding a `develop` / `staging` / `release/*` branch.
