# Smart Apply - GitHub Copilot Agent Instructions

## 🎯 Projekt-Kontext

**Smart Apply** ist eine MVP-Anwendung, die KI-gestützte Bewerbungsunterlagen (Anschreiben + Lebenslauf) generiert. Das Backend ist eine NestJS REST API mit Azure-Integration, die Kandidatenprofile verwaltet, Stellenanzeigen parst und über Azure OpenAI maßgeschneiderte PDFs erstellt.

### Tech Stack
- **Framework:** NestJS v10 (TypeScript)
- **Database:** PostgreSQL (Prisma ORM)
- **Authentication:** JWT + argon2
- **Cloud:** Azure (Container Apps, PostgreSQL Flexible Server, Blob Storage, Service Bus, OpenAI)
- **PDF Generation:** Puppeteer/Chromium
- **Testing:** Jest + supertest (E2E)
- **Documentation:** Swagger/OpenAPI

---

## 🏗️ Architektur-Prinzipien

### Module-First Design
Jedes Feature ist ein eigenständiges NestJS-Modul mit:
- **Controller** → REST Endpoints (JWT-geschützt, außer `/auth` mit `@Public()`)
- **Service** → Business Logic
- **DTOs** → Validation (class-validator)
- **Module** → Dependency Injection Setup

### Provider Abstraction
Multi-Provider-Architektur für verschiedene Umgebungen:

1. **StorageService** (`src/storage/`)
   - `DiskStorageProvider` (dev/local)
   - `AzureBlobStorageProvider` (prod)
   - Konfiguration via `STORAGE_DRIVER` env var

2. **LLMService** (`src/llm/`)
   - `MockLLMProvider` (dev/testing)
   - `AzureOpenAIProvider` (prod)
   - Konfiguration via `LLM_PROVIDER` env var

3. **JobsService** (TODO: `src/jobs/`)
   - `InMemoryQueueProvider` (dev)
   - `AzureServiceBusProvider` (prod)
   - Konfiguration via `JOBS_DRIVER` env var

**Wichtig:** Alle Provider implementieren ein gemeinsames Interface. Neue Provider sollten das gleiche Pattern befolgen.

### Database-First Workflow
```bash
# Schema ändern
vi apps/api/prisma/schema.prisma

# Migration erstellen + anwenden
npm run prisma:migrate

# Prisma Client generieren
npm run prisma:generate

# Optional: Seed-Daten
npm run prisma:seed
```

### Environment Configuration
- **Local Dev:** `.env` Datei (dotenv wird via `node -r dotenv/config` preloaded)
- **Production:** Azure Key Vault + Container Apps Secrets
- **Validation:** Zod Schema in `src/config/env.schema.ts`

---

## 📁 Projekt-Struktur

```
smart-apply/
├── apps/api/
│   ├── src/
│   │   ├── main.ts                  # Entry Point (Port 3000, Swagger /docs)
│   │   ├── app.module.ts            # Root Module
│   │   │
│   │   ├── config/                  # ✅ Globale Config (Zod)
│   │   ├── common/                  # ✅ Guards, Decorators, Filters
│   │   ├── prisma/                  # ✅ DB Service (Global)
│   │   │
│   │   ├── auth/                    # ✅ JWT Auth (Register, Login, /me)
│   │   ├── profile/                 # ✅ User Profile CRUD
│   │   ├── storage/                 # ✅ Storage Abstraction
│   │   ├── llm/                     # ✅ LLM Abstraction
│   │   │
│   │   ├── uploads/                 # ⏳ File Upload (PDF/DOCX)
│   │   ├── job-postings/            # ⏳ Stellenanzeigen-Parser
│   │   ├── pdf/                     # ⏳ Puppeteer PDF Service
│   │   ├── jobs/                    # ⏳ Queue Abstraction (Service Bus)
│   │   ├── applications/            # ⏳ Haupt-Pipeline
│   │   └── health/                  # ⏳ Health Checks (Terminus)
│   │
│   ├── prisma/
│   │   ├── schema.prisma            # Database Schema
│   │   ├── migrations/              # Prisma Migrations
│   │   └── seed.ts                  # Demo-Daten (demo@smartapply.com)
│   │
│   └── test/
│       ├── profile.e2e-spec.ts      # ✅ Profile E2E (hat Guard-Issues)
│       └── ...                      # ⏳ Weitere E2E Tests
│
├── prompts/                         # ⏳ LLM Template Files
│   ├── cover-letter.md              # Cover Letter Prompt
│   └── resume.md                    # Resume Prompt
│
├── .github/
│   └── copilot-instructions.md      # Allgemeine Copilot Instructions
│
├── ARCHITECTURE.md                  # Vollständige Architektur-Docs
├── my-agents.md                     # ← Diese Datei
├── docker-compose.yml               # Local PostgreSQL Setup
├── .env                             # Environment Variables (nicht in Git!)
└── package.json                     # Dependencies + Scripts
```

---

## 📋 Aktuelle TODOs (Priorität)

### 1. ⏳ **UploadsModule** (GitHub Issue #2)
**Ziel:** File Upload für Resumes/Certificates mit Validierung.

**Anforderungen:**
- `POST /api/v1/uploads` (JWT-geschützt)
- Multipart/Form-Data (PDF/DOCX, max 5 MB)
- Storage via `StorageService` (funktioniert mit beiden Providern)
- Response: Upload-Metadaten mit Storage Key

**Abhängigkeiten:**
- `StorageModule` (✅ bereits implementiert)
- `@nestjs/platform-express` + `multer` (✅ bereits installiert)

**Deliverables:**
- `uploads.controller.ts`, `uploads.service.ts`, `uploads.module.ts`
- DTOs: `UploadResponseDto`
- E2E Test: `test/uploads.e2e-spec.ts`

---

### 2. ⏳ **JobPostingsModule**
**Ziel:** Stellenanzeigen aus Text/URL/File parsen → normalisiert in DB.

**Anforderungen:**
- `POST /api/v1/job-postings:parse` (JWT-geschützt)
- Input: `{ text?, url?, fileId? }`
- Parser für:
  - Plain Text (direkt)
  - URL (HTML via `cheerio`)
  - PDF (via `pdf-parse`)
  - DOCX (via `mammoth`)
- Erstellt `JobPosting` Entity mit:
  - `title`, `company`, `location`, `description`
  - Arrays: `requirements[]`, `responsibilities[]`, `niceToHave[]`

**Dependencies (installieren):**
```bash
npm install cheerio pdf-parse mammoth
npm install -D @types/pdf-parse
```

**Deliverables:**
- `job-postings.controller.ts`, `job-postings.service.ts`, `job-postings.module.ts`
- DTOs: `ParseJobPostingDto`, `JobPostingResponseDto`
- Parser: `src/job-postings/parsers/` (text, url, pdf, docx)
- E2E Test: `test/job-postings.e2e-spec.ts`

---

### 3. ⏳ **PDFModule**
**Ziel:** HTML → PDF Rendering mit Puppeteer.

**Anforderungen:**
- `PDFService.generatePDF(html: string): Promise<Buffer>`
- Puppeteer mit Chromium (headless)
- CSS Styling für professionelle PDFs
- Template-Support (Cover Letter + Resume haben unterschiedliche Layouts)

**Dependencies (installieren):**
```bash
npm install puppeteer
```

**Docker:** Chromium in Container-Image (`Dockerfile` anpassen):
```dockerfile
RUN apt-get update && apt-get install -y chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

**Deliverables:**
- `pdf.service.ts`, `pdf.module.ts`
- Unit Tests: Mock HTML → Buffer
- Integration Test: Echtes PDF generieren + validieren

---

### 4. ⏳ **JobsModule**
**Ziel:** Queue Abstraction für Background Jobs (Application Pipeline).

**Anforderungen:**
- `JobsService` mit Producer/Consumer Pattern
- `InMemoryQueueProvider` (dev) → Array-basiert, setTimeout
- `AzureServiceBusProvider` (prod) → `@azure/service-bus`
- Job Types: `APPLICATION_GENERATE` (später erweiterbar)

**Deliverables:**
- `jobs.service.ts`, `jobs.module.ts`
- `providers/in-memory-queue.provider.ts`, `providers/azure-service-bus.provider.ts`
- `processors/application.processor.ts` (enthält Pipeline-Logik)
- Unit Tests: Mock Queue Operations

---

### 5. ⏳ **ApplicationsModule** (Haupt-Pipeline)
**Ziel:** Orchestriert gesamten Generierungs-Workflow.

**Anforderungen:**
- `POST /api/v1/applications` → Erstellt Application (status: PENDING), published Job
- `GET /api/v1/applications/:id` → Aktueller Status + Metadaten
- `GET /api/v1/applications/:id/files` → SAS URLs für PDFs

**Pipeline (im Job Processor):**
1. Load Profile + JobPosting (Prisma)
2. Render Prompts (`prompts/cover-letter.md`, `prompts/resume.md`) mit Kontext
3. Call `LLMService.generate()` → Markdown/HTML
4. Call `PDFService.generatePDF()` → Buffer
5. Upload PDFs via `StorageService` → Storage Keys
6. Update Application: `status = READY`, `coverLetterFileKey`, `resumeFileKey`
7. Bei Fehler: `status = FAILED`, `errorMessage`

**Deliverables:**
- `applications.controller.ts`, `applications.service.ts`, `applications.module.ts`
- DTOs: `CreateApplicationDto`, `ApplicationResponseDto`, `ApplicationFilesDto`
- Processor: `src/jobs/processors/application.processor.ts` (Pipeline-Logik)
- E2E Test: `test/applications.e2e-spec.ts` (mit Mock LLM + In-Memory Queue)

---

### 6. ⏳ **HealthModule**
**Ziel:** Health Checks für Container Apps Probes.

**Anforderungen:**
- `GET /api/v1/health` (Public, kein JWT)
- Checks:
  - Database (Prisma Ping)
  - Storage (Provider `healthCheck()`)
  - LLM (Provider `healthCheck()`)
- Response: `{ status: "ok" | "error", info: {...} }`

**Dependencies:**
```bash
npm install @nestjs/terminus
```

**Deliverables:**
- `health.controller.ts`, `health.module.ts`
- Custom Health Indicators: `StorageHealthIndicator`, `LLMHealthIndicator`
- E2E Test: Verify Health Endpoint

---

### 7. ⏳ **E2E Tests vervollständigen**
**Ziel:** Komplette Test-Suite für alle Module.

**Anforderungen:**
- Profile CRUD (✅ vorhanden, aber Guard-Issues fixen)
- Upload Flow (Datei hochladen → Metadaten validieren)
- JobPosting Parsing (Text/URL/File → validiere Extraktion)
- Application Pipeline End-to-End:
  - Mock LLM Provider
  - In-Memory Queue
  - Validiere PDFs werden erstellt + gespeichert
  - Validiere Status-Transitions (PENDING → GENERATING → READY)

**Deliverables:**
- `test/uploads.e2e-spec.ts`
- `test/job-postings.e2e-spec.ts`
- `test/applications.e2e-spec.ts`
- Fixtures: `test/fixtures/` (Sample PDFs, DOCX, HTML)

---

## 🔐 Security Best Practices

### Authentication & Authorization
- **Alle Endpoints** sind JWT-geschützt (außer `/auth/*` und `/health`)
- `@Public()` Decorator explizit setzen für offene Endpoints
- Nutze `@CurrentUser()` Decorator für User-Context in Controllers

### Input Validation
- **Immer** DTOs mit class-validator verwenden
- File Uploads: MIME-Type + Extension + Größe validieren
- SQL Injection: Prisma schützt automatisch (Prepared Statements)

### Secrets Management
- **Nie** Secrets in Code committen
- Local: `.env` (in `.gitignore`)
- Prod: Azure Key Vault (via `DefaultAzureCredential`)

### Rate Limiting
- `@nestjs/throttler` bereits konfiguriert (global)
- Kritische Endpoints: Custom Throttler Guards

---

## 🧪 Testing Guidelines

### Unit Tests
```bash
npm test -- profile.service.spec.ts
```
- Mocke externe Dependencies (Prisma, Storage, LLM)
- Teste Business Logic isoliert

### E2E Tests
```bash
npm run test:e2e
```
- Nutze In-Memory Providers (Mock LLM, Disk Storage, In-Memory Queue)
- Erstelle Test-DB (separate DATABASE_URL in `.env.test`)
- Nach jedem Test: Cleanup (Prisma `deleteMany`)

### Lokaler Test-Workflow
```bash
# 1. Start DB
docker compose up -d

# 2. Run Migrations
npm run prisma:migrate

# 3. Seed Data
npm run prisma:seed

# 4. Start Dev Server
npm run start:dev

# 5. Öffne Swagger
open http://localhost:3000/docs

# 6. Teste Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@smartapply.com","password":"Demo123!"}'
```

---

## 🎨 Code Style & Conventions

### Naming Conventions
- **Files:** `kebab-case` (e.g., `profile.service.ts`)
- **Classes:** `PascalCase` (e.g., `ProfileService`)
- **Interfaces:** `PascalCase` mit `I` Prefix optional (e.g., `IStorageProvider`)
- **DTOs:** `PascalCase` mit Suffix (e.g., `UpdateProfileDto`)
- **Endpoints:** `kebab-case` (e.g., `/job-postings:parse`)

### Module Structure Template
```typescript
// my-feature.module.ts
import { Module } from '@nestjs/common';
import { MyFeatureController } from './my-feature.controller';
import { MyFeatureService } from './my-feature.service';

@Module({
  controllers: [MyFeatureController],
  providers: [MyFeatureService],
  exports: [MyFeatureService], // Falls andere Module nutzen
})
export class MyFeatureModule {}
```

### Controller Template
```typescript
import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('my-feature')
@Controller('my-feature')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MyFeatureController {
  constructor(private readonly myFeatureService: MyFeatureService) {}

  @Get()
  async getAll(@Request() req) {
    return this.myFeatureService.findAll(req.user.userId);
  }
}
```

### Service Template
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MyFeatureService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.myModel.findMany({ where: { userId } });
  }
}
```

---

## 🚀 Deployment Workflow (Post-MVP)

### Local Development
```bash
docker compose up -d
npm run start:dev
```

### Azure Production
1. **Build Docker Image**
   ```bash
   docker build -t smartapply-api .
   docker tag smartapply-api myacr.azurecr.io/smartapply-api:latest
   docker push myacr.azurecr.io/smartapply-api:latest
   ```

2. **Deploy zu Azure Container Apps**
   - Image: `myacr.azurecr.io/smartapply-api:latest`
   - Secrets: Key Vault Referenzen
   - Health Probe: `GET /api/v1/health`
   - Auto-Scale: Min 1, Max 5 Replicas

3. **Post-Deploy**
   - Run Migrations (Init Container oder Job)
   - Verify Health Endpoint
   - Test JWT Login → Profile Endpoints

---

## 🐛 Bekannte Issues

### 1. Profile E2E Tests - Guard Issues
**Problem:** Tests returnen `403 Forbidden` statt `200 OK` oder `401 Unauthorized`.

**Ursache:** Test-Setup hat ThrottlerGuard oder JWT-Konfigurationsproblem.

**Workaround:** Business Logic ist korrekt (manuell via Swagger getestet). Test-Environment muss Guards anders konfigurieren.

**TODO:** E2E Test Setup fixen (separate App-Instance mit `overrideGuard`).

---

## 💡 Agent-Verhalten: Wichtige Regeln

### Wenn du Code generierst:
1. **Immer** DTOs mit Validation Decorators erstellen
2. **Immer** Swagger Decorators (`@ApiTags`, `@ApiBearerAuth`) verwenden
3. **Immer** Error Handling (try/catch + aussagekräftige Exceptions)
4. **Immer** TypeScript strict mode beachten (keine `any` ohne Grund)
5. **Provider Pattern** befolgen (siehe Storage/LLM als Referenz)

### Wenn du Tests schreibst:
1. **Unit Tests:** Mocke alle Dependencies (Prisma, External Services)
2. **E2E Tests:** Nutze In-Memory Providers (kein echtes Azure)
3. **Fixtures:** Erstelle Sample-Daten in `test/fixtures/`
4. **Cleanup:** Nach jedem E2E Test DB leeren

### Wenn du Migrations erstellst:
1. **Immer** `npm run prisma:migrate` laufen lassen
2. **Immer** seed.ts anpassen falls Schema-Changes
3. **Nie** manuelle SQL-Edits (nur via Prisma Schema)

### Wenn du Modules hinzufügst:
1. **Immer** in `app.module.ts` importieren
2. **Immer** Dependencies deklarieren (imports in Module)
3. **Immer** E2E Test erstellen
4. **Immer** Swagger Docs generieren

### Wenn du Azure-spezifische Sachen machst:
1. **Immer** lokale Fallback-Provider implementieren (dev)
2. **Nie** Azure-Credentials hardcoden
3. **Immer** Environment Variable nutzen (`STORAGE_DRIVER`, `LLM_PROVIDER`)

---

## 📚 Wichtige Commands

```bash
# Development
npm run start:dev              # Dev Server mit Watch Mode
npm run prisma:studio          # Prisma DB UI

# Database
npm run prisma:migrate         # Create + Apply Migration
npm run prisma:generate        # Generate Prisma Client
npm run prisma:seed            # Seed Demo Data

# Testing
npm test                       # Unit Tests
npm run test:e2e               # E2E Tests
npm run test:cov               # Coverage Report

# Linting & Formatting
npm run lint                   # ESLint
npm run format                 # Prettier

# Production
npm run build                  # Build für Prod
npm run start:prod             # Start Production Server
```

---

## 📖 Referenz-Dateien

Wenn du unsicher bist, schau in diese Dateien:
- **Architektur:** `ARCHITECTURE.md`
- **Copilot Instructions:** `.github/copilot-instructions.md`
- **Prisma Schema:** `apps/api/prisma/schema.prisma`
- **Environment Schema:** `apps/api/src/config/env.schema.ts`
- **Auth Example:** `apps/api/src/auth/` (vollständig implementiert)
- **Profile Example:** `apps/api/src/profile/` (vollständig implementiert)
- **Storage Example:** `apps/api/src/storage/` (Provider Pattern Referenz)
- **LLM Example:** `apps/api/src/llm/` (Provider Pattern Referenz)

---

## ✅ Success Criteria für TODOs

Ein TODO gilt als **abgeschlossen**, wenn:
- [ ] Controller, Service, Module implementiert
- [ ] DTOs mit Validation erstellt
- [ ] Swagger Dokumentation generiert
- [ ] Unit Tests vorhanden (mind. 80% Coverage)
- [ ] E2E Test vorhanden (Happy Path + Error Cases)
- [ ] Dev Server startet ohne Fehler (`npm run start:dev`)
- [ ] Swagger UI zeigt neue Endpoints (`http://localhost:3000/docs`)
- [ ] Manueller Test via Swagger erfolgreich

---

## 🎯 Next Steps (nach MVP)

1. **SSE/Webhooks** für Application Status Updates
2. **Multi-Tenant** Support (Organizations/Workspaces)
3. **Version History** für Applications (Edit-Flow)
4. **Managed Identity** statt Connection Strings
5. **Prometheus/Grafana** Monitoring
6. **ATS Export** (JSON Format für Applicant Tracking Systems)

---

**Viel Erfolg beim Coden! 🚀**

Bei Fragen: Referenziere diese Datei, `ARCHITECTURE.md` und existierenden Code in `src/profile/` oder `src/storage/`.
