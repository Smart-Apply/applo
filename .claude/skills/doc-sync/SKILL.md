---
name: doc-sync
description: Applo's mandatory documentation-sync rule. Apply automatically whenever a change touches architecture — a backend module, frontend route group, Prisma model, pluggable provider (STORAGE_DRIVER/JOBS_DRIVER/LLM_PROVIDER/cache/email), the generation pipeline, a third-party service, a major dependency, an auth flow, an API endpoint, or deployment topology.
user-invocable: false
---

# Documentation sync is mandatory

When a change alters architecture, you MUST update these three files **in the same change set** — doc drift is treated as a bug:

1. `README.md`
2. `ARCHITECTURE.md`
3. `.github/copilot-instructions.md` (keep its Tech Stack, Backend Modules, Data Model, API Endpoints, and Env Variables sections accurate)

## Triggers (non-exhaustive)
- Adding/removing/renaming a backend module or frontend route group
- Adding/removing/changing a Prisma model or significant schema change
- Adding/changing a pluggable provider (`STORAGE_DRIVER`, `JOBS_DRIVER`, `LLM_PROVIDER`, cache, email)
- Changing the application-generation pipeline (LLM orchestration, PDF, queue, SSE)
- Adding/removing a third-party service (Sentry, Resend, Upstash, Cloudflare, Azure)
- Major dependency upgrades affecting the stack (Next.js, NestJS, Prisma, React, Tailwind)
- New auth flows (OAuth provider, 2FA, refresh-token strategy, sessions)
- New or breaking API endpoints
- Deployment topology changes (Fly.io, Cloudflare Workers, CI/CD)

## Related sync rules
- **New secret** → add a placeholder to `apps/api/.env.example`, document the source in `docs/security/SECRETS_ROTATION.md`, and tell the user to set it via `flyctl secrets set` / `wrangler secret put`. Never commit the real value.
- **Changed `fly.prod.toml` / `fly.staging.toml`, env defaults, or provider behaviour** → also refresh the copilot-instructions Tech Stack / Env Variables sections.

Never ship an architecture change without the matching doc updates in the same PR.
