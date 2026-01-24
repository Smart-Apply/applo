# Dependency Update Plan (Issue #276)

> **Created:** 24. Januar 2026  
> **Completed:** 24. Januar 2026 ✅  
> **Final Status:** **0 vulnerabilities** 🎉  
> **Original Status:** 29 vulnerabilities (1 critical, 18 high, 5 moderate, 5 low)

---

## ✅ Completed Updates

### Environment
| Component | Before | After |
|-----------|--------|-------|
| **Node.js** | v20.9.0 | **v24.13.0** ✅ |
| **npm** | 10.1.0 | **11.6.2** ✅ |

### Security Fixes Applied
- ✅ **Critical:** Next.js 16.0.1 → 16.1.4 (RCE, Source Code Exposure)
- ✅ **High:** LangChain updated (serialization injection)
- ✅ **High:** Puppeteer 21.7.0 → 24.x (tar-fs, ws vulnerabilities)
- ✅ **High:** Argon2 0.31.2 → 0.44.0 (tar vulnerabilities)
- ✅ **High:** NestJS CLI 10.x → 11.x (glob, tmp vulnerabilities)
- ✅ **Moderate:** Various fixes via npm audit fix

### Breaking Changes Fixed
- ✅ NestJS 10.x → 11.x (all packages aligned)
- ✅ @nestjs/throttler v5 → v6 (new handleRequest signature)
- ✅ @nestjs/jwt 10.x → 11.x (expiresIn type changes)
- ✅ Puppeteer 21.x → 24.x (headless option changes)
- ✅ Zod 4.x → 3.23.x (hookform/resolvers compatibility)
- ✅ PDF.js worker path updated for react-pdf compatibility

---

## Stage 0: Pre-Update (Node.js) 🔴 HIGH PRIORITY

### Task: Update Node.js
```bash
# Option A: Use nvm
nvm install 20.19.0
nvm use 20.19.0

# Option B: Use Homebrew (macOS)
brew upgrade node@20

# Option C: Direct download
# https://nodejs.org/en/download/
```

**Why:** Many packages require Node.js ≥20.18.1. Update this FIRST.

---

## Stage 1: Low-Risk Updates ✅ SAFE

These updates are backward-compatible and low-risk.

### 1.1 Frontend (apps/web) - Already Done
- [x] `next`: 16.0.1 → 16.1.4 ✅ (Critical security fix)

### 1.2 Backend (apps/api) - Safe Updates
```bash
cd apps/api

# Update LangChain (security fixes)
npm install @langchain/core@latest langchain@latest

# Update minor versions
npm update
```

### 1.3 Root - Safe Updates
```bash
cd /path/to/smart-apply

# Update Turbo
npm install turbo@latest -D

# Run npm update for minor versions
npm update
```

---

## Stage 2: NestJS Ecosystem 🟡 MEDIUM RISK

### Current Versions
| Package | Current | Latest | Breaking Changes |
|---------|---------|--------|------------------|
| @nestjs/cli | 10.x | 11.x | Yes |
| @nestjs/swagger | 7.1.17 | 11.x | Yes |
| @nestjs/config | 3.1.1 | 4.x | Minor |
| @nestjs/common/core | 10.3.0 | 11.x | Yes |

### Update Commands
```bash
cd apps/api

# Step 1: Update NestJS core packages together
npm install @nestjs/common@^11 @nestjs/core@^11 @nestjs/platform-express@^11

# Step 2: Update related packages
npm install @nestjs/swagger@^11 @nestjs/config@^4 @nestjs/jwt@^11 \
  @nestjs/passport@^11 @nestjs/terminus@^11 @nestjs/throttler@^6 \
  @nestjs/schedule@^6 @nestjs/axios@^4 @nestjs/event-emitter@^4

# Step 3: Update CLI (devDependency in root)
cd ../..
npm install @nestjs/cli@^11 -D
```

### Migration Notes
1. **@nestjs/swagger 11.x:**
   - `js-yaml` and `lodash` vulnerabilities fixed
   - Check decorator changes in [migration guide](https://docs.nestjs.com/migration-guide)

2. **@nestjs/cli 11.x:**
   - Fixes `glob` and `tmp` vulnerabilities
   - New schematics format

### Verification
```bash
npm run build --workspace=apps/api
npm run test:e2e --workspace=apps/api
```

---

## Stage 3: Puppeteer 🟡 MEDIUM RISK

### Current vs Target
| Package | Current | Target | Fixes |
|---------|---------|--------|-------|
| puppeteer | 21.7.0 | 24.x | tar-fs, ws vulnerabilities |

### Update Commands
```bash
cd apps/api

# Update Puppeteer
npm install puppeteer@^24

# Update Playwright (alternative)
npm install playwright@latest
```

### Breaking Changes
1. **Launch options:** Some options renamed
2. **API changes:** Minor method signature changes
3. **Docker:** May need updated Chromium

### Files to Check
- [src/pdf/pdf.service.ts](../../apps/api/src/pdf/pdf.service.ts)
- [Dockerfile](../../infra/Dockerfile)

### Verification
```bash
# Test PDF generation
npm run test:integration --workspace=apps/api
```

---

## Stage 4: Argon2 🟠 HIGHER RISK

### Current vs Target
| Package | Current | Target | Fixes |
|---------|---------|--------|-------|
| argon2 | 0.31.2 | 0.44.0 | tar vulnerabilities |

### Update Command
```bash
cd apps/api
npm install argon2@^0.44
```

### Breaking Changes
1. **API may differ** - Check hash/verify signatures
2. **Native bindings** - May need rebuild

### Files to Check
- [src/auth/auth.service.ts](../../apps/api/src/auth/auth.service.ts)

### Verification
```bash
# Test authentication
npm run test:e2e --workspace=apps/api -- --grep "auth"
```

---

## Stage 5: TailwindCSS v4 🟠 OPTIONAL

### Current State
- TailwindCSS v4 via `@tailwindcss/postcss`
- Using PostCSS integration

### Evaluation Points
1. **Config format:** Changed from JS to CSS
2. **Color system:** New color palette
3. **Plugin API:** Breaking changes

### Decision
- [ ] Evaluate if migration is needed
- [ ] Current setup works, consider for post-MVP

---

## Bun vs Node.js Evaluation

### Compatibility Matrix for Smart Apply

| Component | Node.js | Bun | Notes |
|-----------|---------|-----|-------|
| NestJS 10.x | ✅ Full | ⚠️ Experimental | Some decorators may fail |
| NestJS 11.x | ✅ Full | ⚠️ Better | Improved, not official |
| Puppeteer | ✅ Full | ❌ Limited | Chrome launching issues |
| Playwright | ✅ Full | ⚠️ Partial | Better than Puppeteer |
| Prisma | ✅ Full | ✅ Works | Good support |
| Next.js 16 | ✅ Full | ⚠️ Experimental | Some SSR issues |
| argon2 | ✅ Full | ⚠️ Issues | Native binding problems |

### Recommendation

| Scenario | Recommendation |
|----------|----------------|
| **Production Runtime** | **Node.js** (stability) |
| **Package Installation** | **Bun** (3-4x faster) |
| **Development (Web)** | **Bun** (can try) |
| **Development (API)** | **Node.js** (Puppeteer needs it) |

### Hybrid Approach
```bash
# Use Bun for fast installs
bun install

# Use Node.js for running
npm run dev
```

---

## Execution Checklist

### Pre-Update
- [ ] Backup current `package-lock.json` files
- [ ] Create git branch: `chore/dependency-updates`
- [ ] Update Node.js to v20.19.0+

### Stage 1 (Safe)
- [x] Update Next.js to 16.1.4 ✅
- [ ] Update LangChain packages
- [ ] Run `npm update` in all workspaces

### Stage 2 (NestJS)
- [ ] Update NestJS core packages
- [ ] Update NestJS CLI
- [ ] Run full test suite
- [ ] Fix any breaking changes

### Stage 3 (Puppeteer)
- [ ] Update Puppeteer to v24
- [ ] Test PDF generation
- [ ] Update Dockerfile if needed

### Stage 4 (Argon2)
- [ ] Update argon2
- [ ] Test authentication flow
- [ ] Verify password hashing

### Post-Update
- [ ] Run `npm audit` - target: 0 vulnerabilities
- [ ] Run full E2E test suite
- [ ] Test production build
- [ ] Update documentation

---

## Remaining Vulnerabilities

**✅ NONE - All vulnerabilities resolved!**

### Solution Applied
- Added `overrides` in root `package.json` to force `lodash@4.17.23`
- Used `npm install --legacy-peer-deps` to resolve Tiptap peer dependency conflicts

---

## Updated Package Versions

### Backend (apps/api)
| Package | Before | After |
|---------|--------|-------|
| @nestjs/common | 10.3.0 | 11.x |
| @nestjs/core | 10.3.0 | 11.x |
| @nestjs/platform-express | 10.3.0 | 11.x |
| @nestjs/swagger | 7.1.17 | 11.x |
| @nestjs/config | 3.1.1 | 4.x |
| @nestjs/jwt | 10.2.0 | 11.x |
| @nestjs/passport | 10.0.3 | 11.x |
| @nestjs/terminus | 10.2.0 | 11.x |
| @nestjs/throttler | 5.1.1 | 6.x |
| @nestjs/cli | 10.x | 11.x |
| puppeteer | 21.7.0 | 24.x |
| argon2 | 0.31.2 | 0.44.x |
| @langchain/core | 1.0.3 | latest |
| langchain | 1.0.3 | latest |

### Frontend (apps/web)
| Package | Before | After |
|---------|--------|-------|
| next | 16.0.1 | 16.1.4 |
| zod | 4.1.12 | 3.23.x |

---

## Timeline Estimate

| Stage | Effort | Risk |
|-------|--------|------|
| Stage 0 (Node.js) | 15 min | Low |
| Stage 1 (Safe) | 30 min | Low |
| Stage 2 (NestJS) | 2-4 hours | Medium |
| Stage 3 (Puppeteer) | 1-2 hours | Medium |
| Stage 4 (Argon2) | 30 min | Medium |

**Total:** ~5-8 hours

---

## References

- [NestJS Migration Guide](https://docs.nestjs.com/migration-guide)
- [Puppeteer Changelog](https://github.com/puppeteer/puppeteer/releases)
- [Next.js Changelog](https://github.com/vercel/next.js/releases)
- [Bun Compatibility](https://bun.sh/docs/runtime/nodejs-apis)
