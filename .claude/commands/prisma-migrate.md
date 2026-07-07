---
description: Generate a forward-only Prisma migration for the Applo API and regenerate the client with the required sanitize step.
argument-hint: <descriptive_migration_name>
disable-model-invocation: true
allowed-tools: Bash(pnpm *) Bash(git *) Bash(rm *) Read Grep
---

## Task
Create and apply a Prisma migration named `$ARGUMENTS` against the **local** dev database.

These rules have caused real production incidents — follow them exactly:

1. **Generate via the workspace script, not bare prisma:**
   `pnpm --filter @applo/api prisma:migrate -- --name $ARGUMENTS`
   (this is `prisma migrate dev`; the Prisma CLI uses `DIRECT_URL`, the unpooled Neon URL — transaction-mode poolers can't run Migrate. `DIRECT_URL` falls back to `DATABASE_URL` for local Docker Postgres.)
2. **Regenerate the client the sanitized way — NEVER bare `prisma generate` / `npx prisma generate`:**
   `pnpm --filter @applo/api prisma:generate`
   Bare generate skips `apps/api/scripts/sanitize-prisma-client.js`. Without it `nest start` crashes with `ReferenceError: exports is not defined in ES module scope`. If you hit that, also `rm -rf dist/apps/api` before restarting.
3. **Forward-only.** We never write `down` migrations — rollback is Neon point-in-time-restore. Commit the generated `migration.sql`.
4. **Destructive changes (DROP / RENAME / type change) use expand → migrate → contract across two releases.** Never DROP a column in the same release as the code that stopped using it.
5. **Never** run `prisma migrate reset` against anything but your local dev DB.

After generating, show me the `migration.sql` and remind me to commit it alongside the `schema.prisma` change. If a new model/significant schema change was added, flag the `README.md` + `ARCHITECTURE.md` + `.github/copilot-instructions.md` (Data Model) doc-sync requirement.
