---
description: Stage and create a Conventional Commit on a short-lived feature branch. Enforces Applo's trunk-based, branch-first, squash-merge discipline.
argument-hint: [optional commit summary]
disable-model-invocation: true
allowed-tools: Bash(git *) Read Grep
---

## Current state
- Branch: !`git branch --show-current`
- Short status: !`git status --short`
- Staged stat: !`git diff --cached --stat`
- Unstaged stat: !`git diff --stat`

## Task
Create a clean Conventional Commit for the current changes. Optional hint from me: $ARGUMENTS

Follow Applo's repo discipline exactly:

1. **Branch first — never commit on `main`.** If the current branch is `main`, STOP and create a short-lived branch before committing: `git checkout -b <type>/<thing>`. Pick the type from the change (`feat` / `fix` / `chore` / `docs` / `ci` / `test`). Branch protection rejects direct commits to `main`, and a commit that lands on local `main` has to be reset + cherry-picked to recover.
2. **One concern per commit.** If the changes span multiple concerns, propose a split and stage only the files for this commit with `git add <paths>`.
3. **Conventional Commits format:** `<type>(<scope>): <summary>` — e.g. `feat(profile): add languages section`, `fix(auth): refresh token race`. `release-please` parses these to bump SemVer + write the CHANGELOG, so the prefix is load-bearing:
   - `feat:` → minor, `fix:` → patch, `feat!:` or a `BREAKING CHANGE:` footer → major.
   - `chore:` / `docs:` / `ci:` / `refactor:` / `test:` / `perf:` → no bump, still in CHANGELOG.
4. **Paired changes must land together:** if `package.json` changed, stage the matching `pnpm-lock.yaml` change too (and vice versa). If `apps/api/prisma/schema.prisma` changed, stage the generated `migration.sql`.
5. Show me the proposed message and the exact files being committed, then run `git add` + `git commit`.

**Never:** `wip` / `update` / `fixed bug` messages, `--no-verify`, `--amend` on pushed commits, or any push to `main`. Do not push — use `/open-pr` for that.
