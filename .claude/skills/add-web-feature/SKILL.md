---
name: add-web-feature
description: Recipe for building a Next.js App Router feature in apps/web. Use when adding a page, route group, form, or data hook to the Applo frontend, or when asked to "add a page", "build a frontend feature", or "wire up the UI".
---

# Add a Next.js feature (Applo web)

Next.js 16 App Router + React 19 (React Compiler on) + Tailwind v4 + shadcn/ui.

## Structure
- App Router only — no Pages Router. Pages live under `apps/web/src/app/`, grouped like `(auth)/`, `(dashboard)/`.
- **Server Components by default.** Add `'use client'` only when the component needs state, effects, or browser APIs.

## Data fetching
- Server state goes through **TanStack Query** with the existing client: `import { api } from '@/lib/api-client'`. **No raw `fetch()` in components** — `api` handles cookies, CSRF, and silent token refresh. (`authenticatedFetch` is the escape hatch for streaming/binary like PDF downloads.)
- Co-locate query/mutation hooks under `apps/web/src/hooks/` (see `use-applications.ts`, `use-job-postings.ts`). Use optimistic updates where the existing hooks do.

## Forms
- `react-hook-form` + Zod via `@hookform/resolvers`.
- **Never call `form.watch(...)` inside a component body** — use `useWatch({ control, name })`. Bare `watch()` returns an unstable ref and trips `react-hooks/incompatible-library` under the React Compiler, silently disabling memoisation for the whole component.

## UI
- Add shadcn/ui primitives with `pnpm dlx shadcn@latest add <name>` (don't hand-roll Radix wrappers).
- Icons from `lucide-react`. Compose class names with `cn()` from `@/lib/utils`.
- Sanitize any user- or LLM-authored HTML you render with `isomorphic-dompurify`.

## Constraints
- TypeScript strict — no `any`. Prefix deliberately-unused identifiers with `_`.
- 0 ESLint errors AND warnings — run `pnpm --filter @applo/web lint` before finishing.
- Verify the build compiles: `pnpm --filter @applo/web build`.
- User-facing copy is German-first and **profession-neutral** — placeholders like "z.B. Projektmanager, Krankenpfleger, Vertriebsleiter", never IT-only examples.
