---
mode: 'agent'
description: 'Run ESLint --fix on the affected workspace and drive it to zero errors AND zero warnings, respecting Applo lint policy.'
---

# Fix lint

Bring the affected workspace to a clean lint state. Applo policy: **new code lands
with 0 ESLint errors AND 0 warnings** — warnings are treated as errors for anything you author.

Workspace to lint: `${input:workspace:api | web | both}`

## Run the linters

- API: `pnpm --filter @applo/api lint`
- Web: `pnpm --filter @applo/web lint`
- Both: run each in turn.

Apply autofixes where safe (`eslint --fix` via the workspace `lint` script or
`pnpm --filter <ws> lint -- --fix`), then re-run to confirm a clean exit.

## Fix by hand, the Applo way

- **Unused identifiers**: remove unused imports/locals. If a parameter is required by a
  signature you don't control (route handlers, callback shapes), prefix it with `_` —
  `eslint.config.mjs` ignores leading-underscore identifiers project-wide. Do the same for a
  destructured prop kept only for API compatibility.
- **No `any` to silence the compiler.** Use `unknown` + a type guard, or the real type.
- **`react-hook-form` (web)**: never call `form.watch(...)` inside a component body — the
  React Compiler trips `react-hooks/incompatible-library` and silently disables memoisation.
  Use `useWatch({ control, name })` instead.
- **`eslint-disable`**: only when the suppression is *behaviour-correct* (e.g. an SSE effect
  that intentionally depends on `application?.status` rather than the whole object to avoid
  stream thrash). Add a one-line comment **above** the disable explaining why the rule's
  autofix would break behaviour. Otherwise, fix the root cause — don't blanket-disable.

## Confirm

- Re-run the workspace `lint` and confirm a **clean exit (0 errors, 0 warnings)**.
- If you changed runtime behaviour to satisfy a rule, sanity-check it still does the right
  thing (don't "fix" a warning by breaking logic).
- Do **not** reformat or touch code unrelated to the lint findings.

## Never do

- Ship code with new ESLint errors **or** warnings.
- Silence types with `any`.
- `form.watch(...)` inside a component — use `useWatch({ control, name })`.
- A blanket `eslint-disable` without a behaviour-correct justification comment.
