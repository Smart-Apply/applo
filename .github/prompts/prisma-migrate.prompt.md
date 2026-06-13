---
mode: 'agent'
description: 'Generate a forward-only Prisma migration for a schema change and regenerate the client via the sanitize-aware script.'
---

# Create a Prisma migration

Generate a migration for the current `apps/api/prisma/schema.prisma` change and regenerate
the Prisma client the **Smart Apply way**.

Migration name: `${input:migrationName:descriptive_snake_case_name}`

## Context that matters here

- Dev/prod DB is **Neon Postgres**. Two URLs in `apps/api/.env`:
  - `DATABASE_URL` — **pooled** (hostname contains `-pooler`); used by the app at runtime.
  - `DIRECT_URL` — **unpooled**; required by the Prisma CLI for migrate/seed (transaction-mode
    poolers don't support Prisma Migrate). Falls back to `DATABASE_URL` for local Docker.
- The client is generated through `apps/api/scripts/sanitize-prisma-client.js`. **Always**
  go through the workspace scripts below — a bare `prisma generate` skips the sanitize step
  and the API crashes at boot with `exports is not defined in ES module scope`.

## Steps

1. **Review the schema diff** first: `git diff apps/api/prisma/schema.prisma`. Confirm the
   change is what you intend and note whether it is **additive** or **destructive**.
2. **Generate the migration** (dev DB only):
   ```bash
   pnpm --filter @smart-apply/api prisma:migrate -- --name ${input:migrationName}
   ```
   (The `prisma:migrate` script runs `prisma migrate dev`.) This creates
   `apps/api/prisma/migrations/<timestamp>_${input:migrationName}/migration.sql` and
   regenerates the client.
3. **Regenerate the client explicitly if needed** (never bare `prisma generate`):
   ```bash
   pnpm --filter @smart-apply/api prisma:generate
   ```
4. **Review the generated `migration.sql`.** Make sure it does only what you expect.
5. **Commit** `schema.prisma` + the new `migration.sql` together (use `/commit`).

## Forward-only & destructive-change rules

- Migrations are **forward-only** — we do not write `down` migrations. Rollback is via Neon
  point-in-time restore (see [docs/security/MIGRATION_ROLLBACK.md](../../docs/security/MIGRATION_ROLLBACK.md)).
- For **destructive** changes (DROP / RENAME / type change), use **expand → migrate →
  contract** across two releases. Never DROP or RENAME a column in the same release as the
  code that stopped using it.
- **Never** run `prisma migrate reset` against anything but your local dev DB.
- Migrations run in prod/staging as a Fly **release command** (`prisma migrate deploy`)
  against each env's `DIRECT_URL` — you do not run deploy by hand.

## Never do

- A bare `prisma generate` / `prisma migrate` outside the `pnpm --filter @smart-apply/api`
  scripts (skips the sanitize step).
- `prisma migrate reset` on Neon (staging or prod).
- Committing the schema change without its `migration.sql`.
