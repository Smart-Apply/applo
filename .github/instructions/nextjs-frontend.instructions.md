---
applyTo: 'apps/web/src/**'
description: 'Recipe + guardrails for building a Next.js (App Router) feature in the Applo web app (server components, the typed api client, TanStack Query hooks, react-hook-form + Zod, shadcn/ui, German-first profession-neutral copy).'
---

# Applo web — feature recipe

These rules apply when editing anything under `apps/web/src/`. They complement (don't
replace) the global rules in [.github/copilot-instructions.md](../copilot-instructions.md).
The web app is **Next.js 16 App Router + React 19 with the React Compiler** — that last part
drives several of the hard rules below.

## Routing & components

- App Router only (`apps/web/src/app/`). Use the existing route groups: `(auth)`,
  `(dashboard)`. **No** Pages Router.
- **Server components by default.** Add `'use client'` only when the component needs state,
  effects, browser APIs, or event handlers. Keep data-only and layout components on the server.
- Keep client bundles lean — push data fetching and heavy logic up to the server where possible.

## Data access (never raw fetch)

All server state goes through the typed `api` client and TanStack Query — there is **no raw
`fetch()` in components**.

- The client is `export const api` in
  [apps/web/src/lib/api-client.ts](../../apps/web/src/lib/api-client.ts), namespaced by
  domain: `api.profile.get()`, `api.profile.update(dto)`, `api.subscription.get()`, etc.
  Add new calls there, typed against `apps/web/src/types`.
- Wrap reads/writes in hooks under `apps/web/src/hooks/` following the existing pattern:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useThings() {
  return useQuery({ queryKey: ['things'], queryFn: () => api.things.list() });
}

export function useCreateThing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateThingDto) => api.things.create(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['things'] }),
  });
}
```

- The client sends `credentials: 'include'` and handles the CSRF header — don't re-implement
  auth/CSRF in components.

## Forms

- `react-hook-form` + Zod (`@hookform/resolvers/zod`) for every form.
- **React Compiler landmine — never call `form.watch(...)` inside a component body.** It
  returns an unstable ref and trips `react-hooks/incompatible-library`, silently disabling
  memoisation for the whole component. Use `useWatch({ control, name })` instead.

## UI

- Compose from **shadcn/ui** (Radix) components in `apps/web/src/components/ui/`. Add a
  missing primitive with `pnpm dlx shadcn@latest add <name>` — don't hand-roll one that
  shadcn provides.
- Icons from `lucide-react`. Toasts via `sonner`. Merge classes with the existing `cn()`
  helper from `@/lib/utils`.
- Tailwind v4 — use utility classes; don't introduce a competing styling system.

## Copy & domain-neutrality (important)

Applo serves **every profession**, not just tech. All user-facing copy:

- Is **German-first** (the product UI is German).
- Uses **profession-neutral** examples and placeholders — e.g.
  `z.B. Projektmanager, Krankenpfleger, Vertriebsleiter`, never `z.B. Senior Software Engineer`.
- Uses generic section labels ("Fähigkeiten", "Erfahrung", "Projekte"), not IT-centric ones.
- Avoids defaulting examples to React/TypeScript/Cloud.

## When you finish

- Lint clean: `pnpm --filter @smart-apply/web lint` → **0 errors, 0 warnings**. Remove unused
  imports/vars; `_`-prefix params you must keep for a signature; never `any` (use `unknown`
  + a guard).
- `pnpm --filter @smart-apply/web build` should still pass (validates every route compiles).
- If you added a route group, page, or changed the data flow, update `README.md` +
  `ARCHITECTURE.md` + `.github/copilot-instructions.md` (Frontend Structure section) in the
  same change set — doc sync is mandatory.
