# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2024-01-XX

### ✨ Features

#### ATS Score Weighted Calculation

- **Weighted Score Algorithm**: Implemented category-based weighted scoring for ATS match analysis
  - Hard Skills (Technical): 40% weight
  - Soft Skills: 20% weight
  - Experience: 30% weight
  - Certificates/Education: 10% weight
- **Smart Normalization**: Score calculation considers only categories with actual keywords
- **Test Coverage**: Added comprehensive test suite (`weighted-score.spec.ts`) with 5 test scenarios
- **Documentation**: Updated `docs/ATS_OPTIMIZATION.md` with score calculation explanation
- **API Compatibility**: No breaking changes - `matchPercentage` now returns weighted score

### 🔧 Major Restructuring - npm Workspaces Monorepo

#### Added

- **Workspace Architecture**: Migrated to npm Workspaces with dedicated package.json files
  - `@smart-apply/api`: Backend workspace (67 dependencies)
  - `@smart-apply/web`: Frontend workspace (38 dependencies)
  - Root: Workspace orchestrator with shared DevDependencies

- **Workspace Commands** (run from root):
  - `npm run dev`: Start both API and Web in parallel (ports 3000 + 3001)
  - `npm run api:dev` / `npm run web:dev`: Start individual apps
  - `npm run api:build` / `npm run web:build`: Build individual apps
  - `npm run api:test`: Run backend tests
  - `npm run prisma:*`: Database commands (generate, migrate, seed, studio)

- **Documentation**:
  - `docs/guides/MONOREPO_WORKSPACE.md`: Comprehensive workspace guide
  - `docs/guides/MVP_EVALUATION.md`: MVP status assessment (92% complete)
  - `docs/README.md`: Documentation navigation hub
  - `apps/api/test/README.md`: Test suite organization guide

#### Changed

- **Dependency Optimization**:
  - Root `node_modules`: 1.2GB (shared TypeScript, ESLint, Jest, Prisma CLI)
  - `apps/api/node_modules`: 5.0MB (backend-specific: NestJS, Azure SDKs, Puppeteer, Playwright)
  - `apps/web/node_modules`: 3.8MB (frontend-specific: Next.js, React, Tailwind)
  - Total: ~95% reduction in workspace-specific dependencies

- **Test Organization**:
  - Restructured from flat `test/*.e2e-spec.ts` to organized folders:
    - `test/e2e/auth/`: Authentication tests (3 files)
    - `test/e2e/features/`: Feature tests (4 files)
    - `test/e2e/security/`: Security tests (6 files)
    - `test/unit/providers/`: Unit tests (1 file)
  - Updated `jest-e2e.json` with new testMatch patterns
  - All imports and fixture paths updated

- **Documentation Structure**:
  - Organized from flat `docs/*.md` to categorized folders:
    - `docs/security/`: 7 security-related docs
    - `docs/features/`: 5 feature documentation files
    - `docs/implementation/`: 5 implementation summaries
    - `docs/guides/`: 4 user guides
    - `docs/scripts/`: 1 utility script
    - `docs/archive/`: 4 historical documents

#### Improved

- **Development Experience**:
  - Faster IDE indexing with workspace-specific dependencies
  - Cleaner `node_modules` structure with workspace symlinks
  - Parallel execution of API and Web with `concurrently`
  - Cross-app imports enabled via workspace references

- **Deployment**:
  - Clear app boundaries for containerization
  - Separate Dockerfiles possible for API and Web
  - Reduced image sizes with workspace-specific dependencies

- **Testing**:
  - Better test organization with semantic folder structure
  - Easier navigation and maintenance
  - Clear separation of E2E, unit, and security tests

#### Technical Details

- **Workspace Symlinks**: Verified working

  ```text
  node_modules/@smart-apply/
  ├── api -> ../../apps/api
  └── web -> ../../apps/web
  ```

- **Prisma Configuration**: Updated paths to generate client to root `node_modules`
  - `output = "../../node_modules/@prisma/client"`

- **Package Names**:
  - Backend: `@smart-apply/api` (was part of root)
  - Frontend: `@smart-apply/web` (was `web`)

#### Migration Notes

To migrate an existing checkout:

```bash
# Clean old dependencies
rm -rf node_modules package-lock.json apps/*/node_modules

# Install with workspaces
npm install

# Verify workspace setup
npm ls --workspaces --depth=0

# Verify symlinks
ls -la node_modules/@smart-apply

# Test Prisma
npm run prisma:generate

# Start both apps
npm run dev
```

---

## Previous Changes

See Git history for changes prior to workspace migration.
