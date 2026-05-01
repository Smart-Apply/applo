# Infrastructure Migration Roadmap

> **Goal:** Move Smart Apply off Azure-centric infrastructure to a cheaper, more flexible stack while preserving GDPR/EU data residency.
>
> **Target stack:** Fly.io (compute) + Neon (Postgres) + Cloudflare R2 (object storage) + QStash (queue, already in use) + Azure OpenAI/Foundry (LLM, kept for GDPR)

---

## Migration Order (do in this sequence)

| # | Step | Status | Effort | Risk | Saves/mo |
|---|---|---|---|---|---|
| 1 | **Neon (Postgres)** | 🟡 In progress | ~1 h | Low | ~$25–50 |
| 2 | **Cloudflare R2 (object storage)** | ⬜ Not started | ~1–2 h | Low | ~$5–15 |
| 3 | **Fly.io (backend host)** | ⬜ Not started | ~1 day | Medium | ~$30–80 |
| 4 | **Foundry → direct chat completions** (optional) | ⬜ Not started | ~2 h | Low | ~10× faster URL parsing, –200 LOC |
| 5 | **Doppler (secrets)** (optional) | ⬜ Not started | ~30 min | Low | $0 (DX win) |

**Why this order:** Migrate **data layer (DB + storage) before compute**. Once stateful services are on managed providers, the host becomes trivially portable. Each step is independently valuable and reversible.

---

## Step 1 — Neon (Postgres) 🟡 IN PROGRESS

### What's done ✅
- Neon project created (region: `eu-central-1` Frankfurt)
- Pooled connection string obtained
- Codebase already supports Neon (uses `PrismaPg` adapter + `pg.Pool` in `apps/api/src/prisma/prisma.service.ts`)

### ⚠️ Security action required
A Neon password was leaked in chat. **Rotate it immediately:**
1. Neon dashboard → **Roles** → `neondb_owner` → **Reset password**
2. Copy the new connection string

### Remaining work

#### 1.1 Get the direct (unpooled) URL
The pooled URL ends with `-pooler.c-3.eu-central-1.aws.neon.tech`. The direct URL is the **same hostname without `-pooler`**. You need both:
- **Pooled** → app runtime (`DATABASE_URL`)
- **Direct** → Prisma migrations (`DIRECT_URL`)

Or in Neon dashboard: toggle **Connection pooling** off to reveal it.

#### 1.2 Update Prisma schema to support `directUrl`
Edit [apps/api/prisma/schema.prisma](../../apps/api/prisma/schema.prisma):

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

#### 1.3 Update local env
Edit `apps/api/.env`:
```bash
DATABASE_URL="postgresql://neondb_owner:NEW_PW@ep-red-heart-aljqrpfj-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://neondb_owner:NEW_PW@ep-red-heart-aljqrpfj.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

#### 1.4 Update `.env.example`
Document both vars in [apps/api/.env.example](../../apps/api/.env.example).

#### 1.5 Push schema to Neon
```bash
cd apps/api
npx prisma migrate deploy
npx prisma db seed   # optional: seed demo data
npx prisma studio    # verify in GUI
```

#### 1.6 Smoke test locally
```bash
npm run start:dev
# In another terminal:
curl http://localhost:3000/health
npm run test:e2e
```

#### 1.7 Migrate prod data (if needed)
Skip if prod has only demo data. Otherwise:
```bash
pg_dump --no-owner --no-acl --data-only \
  "postgresql://USER:PASS@OLD_AZURE_PG_HOST/smartapply?sslmode=require" \
  > backup.sql

psql "$DIRECT_URL" < backup.sql
```

#### 1.8 Cut over production
- Update prod env vars (`DATABASE_URL`, `DIRECT_URL`) on the Azure VM
- Restart the backend
- Monitor Sentry + Neon dashboard for 24–48 h
- Then **delete Azure Postgres Flexible Server**

#### 1.9 Update docs
Per the **Documentation Sync** rule in `copilot-instructions.md`:
- Update `README.md` (mention Neon instead of Azure Postgres)
- Update `ARCHITECTURE.md`
- Update `copilot-instructions.md` (Tech Stack → Backend section)

### Neon gotchas
| Issue | Mitigation |
|---|---|
| Cold start ~500ms after idle | App keeps pool warm (irrelevant for HTTP API). For zero cold starts: paid "Always-on". |
| Pooled URL doesn't support LISTEN/NOTIFY, prepared statements | Not used. Migrations use `directUrl`. |
| Free tier: 0.5 GB storage, 191 compute hours/mo | Sufficient for MVP. Upgrade to Launch ($19/mo) when needed. |
| `?sslmode=require&channel_binding=require` is mandatory | Already present in Neon-provided URLs. |

---

## Step 2 — Cloudflare R2 (Object Storage)

**Replaces:** Azure Blob Storage (and/or AWS S3)
**Why:** S3-compatible API, **zero egress fees**, ~$0.015/GB.

### Tasks

#### 2.1 Cloudflare setup
- Create R2 bucket: `smartapply-prod` (and `smartapply-dev` for local)
- Generate R2 API token with Object Read & Write scope
- Note the S3 endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

#### 2.2 Add R2 storage provider
In `apps/api/src/storage/`, add an `r2.provider.ts` mirroring the existing pattern. R2 is S3-compatible, so use `@aws-sdk/client-s3` (already a dependency):

```ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
```

#### 2.3 Wire into the storage factory
Extend `STORAGE_DRIVER` enum in `apps/api/src/config/` to accept `r2`. Register the new provider in `storage.module.ts`.

#### 2.4 Add env vars
```bash
STORAGE_DRIVER=r2
R2_ACCOUNT_ID=<account-id>
R2_ACCESS_KEY_ID=<key>
R2_SECRET_ACCESS_KEY=<secret>
R2_BUCKET=smartapply-prod
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://pub-xxx.r2.dev   # optional, if exposing via R2 public bucket
```

#### 2.5 Migrate existing PDFs
Use [`rclone`](https://rclone.org/):
```bash
rclone copy azure:smartapply r2:smartapply-prod --progress
```

#### 2.6 Replace SAS URLs with presigned R2 URLs
Application download endpoints (`/applications/:id/files`) already return signed URLs from the storage abstraction — should work transparently.

#### 2.7 Cut over and decommission
- Set `STORAGE_DRIVER=r2` in prod
- Verify downloads work
- Delete Azure Storage Account after 1 week

#### 2.8 Update docs (`README.md`, `ARCHITECTURE.md`, `copilot-instructions.md`)

---

## Step 3 — Fly.io (Backend Host)

**Replaces:** Azure VM (and the planned Azure Container Apps target)
**Why:** Cheaper at MVP scale (~$2–10/mo), Docker-native, multi-region, autoscaling, scale-to-zero option.

**Prerequisite:** Steps 1 & 2 complete (no Azure-internal data dependencies left).

### Tasks

#### 3.1 Install Fly CLI & sign up
```bash
brew install flyctl
fly auth signup
```

#### 3.2 Create `fly.toml` for the API
At repo root or `apps/api/fly.toml`. Reference the existing `infra/Dockerfile`:

```toml
app = "smart-apply-api"
primary_region = "fra"   # Frankfurt (EU/GDPR)

[build]
  dockerfile = "../../infra/Dockerfile"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "suspend"   # save money during idle
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  size = "shared-cpu-1x"
  memory = "1gb"

[checks.health]
  type = "http"
  port = 3000
  path = "/health"
  interval = "15s"
  timeout = "5s"
```

#### 3.3 Set secrets
```bash
fly secrets set \
  DATABASE_URL="postgresql://...neon...?sslmode=require" \
  DIRECT_URL="postgresql://...neon-direct...?sslmode=require" \
  JWT_SECRET="$(openssl rand -base64 64)" \
  JWT_REFRESH_SECRET="$(openssl rand -base64 64)" \
  R2_ACCESS_KEY_ID=... \
  R2_SECRET_ACCESS_KEY=... \
  STORAGE_DRIVER=r2 \
  JOBS_PROVIDER=qstash \
  QSTASH_TOKEN=... \
  AZURE_OPENAI_API_KEY=... \
  AZURE_OPENAI_ENDPOINT=... \
  CORS_ORIGINS=https://your-frontend.com \
  RESEND_API_KEY=... \
  SENTRY_DSN=...
```

#### 3.4 Verify Puppeteer in Docker
The current `infra/Dockerfile` installs Chromium — confirm `PUPPETEER_EXECUTABLE_PATH` is set. Test locally:
```bash
docker build -f infra/Dockerfile -t smart-apply-api .
docker run --rm -p 3000:3000 --env-file apps/api/.env smart-apply-api
```

#### 3.5 First deploy
```bash
fly deploy
fly logs
fly status
```

#### 3.6 Update QStash webhook URL
In your QStash dashboard, point job webhooks to the new Fly URL: `https://smart-apply-api.fly.dev/jobs/...`

#### 3.7 DNS cutover
- Set DNS TTL low (60s) a day in advance
- Point `api.yourdomain.com` to Fly:
  ```bash
  fly certs create api.yourdomain.com
  ```
- Update `NEXT_PUBLIC_API_URL` in Cloudflare Workers (`wrangler secret put`)

#### 3.8 Decommission Azure VM
After 48 h of stable Fly traffic + clean Sentry → delete VM, public IP, NSG, etc.

#### 3.9 Update CI/CD
Replace ACR/ACA workflow in `.github/workflows/` with `fly deploy`:
```yaml
- uses: superfly/flyctl-actions/setup-flyctl@master
- run: flyctl deploy --remote-only
  env:
    FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

#### 3.10 Update docs (`README.md`, `ARCHITECTURE.md`, `copilot-instructions.md`, `docs/guides/AZURE_DEPLOYMENT.md` → archive or rewrite)

---

## Step 4 — Foundry Agents → Direct Chat Completions (Optional)

**Why:** The Azure AI Foundry Agents API is overkill for single-shot URL parsing. Direct chat completions with structured outputs are ~10× faster and ~200 LOC simpler. **Keep Foundry as the LLM endpoint** (GDPR), drop the agent abstraction.

### Tasks

#### 4.1 Replace agent code in `apps/api/src/job-postings/` (and `apps/api/src/agents/`)
Use direct Azure OpenAI chat completions with `response_format: { type: 'json_schema', ... }`:

```ts
const html = await fetch(url).then(r => r.text());
const cleaned = stripHtml(html); // cheerio
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini', // your Foundry deployment name
  messages: [{ role: 'user', content: `Extract job posting from:\n${cleaned}` }],
  response_format: { type: 'json_schema', json_schema: jobPostingSchema },
});
```

Or use the **Vercel AI SDK** (`ai` + `@ai-sdk/azure`) for cleaner Zod-based schemas.

#### 4.2 Remove `@azure/ai-agents` dependency
```bash
cd apps/api
npm uninstall @azure/ai-agents
```

#### 4.3 Clean up env vars
Remove `AZURE_AI_FOUNDRY_*` if no longer used (or keep if you still want the deployment isolated from cover-letter calls).

#### 4.4 Delete `apps/api/src/agents/` if it becomes empty

#### 4.5 Update docs (`AGENT_URL_PARSER.md`, `AZURE_AI_FOUNDRY_AGENTS.md` → archive)

---

## Step 5 — Doppler (Secrets) (Optional)

**Why:** Single source of truth for env vars across Fly, Cloudflare, GitHub Actions, local dev. Audit logs, rotation, free for ≤5 users.

**Skip if:** Solo dev — Fly secrets + Cloudflare secrets + GitHub Actions secrets are fine.

### Tasks

#### 5.1 Sign up at [doppler.com](https://doppler.com)
Free Developer plan.

#### 5.2 Create project & environments
`smart-apply` with `dev`, `staging`, `prod`.

#### 5.3 Import existing `.env`
```bash
doppler import --path apps/api/.env
```

#### 5.4 Sync to platforms
- **Fly.io:** `doppler integrations` → connect Fly → auto-syncs secrets
- **Cloudflare Workers:** Doppler GitHub Action writes to `wrangler` secrets on deploy
- **GitHub Actions:** Use `dopplerhq/cli-action`

#### 5.5 Update local dev workflow
Replace `.env` loading with Doppler injection:
```bash
doppler run -- npm run start:dev
```

Document in `README.md`.

---

## Cost Comparison (Monthly Estimate at MVP Traffic ~1k MAU)

| Service | Before (Azure) | After (Fly + Neon + R2) | Saving |
|---|---|---|---|
| Compute | ~$30 (B1ms VM) | ~$2–5 (Fly shared-cpu-1x) | ~$25 |
| Postgres | ~$25 (Flexible Server B1ms) | $0 (Neon free) | ~$25 |
| Object storage + egress | ~$5 (Blob + egress) | ~$0–1 (R2, no egress) | ~$5 |
| Queue | ~$0 (in-memory) or QStash free | QStash free | $0 |
| **Total** | **~$60/mo** | **~$5–10/mo** | **~$50/mo** |

At 10k MAU the gap widens — R2's zero egress alone saves ~$50/mo at scale.

---

## Documentation Sync Checklist

Per `copilot-instructions.md`, update these files in the **same PR** as each migration step:

- [ ] `README.md` — Tech stack section
- [ ] `ARCHITECTURE.md` — Component diagram + provider list
- [ ] `.github/copilot-instructions.md` — Tech Stack, Env Variables sections
- [ ] `docs/guides/AZURE_DEPLOYMENT.md` — archive or rewrite as `FLY_DEPLOYMENT.md`
- [ ] `apps/api/.env.example` — new env vars

---

## Rollback Plan

Each step is independently reversible:

| Step | Rollback |
|---|---|
| Neon | Swap `DATABASE_URL`/`DIRECT_URL` back to Azure Postgres (kept running for 1 week post-cutover) |
| R2 | Set `STORAGE_DRIVER=azure-blob`, re-sync new files with `rclone` |
| Fly | Re-deploy Azure VM from snapshot (kept for 1 week post-cutover); flip DNS back |
| Foundry agents | Revert PR; agent code stays git-tracked |
| Doppler | Local `.env` files still work as fallback |

---

## Open Questions

1. **Domain & DNS:** Where is `api.yourdomain.com` currently pointing? Will affect Fly cutover plan.
2. **Resend / OAuth callback URLs:** Need updating when API hostname changes.
3. **Sentry environment names:** Add `production-fly` to distinguish post-migration errors.
4. **Backups:** Neon has point-in-time recovery on paid tiers. Decide on backup strategy before cutover.
