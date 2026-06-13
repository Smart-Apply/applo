---
description: Run ESLint --fix on the affected Smart Apply workspace and drive it to zero errors AND zero warnings.
argument-hint: [api | web | both]
allowed-tools: Bash(pnpm *) Read Grep Edit
---

## Task
Lint and fix the affected workspace(s). Target: $ARGUMENTS (default: infer from the changed files).

Smart Apply's lint policy: **new code MUST land with 0 ESLint errors AND 0 warnings.** CI only fails on errors, but warnings accumulate as untracked tech debt — once a workspace reached 74 warnings before one new error tipped the build red and blocked every PR. Treat warnings as errors for anything authored here.

1. Run the workspace lint:
   - web → `pnpm --filter @smart-apply/web lint`
   - api → `pnpm --filter @smart-apply/api lint`
   - both → run each.
2. Auto-fix what's safe, then hand-fix the rest. Specifically:
   - No `any` to silence the compiler — use `unknown` + a type guard.
   - Remove unused imports/locals/params. If a parameter is required by a signature you don't control (route handlers, callback shapes), prefix it with `_` — the config ignores leading-underscore identifiers project-wide.
   - **Never** `form.watch(...)` from react-hook-form inside a component body — use `useWatch({ control, name })`. Bare `watch()` trips `react-hooks/incompatible-library` under the React Compiler.
   - Don't add `eslint-disable` unless the suppression is behaviour-correct; if so, add a one-line comment above it explaining why the rule's auto-fix would break behaviour.
3. Re-run lint and confirm a clean exit (0 errors, 0 warnings) before reporting done.

Don't edit files you weren't asked to touch just to satisfy lint. Report any warning you intentionally leave, with justification.
